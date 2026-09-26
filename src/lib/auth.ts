import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "orion_session";
const secretKey = process.env.AUTH_SECRET || "dev-secret-change-me";
const key = new TextEncoder().encode(secretKey);

export type SessionPayload = {
  userId: string;
  nombre: string;
  rol: "AGENTE" | "TEAM_LEADER" | "ADMINISTRADOR";
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

export async function obtenerSesion(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function cerrarSesion() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Team Leader y Administrador tienen el mismo nivel de acceso "jefe":
// crear/aprobar usuarios, ver la actividad del equipo y usar las
// herramientas internas (como /admin/migrar).
export function esAdmin(rol: SessionPayload["rol"] | undefined | null) {
  return rol === "TEAM_LEADER" || rol === "ADMINISTRADOR";
}

export { COOKIE_NAME };
