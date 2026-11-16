import { eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { documentosCapacitacion } from "@/db/schema";
import { areasIniciales, bloqueDe, leerNumero, ordenDe } from "@/lib/manual-indice";

/**
 * Completa número, bloque y áreas de los materiales que todavía no los tienen,
 * leyendo el número o la letra del título y las tablas de Rosario. Solo toca
 * los que tienen "clase" vacía: lo que se edita a mano no se pisa.
 */
export async function completarIndiceCapacitacion(): Promise<number> {
  const pendientes = await db
    .select({ id: documentosCapacitacion.id, titulo: documentosCapacitacion.titulo })
    .from(documentosCapacitacion)
    .where(isNull(documentosCapacitacion.clase));
  for (const d of pendientes) {
    const { clase, numero } = leerNumero(d.titulo);
    await db
      .update(documentosCapacitacion)
      .set({
        clase,
        numero,
        orden: ordenDe(clase, numero),
        bloque: bloqueDe(clase, numero),
        areas: areasIniciales(clase, numero),
      })
      .where(eq(documentosCapacitacion.id, d.id));
  }
  return pendientes.length;
}
