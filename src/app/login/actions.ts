"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { crearSesion } from "@/lib/auth";

const LoginSchema = z.object({
  email: z.string().email("Ingresá un email válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export type LoginState = {
  error?: string;
};

export async function iniciarSesion(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { email, password } = parsed.data;

  const [usuario] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, email.toLowerCase().trim()))
    .limit(1);

  if (!usuario) {
    return { error: "Email o contraseña incorrectos" };
  }

  const passwordOk = await bcrypt.compare(password, usuario.passwordHash);
  if (!passwordOk) {
    return { error: "Email o contraseña incorrectos" };
  }

  await crearSesion({
    userId: usuario.id,
    nombre: usuario.nombre,
    rol: usuario.rol,
  });

  redirect("/dashboard");
}
