"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";

const RegistroSchema = z
  .object({
    nombre: z.string().min(2, "Ingresá tu nombre completo"),
    email: z.string().email("Ingresá un email válido"),
    telefono: z.string().min(6, "Ingresá un teléfono de contacto"),
    descripcion: z
      .string()
      .min(10, "Contanos un poco más sobre vos (mínimo 10 caracteres)"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmar: z.string(),
  })
  .refine((data) => data.password === data.confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar"],
  });

export type RegistroState = { error?: string; ok?: boolean };

export async function crearCuenta(
  _prevState: RegistroState,
  formData: FormData
): Promise<RegistroState> {
  const parsed = RegistroSchema.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    telefono: formData.get("telefono"),
    descripcion: formData.get("descripcion"),
    password: formData.get("password"),
    confirmar: formData.get("confirmar"),
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
    telefono: parsed.data.telefono,
    descripcion: parsed.data.descripcion,
    passwordHash,
    rol: "AGENTE",
    aprobado: false,
  });

  return { ok: true };
}
