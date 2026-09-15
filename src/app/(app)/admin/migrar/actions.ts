"use server";

import { db } from "@/db";
import { obtenerSesion } from "@/lib/auth";
import { sql } from "drizzle-orm";

export type PasoMigracion = {
  paso: string;
  ok: boolean;
  detalle: string;
};

async function requerirTeamLeader() {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "TEAM_LEADER") {
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
  await paso(resultados, "Agregar estado VENDIDA_OTRA_INMOBILIARIA", () =>
    db.execute(
      sql`ALTER TYPE estado_propiedad ADD VALUE IF NOT EXISTS 'VENDIDA_OTRA_INMOBILIARIA'`
    )
  );
  await paso(resultados, "Agregar estado ALQUILADA_OTRA_INMOBILIARIA", () =>
    db.execute(
      sql`ALTER TYPE estado_propiedad ADD VALUE IF NOT EXISTS 'ALQUILADA_OTRA_INMOBILIARIA'`
    )
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
    "Corregir estado -> VENDIDA_OTRA_INMOBILIARIA",
    () =>
      db.execute(
        sql`UPDATE propiedades SET estado = 'VENDIDA_OTRA_INMOBILIARIA' WHERE titulo ILIKE '%[VENDIDA POR OTRA INMOBILIARIA]%' AND estado != 'VENDIDA_OTRA_INMOBILIARIA'`
      )
  );
  await paso(
    resultados,
    "Corregir estado -> ALQUILADA_OTRA_INMOBILIARIA",
    () =>
      db.execute(
        sql`UPDATE propiedades SET estado = 'ALQUILADA_OTRA_INMOBILIARIA' WHERE titulo ILIKE '%[ALQUILADA POR OTRA INMOBILIARIA]%' AND estado != 'ALQUILADA_OTRA_INMOBILIARIA'`
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
