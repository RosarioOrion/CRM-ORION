"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";

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

  revalidatePath("/ajustes");
  return { ok: Date.now() };
}
