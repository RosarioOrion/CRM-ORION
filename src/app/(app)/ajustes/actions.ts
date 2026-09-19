"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { configuracionEmpresa, nivelesComision } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { obtenerNivelesComision } from "@/lib/comisiones";

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

// Escalafón de comisiones (niveles_comision) — a propósito editable acá en
// vez de un enum fijo en el código, para que se puedan agregar escalones y
// metas nuevas sin pedir un cambio de código. Ver src/lib/comisiones.ts.

function claveDesdeNombre(nombre: string, existentes: string[]): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // sacar acentos
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  let clave = base || "NIVEL";
  let i = 2;
  while (existentes.includes(clave)) {
    clave = `${base}_${i}`;
    i++;
  }
  return clave;
}

export type NivelState = { error?: string; ok?: number };

export async function crearNivelComision(
  _prevState: NivelState,
  formData: FormData
): Promise<NivelState> {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion.rol)) return { error: "No autorizado." };

  const nombre = String(formData.get("nombre") || "").trim();
  const facturacionMinima = Math.round(Number(formData.get("facturacionMinima")) || 0);
  const porcentaje = Number(formData.get("porcentaje"));

  if (!nombre) return { error: "Ingresá el nombre del escalón." };
  if (!porcentaje || porcentaje <= 0 || porcentaje > 100) {
    return { error: "El porcentaje tiene que ser un número entre 1 y 100." };
  }

  const existentes = await db.select({ clave: nivelesComision.clave }).from(nivelesComision);
  const clave = claveDesdeNombre(nombre, existentes.map((e) => e.clave));

  await db.insert(nivelesComision).values({
    clave,
    nombre,
    facturacionMinima: Math.max(0, facturacionMinima),
    porcentaje,
  });

  revalidatePath("/ajustes");
  revalidatePath("/admin/usuarios");
  return { ok: Date.now() };
}

export async function actualizarNivelComision(
  nivelId: string,
  datos: { nombre: string; facturacionMinima: number; porcentaje: number }
) {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion.rol)) throw new Error("No autorizado.");

  await db
    .update(nivelesComision)
    .set({
      nombre: datos.nombre,
      facturacionMinima: Math.max(0, Math.round(datos.facturacionMinima)),
      porcentaje: datos.porcentaje,
    })
    .where(eq(nivelesComision.id, nivelId));

  revalidatePath("/ajustes");
  revalidatePath("/admin/usuarios");
}

export async function eliminarNivelComision(nivelId: string) {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion.rol)) throw new Error("No autorizado.");

  const restantes = await obtenerNivelesComision();
  if (restantes.length <= 1) {
    // Siempre tiene que quedar al menos un escalón — si no, ningún agente
    // nuevo tendría nivel de comisión válido para asignar.
    return;
  }

  await db.delete(nivelesComision).where(eq(nivelesComision.id, nivelId));
  revalidatePath("/ajustes");
  revalidatePath("/admin/usuarios");
}
