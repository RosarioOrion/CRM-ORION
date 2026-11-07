"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { contactos, propiedades, seguimientos } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { ahoraUY } from "@/lib/calendario";
import { estadoSeguimiento } from "@/lib/seguimientos";
import { aplicarAjustePrecio, registrarSeguimientoSemanal } from "@/lib/seguimiento-registro";

// Acciones de las tarjetas de seguimiento del "Plan del día" (Inicio). Usan
// el mismo registro que el "Seguimiento del lunes" del Pipeline.

export type RespuestaPlan = "DISPONIBLE" | "NO_DISPONIBLE" | "CAMBIO_PRECIO" | "NO_RESPONDIO";
const RESPUESTAS: RespuestaPlan[] = ["DISPONIBLE", "NO_DISPONIBLE", "CAMBIO_PRECIO", "NO_RESPONDIO"];

async function contactoYPropiedades(contactoId: string) {
  const sesion = await obtenerSesion();
  if (!sesion) throw new Error("Sesión expirada, volvé a ingresar.");
  const [c] = await db.select().from(contactos).where(eq(contactos.id, contactoId));
  if (!c || c.agenteId !== sesion.userId) throw new Error("Contacto no encontrado.");
  const props = await db
    .select()
    .from(propiedades)
    .where(
      and(eq(propiedades.duenoId, contactoId), eq(propiedades.agenteId, sesion.userId), eq(propiedades.estado, "ACTIVA"))
    );
  return { c, props, yo: sesion.userId };
}

function revalidar(contactoId: string, propiedadIds: string[]) {
  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
  revalidatePath("/contactos");
  revalidatePath(`/contactos/${contactoId}`);
  for (const id of propiedadIds) revalidatePath(`/propiedades/${id}`);
}

/** "Enviar": se abrió WhatsApp con el mensaje; queda como seguimiento sin respuesta todavía. */
export async function enviarSeguimientoPlan(contactoId: string): Promise<{ error?: string; ok?: boolean }> {
  let datos;
  try {
    datos = await contactoYPropiedades(contactoId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No autorizado." };
  }
  const { c, props, yo } = datos;

  // El aviso final se decide acá (no lo que diga la pantalla): el 3º seguido sin respuesta.
  const previos = await db
    .select({
      fecha: seguimientos.fecha,
      respondio: seguimientos.respondio,
      avisoFinal: seguimientos.avisoFinal,
      proximaFecha: seguimientos.proximaFecha,
    })
    .from(seguimientos)
    .where(eq(seguimientos.contactoId, contactoId));
  const est = estadoSeguimiento(previos, c.frioDesde, ahoraUY());
  if (est.tipo === "FRIO" || est.tipo === "NO_RESPONDIO_AVISO") {
    return { error: "Este contacto ya no respondió el aviso final: decidí desde su ficha si queda frío." };
  }
  const avisoFinal = est.tipo === "SIN_RESPUESTA" && est.siguienteEsAviso;

  await registrarSeguimientoSemanal({
    agenteId: yo,
    contactoId,
    props,
    respondio: false,
    avisoFinal,
    nota: avisoFinal ? "Aviso final enviado desde el Plan del día" : "Mensaje semanal enviado desde el Plan del día",
    tarea: props.length ? "Seguimiento al dueño — mensaje enviado" : undefined,
  });
  revalidar(contactoId, props.map((p) => p.id));
  return { ok: true };
}

/** "¿Qué respondió?" + Guardar. */
export async function responderSeguimientoPlan(
  contactoId: string,
  respuesta: RespuestaPlan,
  cambio?: { propiedadId: string; precio: number; moneda: "USD" | "UYU" }
): Promise<{ error?: string; ok?: boolean }> {
  if (!RESPUESTAS.includes(respuesta)) return { error: "Elegí qué respondió." };
  let datos;
  try {
    datos = await contactoYPropiedades(contactoId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No autorizado." };
  }
  const { props, yo } = datos;

  if (respuesta === "NO_RESPONDIO") {
    await registrarSeguimientoSemanal({
      agenteId: yo,
      contactoId,
      props,
      respondio: false,
      nota: "No respondió",
      tarea: props.length ? "Seguimiento al dueño — sin respuesta" : undefined,
    });
    revalidar(contactoId, props.map((p) => p.id));
    return { ok: true };
  }

  let nota = respuesta === "DISPONIBLE" ? "Sigue disponible" : "Ya no está disponible";
  if (respuesta === "CAMBIO_PRECIO") {
    const prop = props.find((p) => p.id === cambio?.propiedadId);
    if (!prop) return { error: "Elegí la propiedad que cambió de precio." };
    const precio = Math.round(Number(cambio?.precio));
    if (!Number.isFinite(precio) || precio <= 0) return { error: "Ingresá el precio nuevo." };
    const moneda = cambio?.moneda === "UYU" ? "UYU" : "USD";
    await aplicarAjustePrecio(prop.id, precio, moneda, yo);
    nota = `Cambió el precio de ${prop.codigo}: ${moneda} ${precio.toLocaleString("es-UY")}`;
  }

  await registrarSeguimientoSemanal({
    agenteId: yo,
    contactoId,
    props,
    respondio: true,
    nota,
    tarea: props.length ? "Seguimiento al dueño — respondió" : undefined,
  });

  // Ya no está disponible: sus propiedades pasan a Cerrada (dada de baja).
  if (respuesta === "NO_DISPONIBLE" && props.length) {
    await db
      .update(propiedades)
      .set({ estado: "CERRADA" })
      .where(and(inArray(propiedades.id, props.map((p) => p.id)), eq(propiedades.agenteId, yo)));
    revalidatePath("/propiedades");
  }
  if (respuesta === "CAMBIO_PRECIO") revalidatePath("/propiedades");

  revalidar(contactoId, props.map((p) => p.id));
  return { ok: true };
}
