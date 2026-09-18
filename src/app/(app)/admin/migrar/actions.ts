"use server";

import sharp from "sharp";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { propiedades } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";

export type PasoMigracion = {
  paso: string;
  ok: boolean;
  detalle: string;
};

async function requerirTeamLeader() {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion.rol)) {
    throw new Error("No autorizado.");
  }
}

async function paso(
  resultados: PasoMigracion[],
  nombre: string,
  fn: () => Promise<unknown>
) {
  try {
    const r: any = await fn();
    const filas =
      r && typeof r === "object" && "length" in r ? (r as any).length : null;
    resultados.push({
      paso: nombre,
      ok: true,
      detalle: filas !== null ? `${filas} fila(s) afectada(s).` : "OK.",
    });
  } catch (e) {
    resultados.push({
      paso: nombre,
      ok: false,
      detalle: e instanceof Error ? e.message : String(e),
    });
  }
}

export async function ejecutarMigracion(): Promise<PasoMigracion[]> {
  await requerirTeamLeader();
  const resultados: PasoMigracion[] = [];

  // 1. Nuevos valores del enum estado_propiedad (cada uno en su propia
  // sentencia/transacción implícita, porque Postgres no permite usar un
  // valor de enum recién agregado dentro de la misma transacción que lo crea).
  await paso(resultados, "Agregar estado VENDIDA", () =>
    db.execute(sql`ALTER TYPE estado_propiedad ADD VALUE IF NOT EXISTS 'VENDIDA'`)
  );
  await paso(resultados, "Agregar estado ALQUILADA", () =>
    db.execute(sql`ALTER TYPE estado_propiedad ADD VALUE IF NOT EXISTS 'ALQUILADA'`)
  );
  await paso(resultados, "Agregar estado RESERVADA", () =>
    db.execute(sql`ALTER TYPE estado_propiedad ADD VALUE IF NOT EXISTS 'RESERVADA'`)
  );

  // 2. Columna de fotos.
  await paso(resultados, "Agregar columna fotos", () =>
    db.execute(
      sql`ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS fotos jsonb NOT NULL DEFAULT '[]'`
    )
  );

  // 3. Corregir estados de propiedades que tienen la etiqueta vieja
  // entre corchetes en el título (ej: "Casa en Palermo [CERRADA]").
  await paso(
    resultados,
    "Corregir estado -> CERRADA (por título [CERRADA])",
    () =>
      db.execute(
        sql`UPDATE propiedades SET estado = 'CERRADA' WHERE titulo ILIKE '%[CERRADA]%' AND estado != 'CERRADA'`
      )
  );
  await paso(
    resultados,
    "Corregir estado -> CERRADA (por título [VENDIDA POR OTRA INMOBILIARIA])",
    () =>
      db.execute(
        sql`UPDATE propiedades SET estado = 'CERRADA' WHERE titulo ILIKE '%[VENDIDA POR OTRA INMOBILIARIA]%' AND estado != 'CERRADA'`
      )
  );
  await paso(
    resultados,
    "Corregir estado -> CERRADA (por título [ALQUILADA POR OTRA INMOBILIARIA])",
    () =>
      db.execute(
        sql`UPDATE propiedades SET estado = 'CERRADA' WHERE titulo ILIKE '%[ALQUILADA POR OTRA INMOBILIARIA]%' AND estado != 'CERRADA'`
      )
  );
  // Ya no distinguimos "vendida/alquilada por otra inmobiliaria": si la
  // operación la cerró otra persona o empresa, la propiedad simplemente
  // pasa a Cerrada. Esto reasigna las propiedades que habían quedado en
  // esos estados viejos (de una versión anterior de esta migración).
  await paso(
    resultados,
    "Migrar estados 'por otra inmobiliaria' -> CERRADA",
    () =>
      db.execute(
        sql`UPDATE propiedades SET estado = 'CERRADA' WHERE estado::text IN ('VENDIDA_OTRA_INMOBILIARIA', 'ALQUILADA_OTRA_INMOBILIARIA')`
      )
  );
  await paso(resultados, "Corregir estado -> VENDIDA (por título [VENDIDA])", () =>
    db.execute(
      sql`UPDATE propiedades SET estado = 'VENDIDA' WHERE titulo ILIKE '%[VENDIDA]%' AND titulo NOT ILIKE '%OTRA INMOBILIARIA%' AND estado != 'VENDIDA'`
    )
  );
  await paso(
    resultados,
    "Corregir estado -> ALQUILADA (por título [ALQUILADA])",
    () =>
      db.execute(
        sql`UPDATE propiedades SET estado = 'ALQUILADA' WHERE titulo ILIKE '%[ALQUILADA]%' AND titulo NOT ILIKE '%OTRA INMOBILIARIA%' AND estado != 'ALQUILADA'`
      )
  );

  // 4. Columnas nuevas de contactos: categoría y origen del contacto.
  await paso(resultados, "Agregar columna categoria en contactos", () =>
    db.execute(
      sql`ALTER TABLE contactos ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'OTRO'`
    )
  );
  await paso(resultados, "Agregar columna origen en contactos", () =>
    db.execute(
      sql`ALTER TABLE contactos ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'OTRO'`
    )
  );
  await paso(resultados, "Agregar columna origen_detalle en contactos", () =>
    db.execute(
      sql`ALTER TABLE contactos ADD COLUMN IF NOT EXISTS origen_detalle text`
    )
  );

  // 5. Columnas nuevas de búsquedas: moneda del rango de precio y notas libres.
  await paso(resultados, "Agregar columna moneda en busquedas", () =>
    db.execute(
      sql`ALTER TABLE busquedas ADD COLUMN IF NOT EXISTS moneda text NOT NULL DEFAULT 'USD'`
    )
  );
  await paso(resultados, "Agregar columna notas en busquedas", () =>
    db.execute(
      sql`ALTER TABLE busquedas ADD COLUMN IF NOT EXISTS notas text`
    )
  );

  // 6. Modulo de Captaciones (Kanban Llamando -> Tasando -> Para publicar).
  await paso(resultados, "Crear enum estado_captacion", () =>
    db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE estado_captacion AS ENUM ('LLAMANDO', 'TASANDO', 'PARA_PUBLICAR');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `)
  );
  await paso(resultados, "Crear tabla captaciones", () =>
    db.execute(sql`
      CREATE TABLE IF NOT EXISTS captaciones (
        id text PRIMARY KEY,
        titulo text NOT NULL,
        contacto_id text NOT NULL REFERENCES contactos(id),
        agente_id text NOT NULL REFERENCES usuarios(id),
        operacion operacion NOT NULL,
        tipo text NOT NULL,
        zona text,
        direccion text,
        origen text NOT NULL DEFAULT 'OTRO',
        origen_detalle text,
        notas text,
        estado estado_captacion NOT NULL DEFAULT 'LLAMANDO',
        convertida_en_propiedad_id text REFERENCES propiedades(id),
        creado_en timestamp NOT NULL DEFAULT now()
      )
    `)
  );

  // 7. Modulo de Pipeline (cadencia 14 semanas venta / 7 semanas alquiler).
  await paso(
    resultados,
    "Agregar columna fecha_inicio_pipeline en propiedades",
    () =>
      db.execute(
        sql`ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS fecha_inicio_pipeline timestamp NOT NULL DEFAULT now()`
      )
  );
  await paso(
    resultados,
    "Backfill fecha_inicio_pipeline = creado_en para propiedades existentes",
    () =>
      db.execute(
        sql`UPDATE propiedades SET fecha_inicio_pipeline = creado_en WHERE fecha_inicio_pipeline = creado_en OR fecha_inicio_pipeline > creado_en`
      )
  );
  await paso(resultados, "Crear enum categoria_pipeline", () =>
    db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE categoria_pipeline AS ENUM ('SEGUIMIENTO_DUENO', 'MARKETING', 'VENTAS_NEGOCIACION', 'REPORTE');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `)
  );
  await paso(resultados, "Crear tabla historial_precios", () =>
    db.execute(sql`
      CREATE TABLE IF NOT EXISTS historial_precios (
        id text PRIMARY KEY,
        propiedad_id text NOT NULL REFERENCES propiedades(id),
        precio_anterior integer,
        moneda_anterior text,
        precio_nuevo integer NOT NULL,
        moneda_nueva text NOT NULL,
        agente_id text NOT NULL REFERENCES usuarios(id),
        creado_en timestamp NOT NULL DEFAULT now()
      )
    `)
  );
  await paso(resultados, "Crear tabla pipeline_acciones", () =>
    db.execute(sql`
      CREATE TABLE IF NOT EXISTS pipeline_acciones (
        id text PRIMARY KEY,
        propiedad_id text NOT NULL REFERENCES propiedades(id),
        agente_id text NOT NULL REFERENCES usuarios(id),
        categoria categoria_pipeline NOT NULL,
        semana integer NOT NULL,
        descripcion text NOT NULL,
        nota text,
        creado_en timestamp NOT NULL DEFAULT now()
      )
    `)
  );

  // 8. Modulo de Agenda de visitas.
  await paso(resultados, "Crear enum estado_visita", () =>
    db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE estado_visita AS ENUM ('PROGRAMADA', 'REALIZADA', 'CANCELADA', 'NO_SE_PRESENTO');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `)
  );
  await paso(resultados, "Crear tabla visitas", () =>
    db.execute(sql`
      CREATE TABLE IF NOT EXISTS visitas (
        id text PRIMARY KEY,
        propiedad_id text NOT NULL REFERENCES propiedades(id),
        contacto_id text NOT NULL REFERENCES contactos(id),
        agente_id text NOT NULL REFERENCES usuarios(id),
        fecha timestamp NOT NULL,
        estado estado_visita NOT NULL DEFAULT 'PROGRAMADA',
        notas text,
        resultado text,
        creado_en timestamp NOT NULL DEFAULT now()
      )
    `)
  );

  // 9. Modulo de Motor de coincidencias (registro de avisos ya enviados;
  // el match en sí se calcula al vuelo, no se guarda).
  await paso(resultados, "Crear tabla coincidencias_avisadas", () =>
    db.execute(sql`
      CREATE TABLE IF NOT EXISTS coincidencias_avisadas (
        id text PRIMARY KEY,
        busqueda_id text NOT NULL REFERENCES busquedas(id),
        propiedad_id text NOT NULL REFERENCES propiedades(id),
        agente_id text NOT NULL REFERENCES usuarios(id),
        nota text,
        creado_en timestamp NOT NULL DEFAULT now()
      )
    `)
  );

  // 10. Registro de portales donde está publicada cada propiedad.
  await paso(resultados, "Crear tabla portales_publicados", () =>
    db.execute(sql`
      CREATE TABLE IF NOT EXISTS portales_publicados (
        id text PRIMARY KEY,
        propiedad_id text NOT NULL REFERENCES propiedades(id),
        portal text NOT NULL,
        url text NOT NULL,
        agente_id text NOT NULL REFERENCES usuarios(id),
        creado_en timestamp NOT NULL DEFAULT now()
      )
    `)
  );

  // 11. Perfil de usuarios: presentación profesional + aprobación para
  // las cuentas que se crean solas desde /registro.
  await paso(resultados, "Agregar descripcion y aprobado a usuarios", () =>
    db.execute(sql`
      ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS descripcion text,
        ADD COLUMN IF NOT EXISTS aprobado boolean NOT NULL DEFAULT true
    `)
  );

  // 12. Configuración de la cuenta a nivel inmobiliaria (nombre del CRM,
  // datos de la empresa, marca, logo, sistema de comisiones). Tabla
  // singleton: se crea vacía con una única fila si todavía no existe.
  await paso(resultados, "Crear tabla configuracion_empresa", () =>
    db.execute(sql`
      CREATE TABLE IF NOT EXISTS configuracion_empresa (
        id text PRIMARY KEY,
        nombre_crm text NOT NULL DEFAULT 'Orion',
        nombre_empresa text,
        filosofia text,
        color_primario text,
        color_secundario text,
        logo text,
        sistema_comisiones text,
        telefono_empresa text,
        email_empresa text,
        direccion text,
        actualizado_en timestamp NOT NULL DEFAULT now(),
        actualizado_por_id text REFERENCES usuarios(id)
      )
    `)
  );
  await paso(
    resultados,
    "Sembrar fila singleton de configuracion_empresa",
    () =>
      db.execute(sql`
        INSERT INTO configuracion_empresa (id, nombre_crm)
        SELECT 'default', 'Orion'
        WHERE NOT EXISTS (SELECT 1 FROM configuracion_empresa)
      `)
  );

  // 13. Estado Activo/Inactivo por usuario (para desactivar sin borrar).
  await paso(resultados, "Agregar columna activo a usuarios", () =>
    db.execute(sql`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true
    `)
  );

  return resultados;
}

export async function listarTitulosConCorchetes(): Promise<
  { titulo: string; estado: string }[]
> {
  await requerirTeamLeader();
  const r = await db.execute<{ titulo: string; estado: string }>(
    sql`SELECT titulo, estado::text as estado FROM propiedades WHERE titulo LIKE '%[%' ORDER BY titulo`
  );
  return r as unknown as { titulo: string; estado: string }[];
}

export type DiagnosticoFotos = {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  cantidad: number | null;
  kb: number;
};

/**
 * Muestra el peso real (en la base de datos) del campo fotos de cada
 * propiedad, ordenado de mayor a menor. Sirve para encontrar una fila con
 * datos corruptos o desmedidos (por ejemplo, un problema de carga que dejó
 * el campo con un tamaño anormal) sin tener que acceder a la base
 * directamente.
 */
export async function diagnosticarFotos(): Promise<DiagnosticoFotos[]> {
  await requerirTeamLeader();
  const r = await db.execute<{
    id: string;
    codigo: string;
    titulo: string;
    tipo: string;
    cantidad: number | null;
    bytes: number;
  }>(sql`
    SELECT
      id,
      codigo,
      titulo,
      jsonb_typeof(fotos) as tipo,
      CASE WHEN jsonb_typeof(fotos) = 'array' THEN jsonb_array_length(fotos) ELSE NULL END as cantidad,
      pg_column_size(fotos) as bytes
    FROM propiedades
    ORDER BY pg_column_size(fotos) DESC
    LIMIT 30
  `);
  const filas = r as unknown as {
    id: string;
    codigo: string;
    titulo: string;
    tipo: string;
    cantidad: number | null;
    bytes: number;
  }[];
  return filas.map((f) => ({
    id: f.id,
    codigo: f.codigo,
    titulo: f.titulo,
    tipo: f.tipo,
    cantidad: f.cantidad,
    kb: Math.round((f.bytes / 1024) * 10) / 10,
  }));
}

/** Vacía por completo el campo fotos de una propiedad puntual (recuperación de emergencia). */
export async function vaciarFotosPropiedad(propiedadId: string): Promise<void> {
  await requerirTeamLeader();
  await db.execute(
    sql`UPDATE propiedades SET fotos = '[]'::jsonb WHERE id = ${propiedadId}`
  );
}

/**
 * Redimensiona y recomprime las fotos YA guardadas de una propiedad
 * (sin perderlas), en vez de borrarlas. Se usa cuando una propiedad quedó
 * con fotos muy pesadas (por ejemplo, subidas antes de que existiera la
 * compresión automática en el navegador) y eso hace fallar la página al
 * abrirla. Mantiene el orden y no toca fotos que ya estén livianas.
 */
export async function recomprimirFotosPropiedad(
  propiedadId: string
): Promise<{ ok: boolean; mensaje: string }> {
  await requerirTeamLeader();

  const [prop] = await db
    .select({ fotos: propiedades.fotos })
    .from(propiedades)
    .where(eq(propiedades.id, propiedadId));

  if (!prop) return { ok: false, mensaje: "Propiedad no encontrada." };
  if (prop.fotos.length === 0) {
    return { ok: false, mensaje: "Esta propiedad no tiene fotos." };
  }

  let recomprimidas = 0;
  const nuevasFotos: string[] = [];

  for (const fotoDataUri of prop.fotos) {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(fotoDataUri);
    if (!match) {
      nuevasFotos.push(fotoDataUri);
      continue;
    }
    const buffer = Buffer.from(match[2], "base64");

    // Si ya está liviana (subida con la compresión nueva), no hace falta tocarla.
    if (buffer.byteLength <= 900 * 1024) {
      nuevasFotos.push(fotoDataUri);
      continue;
    }

    try {
      const salida = await sharp(buffer)
        .rotate() // respeta la orientación EXIF antes de descartarla
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 78 })
        .toBuffer();
      nuevasFotos.push(`data:image/jpeg;base64,${salida.toString("base64")}`);
      recomprimidas++;
    } catch {
      // Si esta imagen puntual no se puede procesar, la dejamos como estaba
      // en vez de perderla.
      nuevasFotos.push(fotoDataUri);
    }
  }

  await db
    .update(propiedades)
    .set({ fotos: nuevasFotos })
    .where(eq(propiedades.id, propiedadId));

  return {
    ok: true,
    mensaje: `Listo: ${recomprimidas} de ${prop.fotos.length} foto(s) recomprimidas.`,
  };
}
