"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { crearSesion, obtenerSesion } from "@/lib/auth";

// "Entrar como" (solo la CEO): usar Orion con el usuario de otra persona,
// para corregir errores o probar cargando datos a su nombre. Lo que se hace
// mientras tanto queda a nombre de ese usuario. Se vuelve con "Volver a mi
// usuario" (aviso arriba de todas las pantallas).

export async function entrarComo(usuarioId: string): Promise<{ error?: string }> {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "CEO" || sesion.suplantadoPor) return { error: "Solo la CEO puede entrar como otro usuario." };
  if (usuarioId === sesion.userId) return { error: "Ya estás en tu usuario." };
  const [u] = await db
    .select({ id: usuarios.id, nombre: usuarios.nombre, rol: usuarios.rol, activo: usuarios.activo, aprobado: usuarios.aprobado })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId));
  if (!u || !u.activo || !u.aprobado) return { error: "Ese usuario no está activo." };
  if (u.rol === "CEO") return { error: "No se puede entrar como CEO." };
  // Sin "recordar": si se cierra el navegador, se cierra la sesión.
  await crearSesion({ userId: u.id, nombre: u.nombre, rol: u.rol, suplantadoPor: sesion.userId }, false);
  redirect("/dashboard");
}

export async function volverAMiUsuario() {
  const sesion = await obtenerSesion();
  if (!sesion?.suplantadoPor) redirect("/dashboard");
  const [ceo] = await db
    .select({ id: usuarios.id, nombre: usuarios.nombre, rol: usuarios.rol })
    .from(usuarios)
    .where(eq(usuarios.id, sesion.suplantadoPor));
  if (!ceo || ceo.rol !== "CEO") redirect("/login");
  await crearSesion({ userId: ceo.id, nombre: ceo.nombre, rol: ceo.rol });
  redirect("/admin/usuarios");
}
