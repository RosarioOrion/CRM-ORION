import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { configuracionEmpresa, contactos, encuestasVisita, propiedades, usuarios, visitas } from "@/db/schema";
import { limpiarTitulo } from "@/lib/propiedades";
import { NOMBRE_SITIO } from "@/lib/sitio";
import type { RespuestasEncuesta } from "@/lib/encuestas";

// La tabla se agregó después: si no existe (no se corrió Admin → Migrar),
// se crea acá una vez por servidor, así nada se cae.
let tablaLista: Promise<void> | null = null;
export function asegurarTablaEncuestas(): Promise<void> {
  tablaLista ??= (async () => {
    const [fila] = await db.execute<{ existe: string | null }>(
      sql`SELECT to_regclass('public.encuestas_visita')::text AS existe`
    );
    if (fila?.existe) return;
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS encuestas_visita (
        id text PRIMARY KEY,
        visita_id text NOT NULL UNIQUE REFERENCES visitas(id) ON DELETE CASCADE,
        token text NOT NULL UNIQUE,
        respuestas jsonb,
        enviada_en timestamp NOT NULL DEFAULT now(),
        respondida_en timestamp
      )
    `);
  })().catch((e) => {
    tablaLista = null;
    throw e;
  });
  return tablaLista;
}

export type EstadoEncuesta = {
  respondidaEn: Date | null;
  respuestas: RespuestasEncuesta | null;
};

/** Encuesta (si se envió) de cada visita. */
export async function encuestasPorVisita(ids: string[]): Promise<Map<string, EstadoEncuesta>> {
  const mapa = new Map<string, EstadoEncuesta>();
  if (ids.length === 0) return mapa;
  await asegurarTablaEncuestas();
  const filas = await db
    .select({
      visitaId: encuestasVisita.visitaId,
      respondidaEn: encuestasVisita.respondidaEn,
      respuestas: encuestasVisita.respuestas,
    })
    .from(encuestasVisita)
    .where(inArray(encuestasVisita.visitaId, ids));
  for (const f of filas) mapa.set(f.visitaId, { respondidaEn: f.respondidaEn, respuestas: f.respuestas ?? null });
  return mapa;
}

/** Encuestas respondidas de una propiedad (para el resumen al dueño). */
export async function encuestasDePropiedad(propiedadId: string) {
  await asegurarTablaEncuestas();
  return db
    .select({
      respondidaEn: encuestasVisita.respondidaEn,
      respuestas: encuestasVisita.respuestas,
      fechaVisita: visitas.fecha,
      contactoNombre: contactos.nombre,
    })
    .from(encuestasVisita)
    .innerJoin(visitas, eq(encuestasVisita.visitaId, visitas.id))
    .innerJoin(contactos, eq(visitas.contactoId, contactos.id))
    .where(and(eq(visitas.propiedadId, propiedadId), isNotNull(encuestasVisita.respondidaEn)))
    .orderBy(desc(encuestasVisita.respondidaEn));
}

/** Datos para la página pública de la encuesta. */
export async function encuestaPorToken(token: string) {
  await asegurarTablaEncuestas();
  const [fila] = await db
    .select({
      id: encuestasVisita.id,
      respondidaEn: encuestasVisita.respondidaEn,
      contactoNombre: contactos.nombre,
      propiedadTitulo: propiedades.titulo,
      operacion: propiedades.operacion,
      agenteNombre: usuarios.nombre,
    })
    .from(encuestasVisita)
    .innerJoin(visitas, eq(encuestasVisita.visitaId, visitas.id))
    .innerJoin(contactos, eq(visitas.contactoId, contactos.id))
    .innerJoin(propiedades, eq(visitas.propiedadId, propiedades.id))
    .innerJoin(usuarios, eq(visitas.agenteId, usuarios.id))
    .where(eq(encuestasVisita.token, token));
  if (!fila) return null;
  const [config] = await db
    .select({ nombre: configuracionEmpresa.nombreEmpresa })
    .from(configuracionEmpresa)
    .limit(1);
  return {
    ...fila,
    propiedadTitulo: limpiarTitulo(fila.propiedadTitulo),
    inmobiliaria: config?.nombre || NOMBRE_SITIO,
  };
}
