"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { visitas, propiedades, contactos } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { ESTADOS_VISITA, type EstadoVisita } from "@/lib/visitas";

const VisitaSchema = z.object({
  propiedadId: z.string().min(1, "Elegí la propiedad"),
  contactoId: z.string().min(1, "Elegí el contacto"),
  fecha: z.string().min(1, "Elegí fecha y hora"),
  notas: z.string().optional(),
});

export type VisitaState = { error?: string; ok?: boolean };

async function requerirVisitaDelAgente(visitaId: string) {
  const sesion = await obtenerSesion();
  if (!sesion) throw new Error("Sesión expirada, volvé a ingresar.");

  const [fila] = await db
    .select({ id: visitas.id, agenteId: visitas.agenteId })
    .from(visitas)
    .where(eq(visitas.id, visitaId));

  if (!fila || fila.agenteId !== sesion.userId) {
    throw new Error("Visita no encontrada.");
  }
  return sesion;
}

export async function crearVisita(
  _prevState: VisitaState,
  formData: FormData
): Promise<VisitaState> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };

  const parsed = VisitaSchema.safeParse({
    propiedadId: formData.get("propiedadId"),
    contactoId: formData.get("contactoId"),
    fecha: formData.get("fecha"),
    notas: formData.get("notas") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const [propiedad] = await db
    .select({ id: propiedades.id })
    .from(propiedades)
    .where(eq(propiedades.id, parsed.data.propiedadId));
  if (!propiedad) return { error: "Propiedad no encontrada." };

  const [contacto] = await db
    .select({ id: contactos.id })
    .from(contactos)
    .where(eq(contactos.id, parsed.data.contactoId));
  if (!contacto) return { error: "Contacto no encontrado." };

  const fecha = new Date(parsed.data.fecha);
  if (isNaN(fecha.getTime())) return { error: "Fecha inválida." };

  await db.insert(visitas).values({
    propiedadId: parsed.data.propiedadId,
    contactoId: parsed.data.contactoId,
    agenteId: sesion.userId,
    fecha,
    notas: parsed.data.notas ?? null,
  });

  revalidatePath("/agenda");
  return { ok: true };
}

export async function cambiarEstadoVisita(
  visitaId: string,
  estado: EstadoVisita,
  resultado?: string
) {
  if (!ESTADOS_VISITA.includes(estado)) {
    throw new Error("Estado inválido.");
  }
  await requerirVisitaDelAgente(visitaId);

  await db
    .update(visitas)
    .set({ estado, resultado: resultado?.trim() || null })
    .where(eq(visitas.id, visitaId));

  revalidatePath("/agenda");
}

export async function eliminarVisita(visitaId: string) {
  await requerirVisitaDelAgente(visitaId);

  await db.delete(visitas).where(eq(visitas.id, visitaId));

  revalidatePath("/agenda");
}
