import { sql } from "drizzle-orm";
import { FILOSOFIA_ORION } from "@/lib/filosofia";
import { AREAS_INICIALES } from "@/lib/manual-indice";
import { db } from "@/db";

// Cambios chicos de base de datos que se aplican solos al arrancar el
// servidor (antes de atender a nadie), para no depender del botón
// "Migración". Cada sentencia es segura de repetir.
const SENTENCIAS = [
  // Rol CEO (la fundadora). Se le asigna al usuario más antiguo con rol de
  // jefe, una sola vez: si ya hay un CEO no se toca.
  sql`ALTER TYPE rol ADD VALUE IF NOT EXISTS 'CEO'`,
  sql`UPDATE usuarios SET rol = 'CEO'
      WHERE id = (SELECT id FROM usuarios WHERE rol IN ('ADMINISTRADOR', 'TEAM_LEADER') AND activo
                  ORDER BY creado_en LIMIT 1)
        AND NOT EXISTS (SELECT 1 FROM usuarios WHERE rol = 'CEO')`,
  sql`ALTER TABLE contactos ADD COLUMN IF NOT EXISTS roles jsonb NOT NULL DEFAULT '[]'`,
  sql`ALTER TABLE contactos ADD COLUMN IF NOT EXISTS frio_desde timestamp`,
  sql`CREATE TABLE IF NOT EXISTS seguimientos (
    id text PRIMARY KEY,
    contacto_id text NOT NULL,
    propiedad_id text,
    agente_id text NOT NULL,
    fecha timestamp NOT NULL DEFAULT now(),
    canal text NOT NULL,
    respondio boolean NOT NULL,
    aviso_final boolean NOT NULL DEFAULT false,
    nota text,
    proxima_fecha timestamp
  )`,
  sql`CREATE INDEX IF NOT EXISTS seguimientos_contacto_idx ON seguimientos (contacto_id, fecha)`,
  // Pipeline: frecuencia del seguimiento al dueño y datos del ajuste de precio.
  sql`ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS frecuencia_seguimiento integer`,
  sql`ALTER TABLE seguimientos ADD COLUMN IF NOT EXISTS ajuste_planteado boolean`,
  sql`ALTER TABLE seguimientos ADD COLUMN IF NOT EXISTS ajuste_aceptado boolean`,
  sql`ALTER TABLE seguimientos ADD COLUMN IF NOT EXISTS ajuste_precio integer`,
  sql`ALTER TABLE seguimientos ADD COLUMN IF NOT EXISTS ajuste_moneda text`,
  sql`CREATE INDEX IF NOT EXISTS seguimientos_propiedad_idx ON seguimientos (propiedad_id, fecha)`,
  // Ubicación de la propiedad en el mapa.
  sql`ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS lat double precision`,
  sql`ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS lng double precision`,
  // Link de la publicación en la captación.
  sql`ALTER TABLE captaciones ADD COLUMN IF NOT EXISTS link text`,
  // Consultas por propiedad ("+ Consulta" en la ficha).
  sql`CREATE TABLE IF NOT EXISTS consultas_propiedad (
    id text PRIMARY KEY,
    propiedad_id text NOT NULL REFERENCES propiedades(id),
    agente_id text NOT NULL REFERENCES usuarios(id),
    canal text NOT NULL,
    nombre text,
    telefono text,
    nota text,
    creado_en timestamp NOT NULL DEFAULT now()
  )`,
  sql`CREATE INDEX IF NOT EXISTS consultas_propiedad_idx ON consultas_propiedad (propiedad_id, creado_en)`,
  // Comisiones: la línea de gastos de la empresa no tiene beneficiario.
  sql`ALTER TABLE comisiones ALTER COLUMN beneficiario_id DROP NOT NULL`,
  // Escala de agentes definida por Rosario: Agente 40% desde 0, Asesor 45%
  // desde USD 10.000, Ejecutivo 50% desde USD 20.000. Se aplica una sola vez
  // (después se edita en Ajustes); "Agente Junior" pasa a ser "Agente".
  sql`ALTER TABLE usuarios ALTER COLUMN nivel_comision SET DEFAULT 'AGENTE'`,
  sql`CREATE TABLE IF NOT EXISTS datos_cargados (clave text PRIMARY KEY, creado_en timestamp NOT NULL DEFAULT now())`,
  sql`DO $$ BEGIN
    IF to_regclass('public.niveles_comision') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM datos_cargados WHERE clave = 'escala-comisiones-agentes') THEN
      DELETE FROM niveles_comision WHERE clave = 'AGENTE_JUNIOR';
      INSERT INTO niveles_comision (id, clave, nombre, facturacion_minima, porcentaje) VALUES
        (md5(random()::text), 'AGENTE', 'Agente', 0, 40),
        (md5(random()::text), 'ASESOR', 'Asesor', 10000, 45),
        (md5(random()::text), 'EJECUTIVO', 'Ejecutivo', 20000, 50)
      ON CONFLICT (clave) DO UPDATE
        SET nombre = EXCLUDED.nombre, facturacion_minima = EXCLUDED.facturacion_minima, porcentaje = EXCLUDED.porcentaje;
      UPDATE usuarios SET nivel_comision = 'AGENTE' WHERE nivel_comision = 'AGENTE_JUNIOR';
      INSERT INTO datos_cargados (clave) VALUES ('escala-comisiones-agentes');
    END IF;
  END $$`,
  // Objetivo mensual de comisiones de cada agente (Inicio).
  sql`CREATE TABLE IF NOT EXISTS objetivos_mensuales (
    id text PRIMARY KEY,
    usuario_id text NOT NULL REFERENCES usuarios(id),
    mes text NOT NULL,
    monto integer NOT NULL,
    automatico boolean NOT NULL DEFAULT false,
    creado_en timestamp NOT NULL DEFAULT now(),
    CONSTRAINT objetivos_mensuales_usuario_mes UNIQUE (usuario_id, mes)
  )`,
  // Registro de actividad de cada usuario.
  sql`CREATE TABLE IF NOT EXISTS registro_actividad (
    id text PRIMARY KEY,
    usuario_id text NOT NULL,
    suplantado_por text,
    accion text NOT NULL,
    entidad text,
    entidad_id text,
    detalle text,
    creado_en timestamp NOT NULL DEFAULT now()
  )`,
  sql`CREATE INDEX IF NOT EXISTS registro_actividad_usuario_idx ON registro_actividad (usuario_id, creado_en)`,
  sql`CREATE INDEX IF NOT EXISTS registro_actividad_fecha_idx ON registro_actividad (creado_en)`,
  // Circuito de captación: etapas con plazos (48 hs, S8, S12) y tasación.
  sql`ALTER TABLE captaciones ADD COLUMN IF NOT EXISTS etapa text NOT NULL DEFAULT 'LLAMANDO'`,
  sql`ALTER TABLE captaciones ADD COLUMN IF NOT EXISTS etapa_desde timestamp NOT NULL DEFAULT now()`,
  sql`ALTER TABLE captaciones ADD COLUMN IF NOT EXISTS intento_en timestamp`,
  sql`ALTER TABLE captaciones ADD COLUMN IF NOT EXISTS intento_canal text`,
  sql`ALTER TABLE captaciones ADD COLUMN IF NOT EXISTS seguimientos_hechos integer NOT NULL DEFAULT 0`,
  sql`ALTER TABLE captaciones ADD COLUMN IF NOT EXISTS ultimo_seguimiento timestamp`,
  sql`ALTER TABLE captaciones ADD COLUMN IF NOT EXISTS tasacion_id text`,
  sql`ALTER TABLE captaciones ADD COLUMN IF NOT EXISTS tasacion_uso text`,
  sql`ALTER TABLE captaciones ADD COLUMN IF NOT EXISTS historial jsonb NOT NULL DEFAULT '[]'::jsonb`,
  sql`ALTER TABLE captaciones ADD COLUMN IF NOT EXISTS plazo_extendido boolean NOT NULL DEFAULT false`,
  // Las captaciones que ya existían conservan su columna y, las que están
  // en Llamando, arrancan con 7 días de margen (no 48 hs) desde la actualización.
  sql`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM datos_cargados WHERE clave = 'captacion-etapas') THEN
      UPDATE captaciones SET etapa = estado::text,
        etapa_desde = CASE WHEN estado::text = 'LLAMANDO' THEN now() + interval '5 days' ELSE now() END;
      INSERT INTO datos_cargados (clave) VALUES ('captacion-etapas');
    END IF;
  END $$`,
  // Tasación profesional: categoría, zona y medidas extra.
  sql`ALTER TABLE tasaciones ADD COLUMN IF NOT EXISTS detalle jsonb`,
  // Mis finanzas (privado de cada usuario) y su cierre mensual (Money Day).
  sql`CREATE TABLE IF NOT EXISTS finanzas_movimientos (
    id text PRIMARY KEY,
    usuario_id text NOT NULL,
    fecha timestamp NOT NULL,
    tipo text NOT NULL,
    categoria text NOT NULL,
    monto double precision NOT NULL,
    moneda text NOT NULL DEFAULT 'UYU',
    nota text,
    comision_id text,
    oculto boolean NOT NULL DEFAULT false,
    creado_en timestamp NOT NULL DEFAULT now()
  )`,
  sql`CREATE INDEX IF NOT EXISTS finanzas_movimientos_usuario_idx ON finanzas_movimientos (usuario_id, fecha)`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS finanzas_movimientos_comision_idx ON finanzas_movimientos (usuario_id, comision_id) WHERE comision_id IS NOT NULL`,
  sql`CREATE TABLE IF NOT EXISTS finanzas_meses (
    id text PRIMARY KEY,
    usuario_id text NOT NULL,
    mes text NOT NULL,
    cotizacion double precision,
    presupuesto jsonb NOT NULL DEFAULT '{}'::jsonb,
    ingreso_esperado double precision,
    notas text,
    cerrado_en timestamp,
    creado_en timestamp NOT NULL DEFAULT now(),
    CONSTRAINT finanzas_meses_usuario_mes UNIQUE (usuario_id, mes)
  )`,
  // Índice del Manual Orion en Capacitación: número, bloque y áreas.
  sql`ALTER TABLE documentos_capacitacion ADD COLUMN IF NOT EXISTS clase text`,
  sql`ALTER TABLE documentos_capacitacion ADD COLUMN IF NOT EXISTS numero text`,
  sql`ALTER TABLE documentos_capacitacion ADD COLUMN IF NOT EXISTS orden integer`,
  sql`ALTER TABLE documentos_capacitacion ADD COLUMN IF NOT EXISTS bloque text`,
  sql`ALTER TABLE documentos_capacitacion ADD COLUMN IF NOT EXISTS areas jsonb NOT NULL DEFAULT '[]'::jsonb`,
  sql`CREATE TABLE IF NOT EXISTS capacitacion_areas (
    clave text PRIMARY KEY,
    nombre text NOT NULL,
    icono text NOT NULL DEFAULT '📘',
    orden integer NOT NULL DEFAULT 0,
    creado_en timestamp NOT NULL DEFAULT now()
  )`,
  // Las 12 áreas de Rosario (Tabla B), una sola vez: después se editan.
  sql.raw(`DO $a$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM datos_cargados WHERE clave = 'capacitacion-areas') THEN
      INSERT INTO capacitacion_areas (clave, nombre, icono, orden) VALUES
        ${AREAS_INICIALES.map((x) => `('${x.clave}', '${x.nombre.replace(/'/g, "''")}', '${x.icono}', ${x.orden})`).join(",\n        ")}
      ON CONFLICT (clave) DO NOTHING;
      INSERT INTO datos_cargados (clave) VALUES ('capacitacion-areas');
    END IF;
  END $a$`),
  // Buscador dentro de los PDF de Capacitación.
  sql`ALTER TABLE documentos_capacitacion ADD COLUMN IF NOT EXISTS texto_indexado_en timestamp`,
  sql`CREATE TABLE IF NOT EXISTS capacitacion_paginas (
    documento_id text NOT NULL,
    pagina integer NOT NULL,
    texto text NOT NULL,
    busqueda text NOT NULL,
    PRIMARY KEY (documento_id, pagina)
  )`,
  // Comisiones (acuerdo nov. 2026): % de líder por usuario. Los líderes que
  // ya existían (César) arrancan con 25%; los nuevos, con 10%.
  sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS porcentaje_lider double precision NOT NULL DEFAULT 10`,
  sql.raw(`DO $c$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM datos_cargados WHERE clave = 'comisiones-lider-25') THEN
      UPDATE usuarios SET porcentaje_lider = 25 WHERE rol = 'TEAM_LEADER';
      INSERT INTO datos_cargados (clave) VALUES ('comisiones-lider-25');
    END IF;
  END $c$`),
  // Reservas: comisión entera o compartida, quién paga y agentes de cada punta.
  ...["reservas_venta", "reservas_alquiler"].flatMap((t) => [
    sql.raw(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS tipo_comision text NOT NULL DEFAULT 'ENTERA'`),
    sql.raw(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS quien_paga text NOT NULL DEFAULT 'AMBAS'`),
    sql.raw(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS agente_propiedad_id text`),
    sql.raw(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS agente_cliente_id text`),
    sql.raw(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS otra_inmobiliaria text`),
    sql.raw(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS orion_aporta text`),
  ]),
  sql`ALTER TABLE reservas_alquiler ADD COLUMN IF NOT EXISTS comision_propietario_usd integer`,
  sql`ALTER TABLE reservas_alquiler ADD COLUMN IF NOT EXISTS comision_inquilino_usd integer`,
  // Audios de los capítulos (grabados por la CEO). El archivo va en bytea
  // sin comprimir (STORAGE EXTERNAL) para poder leer pedazos al reproducir.
  sql`CREATE TABLE IF NOT EXISTS capacitacion_audios (
    id text PRIMARY KEY,
    documento_id text NOT NULL,
    parte integer NOT NULL DEFAULT 1,
    nombre text NOT NULL,
    mime text NOT NULL,
    peso integer NOT NULL,
    duracion_seg integer,
    completo boolean NOT NULL DEFAULT false,
    datos bytea NOT NULL DEFAULT ''::bytea,
    creado_en timestamp NOT NULL DEFAULT now()
  )`,
  sql`ALTER TABLE capacitacion_audios ALTER COLUMN datos SET STORAGE EXTERNAL`,
  sql`CREATE INDEX IF NOT EXISTS capacitacion_audios_doc ON capacitacion_audios (documento_id, parte)`,
  // Frases propias para la "Frase del día" del Inicio.
  sql`CREATE TABLE IF NOT EXISTS frases_inicio (
    id text PRIMARY KEY,
    texto text NOT NULL,
    accion text,
    creado_en timestamp NOT NULL DEFAULT now()
  )`,
  sql`ALTER TABLE frases_inicio ADD COLUMN IF NOT EXISTS autor text`,
  sql`ALTER TABLE frases_inicio ADD COLUMN IF NOT EXISTS fuente text`,
  sql`ALTER TABLE frases_inicio ADD COLUMN IF NOT EXISTS categoria text`,
  sql`ALTER TABLE frases_inicio ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'PROPIA'`,
  // Filosofía de Orion (Rosario): se carga una sola vez en Ajustes → Filosofía.
  sql.raw(`DO $f$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM datos_cargados WHERE clave = 'filosofia-orion') THEN
      IF EXISTS (SELECT 1 FROM configuracion_empresa) THEN
        UPDATE configuracion_empresa SET filosofia = '${FILOSOFIA_ORION.replace(/'/g, "''")}', actualizado_en = now();
      ELSE
        INSERT INTO configuracion_empresa (id, filosofia) VALUES (md5(random()::text), '${FILOSOFIA_ORION.replace(/'/g, "''")}');
      END IF;
      INSERT INTO datos_cargados (clave) VALUES ('filosofia-orion');
    END IF;
  END $f$`),
];

export async function autoMigrar() {
  for (const s of SENTENCIAS) {
    try {
      await db.execute(s);
    } catch (e) {
      console.error("[auto-migrar]", e instanceof Error ? e.message : e);
    }
  }
}
