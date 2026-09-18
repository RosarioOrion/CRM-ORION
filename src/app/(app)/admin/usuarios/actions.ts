"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";

async function requerirAdmin() {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion.rol)) {
    throw new Error("No autorizado.");
  }
  return sesion;
}

export async function aprobarUsuario(usuarioId: string) {
  await requerirAdmin();
  await db
    .update(usuarios)
    .set({ aprobado: true })
    .where(eq(usuarios.id, usuarioId));
  revalidatePath("/admin/usuarios");
}

export async function rechazarUsuario(usuarioId: string) {
  await requerirAdmin();
  // Una solicitud rechazada no tiene por qué quedar en la base: nunca
  // tuvo acceso real, así que se elimina directamente.
  await db.delete(usuarios).where(eq(usuarios.id, usuarioId));
  revalidatePath("/admin/usuarios");
}

const ROLES = ["AGENTE", "TEAM_LEADER", "ADMINISTRADOR"] as const;

export async function cambiarRolUsuario(usuarioId: string, rol: string) {
  const sesion = await requerirAdmin();
  if (!ROLES.includes(rol as (typeof ROLES)[number])) return;
  if (usuarioId === sesion.userId) {
    // No te podés bajar de rango a vos mismo por accidente desde acá.
    return;
  }
  await db
    .update(usuarios)
    .set({ rol: rol as (typeof ROLES)[number] })
    .where(eq(usuarios.id, usuarioId));
  revalidatePath("/admin/usuarios");
}

const NIVELES_COMISION = ["AGENTE_JUNIOR", "ASESOR", "EJECUTIVO"] as const;

export async function cambiarNivelComisionUsuario(usuarioId: string, nivel: string) {
  await requerirAdmin();
  if (!NIVELES_COMISION.includes(nivel as (typeof NIVELES_COMISION)[number])) return;
  await db
    .update(usuarios)
    .set({ nivelComision: nivel as (typeof NIVELES_COMISION)[number] })
    .where(eq(usuarios.id, usuarioId));
  revalidatePath("/admin/usuarios");
}

export async function cambiarEstadoUsuario(usuarioId: string, activo: boolean) {
  const sesion = await requerirAdmin();
  if (usuarioId === sesion.userId) {
    // No te podés desactivar a vos misma por accidente desde acá.
    return;
  }
  await db
    .update(usuarios)
    .set({ activo })
    .where(eq(usuarios.id, usuarioId));
  revalidatePath("/admin/usuarios");
}

const NuevoUsuarioSchema = z.object({
  nombre: z.string().min(2, "Ingresá el nombre"),
  email: z.string().email("Ingresá un email válido"),
  telefono: z.string().optional(),
  descripcion: z.string().optional(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  rol: z.enum(ROLES),
});

export type NuevoUsuarioState = { error?: string; ok?: number };

export async function crearUsuarioAdmin(
  _prevState: NuevoUsuarioState,
  formData: FormData
): Promise<NuevoUsuarioState> {
  try {
    await requerirAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No autorizado." };
  }

  const parsed = NuevoUsuarioSchema.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    telefono: formData.get("telefono") || undefined,
    descripcion: formData.get("descripcion") || undefined,
    password: formData.get("password"),
    rol: formData.get("rol") || "AGENTE",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const [existente] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1);
  if (existente) {
    return { error: "Ya existe una cuenta con ese email." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await db.insert(usuarios).values({
    nombre: parsed.data.nombre,
    email,
    telefono: parsed.data.telefono ?? null,
    descripcion: parsed.data.descripcion ?? null,
    passwordHash,
    rol: parsed.data.rol,
    aprobado: true,
  });

  revalidatePath("/admin/usuarios");
  return { ok: Date.now() };
}
