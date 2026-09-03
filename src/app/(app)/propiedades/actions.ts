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
  tipo: z.string().min(2, "Ingresá el tipo (casa, apartamento, etc.)"),
  zona: z.string().min(2, "Ingresá la zona"),
  precio: z.coerce.number().optional(),
  moneda: z.enum(["USD", "UYU"]).default("USD"),
  duenoId: z.string().min(1, "Elegí el contacto dueño"),
});

export type PropiedadState = { error?: string };

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
    precio: formData.get("precio") || undefined,
    moneda: formData.get("moneda") || "USD",
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
    precio: parsed.data.precio ?? null,
    moneda: parsed.data.moneda,
    duenoId: parsed.data.duenoId,
    agenteId: sesion.userId,
  });

  revalidatePath("/propiedades");
  return {};
}
