"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { contactos, propiedades, busquedas, seguimientos } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { ahoraUY } from "@/lib/calendario";
import { esCanal, estadoSeguimiento, DIAS_ENTRE_SEGUIMIENTOS } from "@/lib/seguimientos";

async function miContacto(contactoId: string) {
  const sesion = await obtenerSesion();
  if (!sesion) throw new Error("Sesión expirada, volvé a ingresar.");
  const [c] = await db.select().from(contactos).where(eq(contactos.id, contactoId));
  if (!c || c.agenteId !== sesion.userId) throw new Error("Contacto no encontrado.");
  return { c, yo: sesion.userId };
}

export type SeguimientoState = { error?: string; ok?: number };

/** Registrar un seguimiento (llamada, WhatsApp...) y cuándo es el próximo. */
export async function registrarSeguimiento(
  _prev: SeguimientoState,
  formData: FormData
): Promise<SeguimientoState> {
  const contactoId = String(formData.get("contactoId") ?? "");
  let c, yo;
  try {
    ({ c, yo } = await miContacto(contactoId));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No autorizado." };
  }

  const canal = String(formData.get("canal") ?? "");
  if (!esCanal(canal)) return { error: "Elegí cómo fue el contacto." };
  const r = String(formData.get("respondio") ?? "");
  if (r !== "si" && r !== "no") return { error: "Indicá si respondió o no." };
  const respondio = r === "si";
  const nota = String(formData.get("nota") ?? "").trim() || null;
  const propiedadId = String(formData.get("propiedadId") ?? "") || null;

  // Próximo seguimiento: el que eligió el agente, o en 7 días.
  const ahora = ahoraUY();
  const proxStr = String(formData.get("proximaFecha") ?? "");
  let proximaFecha: Date | null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(proxStr)) {
    const [y, m, d] = proxStr.split("-").map(Number);
    proximaFecha = new Date(y, m - 1, d, 10, 0);
  } else {
    proximaFecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + DIAS_ENTRE_SEGUIMIENTOS, 10, 0);
  }
  if (formData.get("sinProximo") === "1") proximaFecha = null;

  // ¿Este es el aviso final? (el 3º seguido sin respuesta)
  const previos = await db
    .select({
      fecha: seguimientos.fecha,
      respondio: seguimientos.respondio,
      avisoFinal: seguimientos.avisoFinal,
      proximaFecha: seguimientos.proximaFecha,
    })
    .from(seguimientos)
    .where(eq(seguimientos.contactoId, contactoId));
  const est = estadoSeguimiento(previos, c.frioDesde, ahora);
  const avisoFinal =
    !respondio && est.tipo === "SIN_RESPUESTA" && est.siguienteEsAviso && formData.get("esAviso") === "1";

  // Hora de Uruguay con segundos, para que dos seguimientos cargados en el
  // mismo minuto queden en el orden correcto.
  const real = new Date();
  const fecha = new Date(ahora.getTime() + real.getSeconds() * 1000 + real.getMilliseconds());

  await db.insert(seguimientos).values({
    contactoId,
    propiedadId,
    agenteId: yo,
    fecha,
    canal,
    respondio,
    avisoFinal,
    nota,
    proximaFecha,
  });

  // Respondió: deja de estar frío.
  if (respondio && c.frioDesde) {
    await db.update(contactos).set({ frioDesde: null }).where(eq(contactos.id, contactoId));
  }

  revalidatePath(`/contactos/${contactoId}`);
  revalidatePath("/contactos");
  revalidatePath("/dashboard");
  return { ok: Date.now() };
}

/**
 * No respondió al aviso final: marcar frío y (con confirmación del agente)
 * suspender las propiedades elegidas y pausar las búsquedas elegidas.
 */
export async function marcarFrio(
  contactoId: string,
  propiedadIds: string[],
  busquedaIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  let yo;
  try {
    ({ yo } = await miContacto(contactoId));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado." };
  }
  await db.transaction(async (tx) => {
    await tx.update(contactos).set({ frioDesde: ahoraUY() }).where(eq(contactos.id, contactoId));
    if (propiedadIds.length)
      await tx
        .update(propiedades)
        .set({ estado: "PAUSADA" })
        .where(
          and(
            inArray(propiedades.id, propiedadIds),
            eq(propiedades.duenoId, contactoId),
            eq(propiedades.agenteId, yo)
          )
        );
    if (busquedaIds.length)
      await tx
        .update(busquedas)
        .set({ activa: false })
        .where(and(inArray(busquedas.id, busquedaIds), eq(busquedas.contactoId, contactoId)));
  });
  revalidatePath(`/contactos/${contactoId}`);
  revalidatePath("/contactos");
  revalidatePath("/propiedades");
  revalidatePath("/busquedas");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Borrar un seguimiento cargado por error. */
export async function borrarSeguimiento(seguimientoId: string, contactoId: string) {
  const { yo } = await miContacto(contactoId);
  await db
    .delete(seguimientos)
    .where(
      and(
        eq(seguimientos.id, seguimientoId),
        eq(seguimientos.contactoId, contactoId),
        eq(seguimientos.agenteId, yo)
      )
    );
  revalidatePath(`/contactos/${contactoId}`);
  revalidatePath("/contactos");
}
