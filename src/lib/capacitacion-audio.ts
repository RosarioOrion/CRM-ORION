import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { capacitacionAudios } from "@/db/schema";

// Audios grabados de los capítulos de Capacitación. Se suben por pedazos
// (así no chocan con límites de tamaño de los pedidos) y se guardan en la
// base como bytea; al reproducir se leen solo los pedazos que pide el
// reproductor (Range), necesario para adelantar y para iPhone.

import type { AudioCapitulo } from "./capacitacion-audio-tipos";
export { AUDIO_MAX_BYTES, AUDIO_TROZO_BYTES, type AudioCapitulo } from "./capacitacion-audio-tipos";

export async function listarAudios(documentoId: string): Promise<AudioCapitulo[]> {
  try {
    return await db
      .select({
        id: capacitacionAudios.id,
        parte: capacitacionAudios.parte,
        nombre: capacitacionAudios.nombre,
        peso: capacitacionAudios.peso,
        duracionSeg: capacitacionAudios.duracionSeg,
      })
      .from(capacitacionAudios)
      .where(and(eq(capacitacionAudios.documentoId, documentoId), eq(capacitacionAudios.completo, true)))
      .orderBy(asc(capacitacionAudios.parte), asc(capacitacionAudios.creadoEn));
  } catch {
    return []; // tabla todavía no creada
  }
}

/** Ids de los materiales que tienen al menos un audio completo. */
export async function materialesConAudio(): Promise<Set<string>> {
  try {
    const filas = await db
      .selectDistinct({ id: capacitacionAudios.documentoId })
      .from(capacitacionAudios)
      .where(eq(capacitacionAudios.completo, true));
    return new Set(filas.map((f) => f.id));
  } catch {
    return new Set();
  }
}

export async function crearAudio(datos: {
  documentoId: string;
  nombre: string;
  mime: string;
  peso: number;
  duracionSeg: number | null;
}): Promise<string> {
  // Las subidas que quedaron por la mitad (más de un día) se borran.
  await db.execute(
    sql`DELETE FROM capacitacion_audios WHERE completo = false AND creado_en < now() - interval '1 day'`
  );
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${capacitacionAudios.parte}), 0)::int` })
    .from(capacitacionAudios)
    .where(and(eq(capacitacionAudios.documentoId, datos.documentoId), eq(capacitacionAudios.completo, true)));
  const [fila] = await db
    .insert(capacitacionAudios)
    .values({ ...datos, parte: max + 1 })
    .returning({ id: capacitacionAudios.id });
  return fila.id;
}

/** Suma un pedazo al final; devuelve el tamaño acumulado. */
export async function agregarTrozo(audioId: string, desde: number, trozo: Buffer): Promise<number | null> {
  const filas = await db.execute<{ largo: number }>(sql`
    UPDATE capacitacion_audios
       SET datos = datos || ${trozo}
     WHERE id = ${audioId} AND completo = false AND octet_length(datos) = ${desde}
       AND octet_length(datos) + ${trozo.length} <= peso
    RETURNING octet_length(datos) AS largo`);
  return filas[0] ? Number(filas[0].largo) : null;
}

/** Marca el audio como completo si llegó entero. */
export async function terminarAudio(audioId: string): Promise<boolean> {
  const filas = await db.execute(sql`
    UPDATE capacitacion_audios SET completo = true
     WHERE id = ${audioId} AND octet_length(datos) = peso
    RETURNING id`);
  return filas.length > 0;
}

export async function infoAudio(audioId: string, documentoId: string) {
  const [a] = await db
    .select({ mime: capacitacionAudios.mime, peso: capacitacionAudios.peso, nombre: capacitacionAudios.nombre, completo: capacitacionAudios.completo })
    .from(capacitacionAudios)
    .where(and(eq(capacitacionAudios.id, audioId), eq(capacitacionAudios.documentoId, documentoId)));
  return a ?? null;
}

/** Lee un pedazo del audio (inicio en bytes, desde 0). */
export async function leerTrozo(audioId: string, inicio: number, largo: number): Promise<Buffer> {
  const filas = await db.execute<{ trozo: Buffer }>(
    sql`SELECT substring(datos FROM ${inicio + 1} FOR ${largo}) AS trozo FROM capacitacion_audios WHERE id = ${audioId}`
  );
  return Buffer.from(filas[0]?.trozo ?? []);
}

export async function borrarAudio(audioId: string, documentoId: string) {
  await db
    .delete(capacitacionAudios)
    .where(and(eq(capacitacionAudios.id, audioId), eq(capacitacionAudios.documentoId, documentoId)));
}

/** Cambia el orden de las partes: lista de ids en el orden nuevo. */
export async function ordenarAudios(documentoId: string, ids: string[]) {
  for (const [i, id] of ids.entries()) {
    await db
      .update(capacitacionAudios)
      .set({ parte: i + 1 })
      .where(and(eq(capacitacionAudios.id, id), eq(capacitacionAudios.documentoId, documentoId)));
  }
}

export async function borrarAudiosDe(documentoId: string) {
  await db.delete(capacitacionAudios).where(eq(capacitacionAudios.documentoId, documentoId)).catch(() => {});
}
