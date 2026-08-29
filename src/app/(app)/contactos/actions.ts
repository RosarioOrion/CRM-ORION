"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { contactos } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";

const ContactoSchema = z.object({
  nombre: z.string().min(2, "Ingresá un nombre"),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  notas: z.string().optional(),
});

export type ContactoState = { error?: string };

export async function crearContacto(
  _prevState: ContactoState,
  formData: FormData
): Promise<ContactoState> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };

  const parsed = ContactoSchema.safeParse({
    nombre: formData.get("nombre"),
    telefono: formData.get("telefono") || undefined,
    email: formData.get("email") || undefined,
    notas: formData.get("notas") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await db.insert(contactos).values({
    ...parsed.data,
    email: parsed.data.email || null,
    agenteId: sesion.userId,
  });

  revalidatePath("/contactos");
  return {};
}
