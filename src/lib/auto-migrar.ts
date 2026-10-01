import { sql } from "drizzle-orm";
import { db } from "@/db";

// Cambios chicos de base de datos que se aplican solos al arrancar el
// servidor (antes de atender a nadie), para no depender del botón
// "Migración". Cada sentencia es segura de repetir.
const SENTENCIAS = [
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
