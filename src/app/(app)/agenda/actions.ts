"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { visitas, propiedades, contactos, actividades } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { ESTADOS_VISITA, type EstadoVisita } from "@/lib/visitas";
import {
  TIPOS_ACTIVIDAD,
  ESTADOS_ACTIVIDAD,
  type EstadoActividad,
} from "@/lib/calendario";

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
  revalidatePath("/dashboard");
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

// ---------------------------------------------------------------------------
// Actividades: todo lo que no es visita a propiedad (reuniones, visitas de
// captación, tasaciones, firmas, material gráfico, reuniones de equipo...).

const ActividadSchema = z.object({
  tipo: z.enum(TIPOS_ACTIVIDAD as [string, ...string[]], {
    message: "Elegí el tipo de actividad",
  }),
  titulo: z.string().trim().min(1, "Escribí un título"),
  fecha: z.string().min(1, "Elegí fecha y hora"),
  lugar: z.string().trim().optional(),
  propiedadId: z.string().optional(),
  contactoId: z.string().optional(),
  notas: z.string().trim().optional(),
});

export type ActividadState = { error?: string; ok?: boolean };

async function requerirActividadDelAgente(actividadId: string) {
  const sesion = await obtenerSesion();
  if (!sesion) throw new Error("Sesión expirada, volvé a ingresar.");

  const [fila] = await db
    .select({ id: actividades.id, agenteId: actividades.agenteId })
    .from(actividades)
    .where(eq(actividades.id, actividadId));

  if (!fila || fila.agenteId !== sesion.userId) {
    throw new Error("Actividad no encontrada.");
  }
  return sesion;
}

export async function crearActividad(
  _prevState: ActividadState,
  formData: FormData
): Promise<ActividadState> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };

  const parsed = ActividadSchema.safeParse({
    tipo: formData.get("tipo"),
    titulo: formData.get("titulo") ?? "",
    fecha: formData.get("fecha") ?? "",
    lugar: formData.get("lugar") || undefined,
    propiedadId: formData.get("propiedadId") || undefined,
    contactoId: formData.get("contactoId") || undefined,
    notas: formData.get("notas") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const fecha = new Date(parsed.data.fecha);
  if (isNaN(fecha.getTime())) return { error: "Fecha inválida." };

  if (parsed.data.propiedadId) {
    const [p] = await db
      .select({ id: propiedades.id })
      .from(propiedades)
      .where(eq(propiedades.id, parsed.data.propiedadId));
    if (!p) return { error: "Propiedad no encontrada." };
  }
  if (parsed.data.contactoId) {
    const [c] = await db
      .select({ id: contactos.id })
      .from(contactos)
      .where(eq(contactos.id, parsed.data.contactoId));
    if (!c) return { error: "Contacto no encontrado." };
  }

  try {
    await db.insert(actividades).values({
      tipo: parsed.data.tipo,
      titulo: parsed.data.titulo,
      fecha,
      lugar: parsed.data.lugar || null,
      propiedadId: parsed.data.propiedadId || null,
      contactoId: parsed.data.contactoId || null,
      notas: parsed.data.notas || null,
      agenteId: sesion.userId,
    });
  } catch {
    return {
      error:
        "No se pudo guardar. Si es la primera vez, falta ejecutar la migración de la base de datos (/admin/migrar).",
    };
  }

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function cambiarEstadoActividad(
  actividadId: string,
  estado: EstadoActividad,
  resultado?: string
) {
  if (!ESTADOS_ACTIVIDAD.includes(estado)) {
    throw new Error("Estado inválido.");
  }
  await requerirActividadDelAgente(actividadId);

  await db
    .update(actividades)
    .set({ estado, resultado: resultado?.trim() || null })
    .where(eq(actividades.id, actividadId));

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

export async function eliminarActividad(actividadId: string) {
  await requerirActividadDelAgente(actividadId);

  await db.delete(actividades).where(eq(actividades.id, actividadId));

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}
