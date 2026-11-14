import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";

const COOKIE_NAME = "orion_session";
const secretKey = process.env.AUTH_SECRET || "dev-secret-change-me";
const key = new TextEncoder().encode(secretKey);

export type SessionPayload = {
  userId: string;
  nombre: string;
  rol: "AGENTE" | "TEAM_LEADER" | "ADMINISTRADOR" | "CEO";
};

// recordar = true: la sesión dura 30 días en ese dispositivo.
// recordar = false: la sesión se cierra al cerrar el navegador.
export async function crearSesion(payload: SessionPayload, recordar = true) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(recordar ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
}

/**
 * Usuario logueado. El rol y el nombre se leen de la base en cada pedido (no
 * del token), así un cambio de rol o una baja se aplican al momento sin
 * volver a entrar; un usuario desactivado queda afuera.
 */
export const obtenerSesion = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  let payload: SessionPayload;
  try {
    payload = (await jwtVerify(token, key)).payload as unknown as SessionPayload;
  } catch {
    return null;
  }
  const [u] = await db
    .select({ nombre: usuarios.nombre, rol: usuarios.rol, activo: usuarios.activo, aprobado: usuarios.aprobado })
    .from(usuarios)
    .where(eq(usuarios.id, payload.userId));
  if (!u || !u.activo || !u.aprobado) return null;
  return { userId: payload.userId, nombre: u.nombre, rol: u.rol };
});

export async function cerrarSesion() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}


export { COOKIE_NAME };
