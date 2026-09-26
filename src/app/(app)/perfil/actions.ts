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
    passwordActual: z.string().min(1, "Ingresá tu contraseña actual"),
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
    passwordActual: formData.get("passwordActual"),
    password: formData.get("password"),
    confirmar: formData.get("confirmar"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const [usuario] = await db
    .select({ passwordHash: usuarios.passwordHash })
    .from(usuarios)
    .where(eq(usuarios.id, sesion.userId));
  if (!usuario) return { error: "Sesión expirada, volvé a ingresar." };

  const actualOk = await bcrypt.compare(parsed.data.passwordActual, usuario.passwordHash);
  if (!actualOk) {
    return { error: "La contraseña actual no es correcta." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await db
    .update(usuarios)
    .set({ passwordHash })
    .where(eq(usuarios.id, sesion.userId));

  revalidatePath("/perfil");
  return { ok: Date.now() };
}

const EmailSchema = z.object({
  email: z.string().trim().email("Ingresá un email válido"),
  passwordActual: z.string().min(1, "Ingresá tu contraseña actual"),
});

export type EmailState = { error?: string; ok?: number; email?: string };

// Cambiar el email con el que se entra a Orion. Pide la contraseña actual
// para confirmar que es la dueña de la cuenta.
export async function cambiarEmail(
  _prevState: EmailState,
  formData: FormData
): Promise<EmailState> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };

  const parsed = EmailSchema.safeParse({
    email: formData.get("email"),
    passwordActual: formData.get("passwordActual"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const email = parsed.data.email.toLowerCase();

  const [usuario] = await db
    .select({ passwordHash: usuarios.passwordHash, email: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.id, sesion.userId));
  if (!usuario) return { error: "Sesión expirada, volvé a ingresar." };

  const actualOk = await bcrypt.compare(parsed.data.passwordActual, usuario.passwordHash);
  if (!actualOk) return { error: "La contraseña actual no es correcta." };

  if (email === usuario.email) return { error: "Ese ya es tu email actual." };

  const [otro] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, email));
  if (otro) return { error: "Ya existe otra cuenta con ese email." };

  await db.update(usuarios).set({ email }).where(eq(usuarios.id, sesion.userId));

  revalidatePath("/perfil");
  revalidatePath("/admin/usuarios");
  return { ok: Date.now(), email };
}
