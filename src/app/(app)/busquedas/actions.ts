"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { busquedas, contactos } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";

const BusquedaSchema = z.object({
  contactoId: z.string().min(1, "Elegí el contacto"),
  operacion: z.enum(["VENTA", "ALQUILER"]),
  tipo: z.string().min(2, "Elegí el tipo de propiedad"),
  zona: z.string().min(2, "Ingresá la zona"),
  precioMin: z.coerce.number().optional(),
  precioMax: z.coerce.number().optional(),
  vence: z.string().optional(),
});

export type BusquedaState = { error?: string; ok?: boolean };

/** Confirma que el contacto es del agente logueado antes de crear la búsqueda en su nombre. */
async function requerirContactoDelAgente(contactoId: string) {
  const sesion = await obtenerSesion();
  if (!sesion) throw new Error("Sesión expirada, volvé a ingresar.");

  const [contacto] = await db
    .select({ id: contactos.id })
    .from(contactos)
    .where(eq(contactos.id, contactoId));

  if (!contacto) throw new Error("Contacto no encontrado.");
  return sesion;
}

/** Confirma que la búsqueda pertenece (vía su contacto) al agente logueado. */
async function requerirBusquedaDelAgente(busquedaId: string) {
  const sesion = await obtenerSesion();
  if (!sesion) throw new Error("Sesión expirada, volvé a ingresar.");

  const [fila] = await db
    .select({ id: busquedas.id, agenteId: contactos.agenteId })
    .from(busquedas)
    .innerJoin(contactos, eq(busquedas.contactoId, contactos.id))
    .where(eq(busquedas.id, busquedaId));

  if (!fila || fila.agenteId !== sesion.userId) {
    throw new Error("Búsqueda no encontrada.");
  }
  return sesion;
}

export async function crearBusqueda(
  _prevState: BusquedaState,
  formData: FormData
): Promise<BusquedaState> {
  const parsed = BusquedaSchema.safeParse({
    contactoId: formData.get("contactoId"),
    operacion: formData.get("operacion"),
    tipo: formData.get("tipo"),
    zona: formData.get("zona"),
    precioMin: formData.get("precioMin") || undefined,
    precioMax: formData.get("precioMax") || undefined,
    vence: formData.get("vence") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await requerirContactoDelAgente(parsed.data.contactoId);

  await db.insert(busquedas).values({
    contactoId: parsed.data.contactoId,
    operacion: parsed.data.operacion,
    tipo: parsed.data.tipo,
    zona: parsed.data.zona,
    precioMin: parsed.data.precioMin ?? null,
    precioMax: parsed.data.precioMax ?? null,
    vence: parsed.data.vence ? new Date(parsed.data.vence) : null,
  });

  revalidatePath("/busquedas");
  revalidatePath("/contactos");
  return { ok: true };
}

export async function actualizarActivaBusqueda(
  busquedaId: string,
  activa: boolean
) {
  await requerirBusquedaDelAgente(busquedaId);

  await db.update(busquedas).set({ activa }).where(eq(busquedas.id, busquedaId));

  revalidatePath("/busquedas");
  revalidatePath("/contactos");
}

export async function eliminarBusqueda(busquedaId: string) {
  await requerirBusquedaDelAgente(busquedaId);

  await db.delete(busquedas).where(eq(busquedas.id, busquedaId));

  revalidatePath("/busquedas");
  revalidatePath("/contactos");
}
