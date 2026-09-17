"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { busquedas, propiedades, contactos, coincidenciasAvisadas } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";

async function requerirParDelAgente(busquedaId: string, propiedadId: string) {
  const sesion = await obtenerSesion();
  if (!sesion) throw new Error("Sesión expirada, volvé a ingresar.");

  const [busq] = await db
    .select({ id: busquedas.id, agenteId: contactos.agenteId })
    .from(busquedas)
    .innerJoin(contactos, eq(busquedas.contactoId, contactos.id))
    .where(eq(busquedas.id, busquedaId));
  if (!busq || busq.agenteId !== sesion.userId) {
    throw new Error("Búsqueda no encontrada.");
  }

  const [prop] = await db
    .select({ id: propiedades.id, agenteId: propiedades.agenteId })
    .from(propiedades)
    .where(eq(propiedades.id, propiedadId));
  if (!prop || prop.agenteId !== sesion.userId) {
    throw new Error("Propiedad no encontrada.");
  }

  return sesion;
}

export async function marcarCoincidenciaAvisada(
  busquedaId: string,
  propiedadId: string,
  nota?: string
) {
  const sesion = await requerirParDelAgente(busquedaId, propiedadId);

  await db.insert(coincidenciasAvisadas).values({
    busquedaId,
    propiedadId,
    agenteId: sesion.userId,
    nota: nota || null,
  });

  revalidatePath("/coincidencias");
}

export async function quitarAvisoCoincidencia(avisoId: string) {
  const sesion = await obtenerSesion();
  if (!sesion) throw new Error("Sesión expirada, volvé a ingresar.");

  const [aviso] = await db
    .select({ id: coincidenciasAvisadas.id, agenteId: coincidenciasAvisadas.agenteId })
    .from(coincidenciasAvisadas)
    .where(eq(coincidenciasAvisadas.id, avisoId));
  if (!aviso || aviso.agenteId !== sesion.userId) {
    throw new Error("Aviso no encontrado.");
  }

  await db
    .delete(coincidenciasAvisadas)
    .where(
      and(eq(coincidenciasAvisadas.id, avisoId), eq(coincidenciasAvisadas.agenteId, sesion.userId))
    );

  revalidatePath("/coincidencias");
}
