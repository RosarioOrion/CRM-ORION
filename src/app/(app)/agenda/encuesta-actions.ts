"use server";

import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { contactos, encuestasVisita, propiedades, visitas } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { asegurarTablaEncuestas } from "@/lib/encuestas-db";
import { limpiarTitulo } from "@/lib/propiedades";
import { numeroWhatsApp } from "@/lib/seguimientos";

/**
 * Crea (o reutiliza) la encuesta de una visita y devuelve lo necesario para
 * mandarla por WhatsApp. El link se arma en el navegador con su dominio.
 */
export async function prepararEncuesta(visitaId: string): Promise<
  | { error: string }
  | { token: string; whatsapp: string; contactoNombre: string; propiedadTitulo: string }
> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };

  const [v] = await db
    .select({
      agenteId: visitas.agenteId,
      contactoNombre: contactos.nombre,
      contactoTelefono: contactos.telefono,
      propiedadTitulo: propiedades.titulo,
    })
    .from(visitas)
    .innerJoin(contactos, eq(visitas.contactoId, contactos.id))
    .innerJoin(propiedades, eq(visitas.propiedadId, propiedades.id))
    .where(eq(visitas.id, visitaId));
  if (!v || v.agenteId !== sesion.userId) return { error: "Visita no encontrada." };

  const whatsapp = numeroWhatsApp(v.contactoTelefono);
  if (!whatsapp) {
    return { error: `${v.contactoNombre} no tiene un celular válido cargado. Agregalo en su ficha.` };
  }

  await asegurarTablaEncuestas();
  const [existente] = await db
    .select({ token: encuestasVisita.token })
    .from(encuestasVisita)
    .where(eq(encuestasVisita.visitaId, visitaId));
  let token = existente?.token;
  if (!token) {
    token = randomBytes(18).toString("base64url");
    await db.insert(encuestasVisita).values({ visitaId, token }).onConflictDoNothing();
    // Si justo se creó en paralelo, usar la que quedó guardada.
    const [guardada] = await db
      .select({ token: encuestasVisita.token })
      .from(encuestasVisita)
      .where(eq(encuestasVisita.visitaId, visitaId));
    token = guardada.token;
  }

  revalidatePath("/agenda");
  return {
    token,
    whatsapp,
    contactoNombre: v.contactoNombre,
    propiedadTitulo: limpiarTitulo(v.propiedadTitulo),
  };
}
