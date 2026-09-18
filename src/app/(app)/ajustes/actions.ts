"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { configuracionEmpresa } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";

const LOGO_MAX_BYTES = 5 * 1024 * 1024;

const ConfiguracionSchema = z.object({
  nombreCrm: z.string().min(1, "Ingresá un nombre para el CRM"),
  nombreEmpresa: z.string().optional(),
  filosofia: z.string().optional(),
  colorPrimario: z.string().optional(),
  colorSecundario: z.string().optional(),
  sistemaComisiones: z.string().optional(),
  telefonoEmpresa: z.string().optional(),
  emailEmpresa: z.string().optional(),
  direccion: z.string().optional(),
});

export type ConfiguracionState = { error?: string; ok?: number };

/** Devuelve la fila singleton, creándola si todavía no existe (defensivo:
 * la migración ya la siembra, pero por si se guarda antes de correrla). */
export async function obtenerConfiguracion() {
  const [config] = await db.select().from(configuracionEmpresa).limit(1);
  if (config) return config;

  const [nueva] = await db
    .insert(configuracionEmpresa)
    .values({ nombreCrm: "Orion" })
    .returning();
  return nueva;
}

export async function guardarConfiguracion(
  _prevState: ConfiguracionState,
  formData: FormData
): Promise<ConfiguracionState> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };
  if (!esAdmin(sesion.rol)) {
    return { error: "No tenés permisos para modificar la configuración de la cuenta." };
  }

  const parsed = ConfiguracionSchema.safeParse({
    nombreCrm: formData.get("nombreCrm"),
    nombreEmpresa: formData.get("nombreEmpresa") || undefined,
    filosofia: formData.get("filosofia") || undefined,
    colorPrimario: formData.get("colorPrimario") || undefined,
    colorSecundario: formData.get("colorSecundario") || undefined,
    sistemaComisiones: formData.get("sistemaComisiones") || undefined,
    telefonoEmpresa: formData.get("telefonoEmpresa") || undefined,
    emailEmpresa: formData.get("emailEmpresa") || undefined,
    direccion: formData.get("direccion") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const config = await obtenerConfiguracion();

  // Logo: mismo patrón que las fotos de propiedades (data URI base64 en la
  // base, sin storage externo). Es opcional — si no se elige archivo nuevo,
  // se conserva el logo actual.
  let logo = config.logo;
  const archivo = formData.get("logo");
  if (archivo instanceof File && archivo.size > 0) {
    if (!archivo.type.startsWith("image/")) {
      return { error: "El logo tiene que ser una imagen." };
    }
    if (archivo.size > LOGO_MAX_BYTES) {
      return { error: "El logo pesa más de 5MB." };
    }
    const buffer = Buffer.from(await archivo.arrayBuffer());
    logo = `data:${archivo.type};base64,${buffer.toString("base64")}`;
  }
  if (formData.get("quitarLogo") === "1") {
    logo = null;
  }

  await db
    .update(configuracionEmpresa)
    .set({
      nombreCrm: parsed.data.nombreCrm,
      nombreEmpresa: parsed.data.nombreEmpresa ?? null,
      filosofia: parsed.data.filosofia ?? null,
      colorPrimario: parsed.data.colorPrimario ?? null,
      colorSecundario: parsed.data.colorSecundario ?? null,
      logo,
      sistemaComisiones: parsed.data.sistemaComisiones ?? null,
      telefonoEmpresa: parsed.data.telefonoEmpresa ?? null,
      emailEmpresa: parsed.data.emailEmpresa ?? null,
      direccion: parsed.data.direccion ?? null,
      actualizadoEn: sql`now()`,
      actualizadoPorId: sesion.userId,
    })
    .where(eq(configuracionEmpresa.id, config.id));

  revalidatePath("/ajustes");
  revalidatePath("/", "layout");
  return { ok: Date.now() };
}
