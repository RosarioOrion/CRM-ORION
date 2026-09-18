"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";

const PerfilSchema = z.object({
  nombre: z.string().min(2, "Ingresá tu nombre completo"),
  telefono: z.string().optional(),
  descripcion: z.string().optional(),
});

export type PerfilState = { error?: string; ok?: number };

export async function actualizarPerfil(
  _prevState: PerfilState,
  formData: FormData
): Promise<PerfilState> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };

  const parsed = PerfilSchema.safeParse({
    nombre: formData.get("nombre"),
    telefono: formData.get("telefono") || undefined,
    descripcion: formData.get("descripcion") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await db
    .update(usuarios)
    .set({
      nombre: parsed.data.nombre,
      telefono: parsed.data.telefono ?? null,
      descripcion: parsed.data.descripcion ?? null,
    })
    .where(eq(usuarios.id, sesion.userId));

  revalidatePath("/perfil");
  revalidatePath("/admin/usuarios");
  return { ok: Date.now() };
}

const PasswordSchema = z
  .object({
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmar: z.string(),
  })
  .refine((data) => data.password === data.confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar"],
  });

export type PasswordState = { error?: string; ok?: number };

export async function cambiarPassword(
  _prevState: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };

  const parsed = PasswordSchema.safeParse({
    password: formData.get("password"),
    confirmar: formData.get("confirmar"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await db
    .update(usuarios)
    .set({ passwordHash })
    .where(eq(usuarios.id, sesion.userId));

  revalidatePath("/perfil");
  return { ok: Date.now() };
}
