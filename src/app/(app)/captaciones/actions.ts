"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { captaciones, contactos, propiedades } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { ESTADOS_CAPTACION, type EstadoCaptacion } from "@/lib/captaciones";

const CaptacionSchema = z.object({
  titulo: z.string().min(3, "Ingresá un título"),
  contactoId: z.string().min(1, "Elegí el contacto (propietario)"),
  operacion: z.enum(["VENTA", "ALQUILER"]),
  tipo: z.string().min(2, "Elegí el tipo de propiedad"),
  zona: z.string().optional(),
  direccion: z.string().optional(),
  origen: z.string().min(1, "Elegí el origen"),
  origenDetalle: z.string().optional(),
  notas: z.string().optional(),
});

export type CaptacionState = { error?: string; ok?: boolean };

async function generarCodigoPropiedad() {
  const [{ total }] = await db.select({ total: count() }).from(propiedades);
  const siguiente = total + 1;
  return `OR${String(siguiente).padStart(3, "0")}`;
}

/** Confirma que el contacto es del agente logueado antes de crear la captación en su nombre. */
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

/** Confirma que la captación pertenece al agente logueado. */
async function requerirCaptacionDelAgente(captacionId: string) {
  const sesion = await obtenerSesion();
  if (!sesion) throw new Error("Sesión expirada, volvé a ingresar.");

  const [fila] = await db
    .select({ id: captaciones.id, agenteId: captaciones.agenteId })
    .from(captaciones)
    .where(eq(captaciones.id, captacionId));

  if (!fila || fila.agenteId !== sesion.userId) {
    throw new Error("Captación no encontrada.");
  }
  return sesion;
}

export async function crearCaptacion(
  _prevState: CaptacionState,
  formData: FormData
): Promise<CaptacionState> {
  const parsed = CaptacionSchema.safeParse({
    titulo: formData.get("titulo"),
    contactoId: formData.get("contactoId"),
    operacion: formData.get("operacion"),
    tipo: formData.get("tipo"),
    zona: formData.get("zona") || undefined,
    direccion: formData.get("direccion") || undefined,
    origen: formData.get("origen"),
    origenDetalle: formData.get("origenDetalle") || undefined,
    notas: formData.get("notas") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const sesion = await requerirContactoDelAgente(parsed.data.contactoId);

  await db.insert(captaciones).values({
    titulo: parsed.data.titulo,
    contactoId: parsed.data.contactoId,
    agenteId: sesion.userId,
    operacion: parsed.data.operacion,
    tipo: parsed.data.tipo,
    zona: parsed.data.zona ?? null,
    direccion: parsed.data.direccion ?? null,
    origen: parsed.data.origen,
    origenDetalle: parsed.data.origenDetalle ?? null,
    notas: parsed.data.notas ?? null,
  });

  revalidatePath("/captaciones");
  return { ok: true };
}

export async function cambiarEstadoCaptacion(
  captacionId: string,
  estado: EstadoCaptacion
) {
  if (!ESTADOS_CAPTACION.includes(estado)) {
    throw new Error("Estado inválido.");
  }
  await requerirCaptacionDelAgente(captacionId);

  await db
    .update(captaciones)
    .set({ estado })
    .where(eq(captaciones.id, captacionId));

  revalidatePath("/captaciones");
}

export async function eliminarCaptacion(captacionId: string) {
  await requerirCaptacionDelAgente(captacionId);

  await db.delete(captaciones).where(eq(captaciones.id, captacionId));

  revalidatePath("/captaciones");
}

/**
 * Convierte una captación en "Para publicar" en una Propiedad activa de
 * Orion. No borra la captación: la deja marcada con el id de la propiedad
 * nueva para que quede el rastro de dónde salió.
 */
export async function convertirEnPropiedad(captacionId: string) {
  const sesion = await requerirCaptacionDelAgente(captacionId);

  const [cap] = await db
    .select()
    .from(captaciones)
    .where(eq(captaciones.id, captacionId));

  if (!cap) throw new Error("Captación no encontrada.");
  if (cap.convertidaEnPropiedadId) {
    throw new Error("Esta captación ya fue convertida en propiedad.");
  }
  if (!cap.zona) {
    throw new Error("Cargá la zona antes de publicar la propiedad.");
  }

  const codigo = await generarCodigoPropiedad();

  const [nuevaPropiedad] = await db
    .insert(propiedades)
    .values({
      codigo,
      titulo: cap.titulo,
      operacion: cap.operacion,
      tipo: cap.tipo,
      zona: cap.zona,
      direccion: cap.direccion ?? null,
      descripcion: cap.notas ?? null,
      duenoId: cap.contactoId,
      agenteId: sesion.userId,
      estado: "ACTIVA",
    })
    .returning({ id: propiedades.id });

  await db
    .update(captaciones)
    .set({ estado: "PARA_PUBLICAR", convertidaEnPropiedadId: nuevaPropiedad.id })
    .where(eq(captaciones.id, captacionId));

  revalidatePath("/captaciones");
  revalidatePath("/propiedades");

  return nuevaPropiedad.id;
}
