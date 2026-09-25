"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSuscripciones } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { obtenerVapid, enviarAUsuarios } from "@/lib/push";

export async function clavePublicaPush(): Promise<string> {
  const { publicKey } = await obtenerVapid();
  return publicKey;
}

export async function guardarSuscripcion(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<{ ok: boolean; error?: string }> {
  const sesion = await obtenerSesion();
  if (!sesion) return { ok: false, error: "Sesión expirada." };
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { ok: false, error: "Suscripción inválida." };
  }
  try {
    await db
      .insert(pushSuscripciones)
      .values({
        usuarioId: sesion.userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      })
      .onConflictDoUpdate({
        target: pushSuscripciones.endpoint,
        set: { usuarioId: sesion.userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      });
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "No se pudo guardar. Falta ejecutar la migración de la base de datos.",
    };
  }
}

export async function quitarSuscripcion(endpoint: string) {
  const sesion = await obtenerSesion();
  if (!sesion) return;
  await db
    .delete(pushSuscripciones)
    .where(and(eq(pushSuscripciones.endpoint, endpoint), eq(pushSuscripciones.usuarioId, sesion.userId)));
}

export async function enviarPrueba(): Promise<number> {
  const sesion = await obtenerSesion();
  if (!sesion) return 0;
  return enviarAUsuarios([sesion.userId], {
    title: "🔔 Recordatorios activados",
    body: "Así te va a avisar Orion 1 hora antes de cada actividad de tu Agenda.",
    url: "/agenda",
  });
}
