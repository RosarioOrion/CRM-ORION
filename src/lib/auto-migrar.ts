import { sql } from "drizzle-orm";
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
