"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { propiedades } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";

const PropiedadSchema = z.object({
  titulo: z.string().min(3, "Ingresá un título"),
  operacion: z.enum(["VENTA", "ALQUILER"]),
  tipo: z.string().min(2, "Elegí el tipo de propiedad"),
  zona: z.string().min(2, "Ingresá la zona"),
  direccion: z.string().optional(),
  departamento: z.string().optional(),
  precio: z.coerce.number().optional(),
  moneda: z.enum(["USD", "UYU"]).default("USD"),
  m2Cubiertos: z.coerce.number().optional(),
  m2Terreno: z.coerce.number().optional(),
  hectareas: z.coerce.number().optional(),
  dormitorios: z.coerce.number().optional(),
  banos: z.coerce.number().optional(),
  estadoEdilicio: z.string().optional(),
  extras: z.array(z.string()).optional(),
  descripcion: z.string().optional(),
  duenoId: z.string().min(1, "Elegí el contacto dueño"),
});

export type PropiedadState = { error?: string; ok?: number };

async function generarCodigo() {
  const [{ total }] = await db.select({ total: count() }).from(propiedades);
  const siguiente = total + 1;
  return `OR${String(siguiente).padStart(3, "0")}`;
}

export async function crearPropiedad(
  _prevState: PropiedadState,
  formData: FormData
): Promise<PropiedadState> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };

  const parsed = PropiedadSchema.safeParse({
    titulo: formData.get("titulo"),
    operacion: formData.get("operacion"),
    tipo: formData.get("tipo"),
    zona: formData.get("zona"),
    direccion: formData.get("direccion") || undefined,
    departamento: formData.get("departamento") || undefined,
    precio: formData.get("precio") || undefined,
    moneda: formData.get("moneda") || "USD",
    m2Cubiertos: formData.get("m2Cubiertos") || undefined,
    m2Terreno: formData.get("m2Terreno") || undefined,
    hectareas: formData.get("hectareas") || undefined,
    dormitorios: formData.get("dormitorios") || undefined,
    banos: formData.get("banos") || undefined,
    estadoEdilicio: formData.get("estadoEdilicio") || undefined,
    extras: formData.getAll("extras"),
    descripcion: formData.get("descripcion") || undefined,
    duenoId: formData.get("duenoId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const codigo = await generarCodigo();

  await db.insert(propiedades).values({
    codigo,
    titulo: parsed.data.titulo,
    operacion: parsed.data.operacion,
    tipo: parsed.data.tipo,
    zona: parsed.data.zona,
    direccion: parsed.data.direccion ?? null,
    departamento: parsed.data.departamento ?? null,
    precio: parsed.data.precio ?? null,
    moneda: parsed.data.moneda,
    m2Cubiertos: parsed.data.m2Cubiertos ?? null,
    m2Terreno: parsed.data.m2Terreno ?? null,
    hectareas: parsed.data.hectareas ?? null,
    dormitorios: parsed.data.dormitorios ?? null,
    banos: parsed.data.banos ?? null,
    estadoEdilicio: parsed.data.estadoEdilicio ?? null,
    extras: parsed.data.extras ?? [],
    descripcion: parsed.data.descripcion ?? null,
    duenoId: parsed.data.duenoId,
    agenteId: sesion.userId,
  });

  revalidatePath("/propiedades");
  return { ok: Date.now() };
}
