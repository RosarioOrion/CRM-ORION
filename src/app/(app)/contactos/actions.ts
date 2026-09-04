"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contactos, propiedades, busquedas } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import {
  CATEGORIAS_CONTACTO,
  ORIGENES_CONTACTO,
  esCategoriaValida,
  esOrigenValido,
} from "@/lib/contactos";

const ContactoSchema = z.object({
  nombre: z.string().min(2, "Ingresá un nombre"),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  notas: z.string().optional(),
  categoria: z.enum(CATEGORIAS_CONTACTO).optional(),
  origen: z.enum(ORIGENES_CONTACTO).optional(),
  origenDetalle: z.string().optional(),
});

export type ContactoState = { error?: string };

export async function crearContacto(
  _prevState: ContactoState,
  formData: FormData
): Promise<ContactoState> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };

  const parsed = ContactoSchema.safeParse({
    nombre: formData.get("nombre"),
    telefono: formData.get("telefono") || undefined,
    email: formData.get("email") || undefined,
    notas: formData.get("notas") || undefined,
    categoria: formData.get("categoria") || undefined,
    origen: formData.get("origen") || undefined,
    origenDetalle: formData.get("origenDetalle") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await db.insert(contactos).values({
    ...parsed.data,
    email: parsed.data.email || null,
    categoria: parsed.data.categoria ?? "OTRO",
    origen: parsed.data.origen ?? "OTRO",
    origenDetalle: parsed.data.origenDetalle || null,
    agenteId: sesion.userId,
  });

  revalidatePath("/contactos");
  return {};
}

async function requerirPropietario(contactoId: string) {
  const sesion = await obtenerSesion();
  if (!sesion) throw new Error("Sesión expirada, volvé a ingresar.");

  const [contacto] = await db
    .select()
    .from(contactos)
    .where(eq(contactos.id, contactoId));

  if (!contacto || contacto.agenteId !== sesion.userId) {
    throw new Error("Contacto no encontrado.");
  }
  return contacto;
}

export async function actualizarCategoria(contactoId: string, categoria: string) {
  await requerirPropietario(contactoId);
  if (!esCategoriaValida(categoria)) throw new Error("Categoría inválida.");

  await db.update(contactos).set({ categoria }).where(eq(contactos.id, contactoId));

  revalidatePath("/contactos");
  revalidatePath(`/contactos/${contactoId}`);
}

export type DetallesState = { error?: string; ok?: boolean };

export async function actualizarDetalles(
  contactoId: string,
  _prevState: DetallesState,
  formData: FormData
): Promise<DetallesState> {
  await requerirPropietario(contactoId);

  const origen = formData.get("origen");
  const origenDetalle = formData.get("origenDetalle");
  const notas = formData.get("notas");

  if (typeof origen !== "string" || !esOrigenValido(origen)) {
    return { error: "Origen inválido." };
  }

  await db
    .update(contactos)
    .set({
      origen,
      origenDetalle: typeof origenDetalle === "string" && origenDetalle.trim() ? origenDetalle.trim() : null,
      notas: typeof notas === "string" && notas.trim() ? notas.trim() : null,
    })
    .where(eq(contactos.id, contactoId));

  revalidatePath("/contactos");
  revalidatePath(`/contactos/${contactoId}`);
  return { ok: true };
}

export async function archivarContacto(contactoId: string, archivado: boolean) {
  await requerirPropietario(contactoId);

  await db
    .update(contactos)
    .set({ archivado })
    .where(eq(contactos.id, contactoId));

  revalidatePath("/contactos");
  revalidatePath(`/contactos/${contactoId}`);
}

export type EliminarState = { ok: boolean; error?: string };

export async function eliminarContacto(contactoId: string): Promise<EliminarState> {
  await requerirPropietario(contactoId);

  const [tienePropiedad] = await db
    .select({ id: propiedades.id })
    .from(propiedades)
    .where(eq(propiedades.duenoId, contactoId))
    .limit(1);
  if (tienePropiedad) {
    return {
      ok: false,
      error:
        "No se puede eliminar: este contacto figura como dueño de al menos una propiedad. Reasigná esa propiedad a otro contacto o archivá este contacto en vez de borrarlo.",
    };
  }

  const [tieneBusqueda] = await db
    .select({ id: busquedas.id })
    .from(busquedas)
    .where(eq(busquedas.contactoId, contactoId))
    .limit(1);
  if (tieneBusqueda) {
    return {
      ok: false,
      error:
        "No se puede eliminar: este contacto tiene búsquedas asociadas. Archivalo en vez de borrarlo.",
    };
  }

  await db.delete(contactos).where(eq(contactos.id, contactoId));

  revalidatePath("/contactos");
  return { ok: true };
}
