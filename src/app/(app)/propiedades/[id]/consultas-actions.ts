"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { consultasPropiedad, propiedades } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { CANALES_CONSULTA } from "@/lib/consultas";

// "+ Consulta" en la ficha: cualquier agente puede anotar una consulta (la
// pueden recibir por una propiedad de un compañero); la borra quien la
// cargó o un team leader.

function revalidar(propiedadId: string) {
  revalidatePath(`/propiedades/${propiedadId}`);
  revalidatePath("/propiedades");
  revalidatePath("/dashboard");
}

export async function agregarConsulta(
  propiedadId: string,
  datos: { canal: string; nombre?: string; telefono?: string; nota?: string }
): Promise<{ error?: string; ok?: boolean }> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };
  if (!(CANALES_CONSULTA as readonly string[]).includes(datos.canal)) return { error: "Elegí por dónde llegó." };
  const [p] = await db.select({ id: propiedades.id }).from(propiedades).where(eq(propiedades.id, propiedadId));
  if (!p) return { error: "Propiedad no encontrada." };
  const limpio = (v?: string) => v?.trim().slice(0, 500) || null;
  await db.insert(consultasPropiedad).values({
    propiedadId,
    agenteId: sesion.userId,
    canal: datos.canal,
    nombre: limpio(datos.nombre),
    telefono: limpio(datos.telefono),
    nota: limpio(datos.nota),
  });
  revalidar(propiedadId);
  return { ok: true };
}

export async function eliminarConsulta(consultaId: string): Promise<{ error?: string; ok?: boolean }> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };
  const [c] = await db.select().from(consultasPropiedad).where(eq(consultasPropiedad.id, consultaId));
  if (!c) return { ok: true };
  if (c.agenteId !== sesion.userId && !esAdmin(sesion.rol)) return { error: "Solo la puede borrar quien la cargó." };
  await db.delete(consultasPropiedad).where(eq(consultasPropiedad.id, consultaId));
  revalidar(c.propiedadId);
  return { ok: true };
}
