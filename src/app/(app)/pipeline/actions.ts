"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { propiedades, historialPrecios, pipelineAcciones } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { CATEGORIAS_PIPELINE, type CategoriaPipeline } from "@/lib/pipeline";

async function requerirPropiedadDelAgente(propiedadId: string) {
  const sesion = await obtenerSesion();
  if (!sesion) throw new Error("Sesión expirada, volvé a ingresar.");

  const [fila] = await db
    .select({ id: propiedades.id, agenteId: propiedades.agenteId })
    .from(propiedades)
    .where(eq(propiedades.id, propiedadId));

  if (!fila || fila.agenteId !== sesion.userId) {
    throw new Error("Propiedad no encontrada.");
  }
  return sesion;
}

/** Marca como hecha la acción sugerida de una categoría/semana para una propiedad. */
export async function registrarAccionPipeline(
  propiedadId: string,
  categoria: CategoriaPipeline,
  semana: number,
  descripcion: string,
  nota?: string
) {
  if (!CATEGORIAS_PIPELINE.includes(categoria)) {
    throw new Error("Categoría inválida.");
  }
  const sesion = await requerirPropiedadDelAgente(propiedadId);

  await db.insert(pipelineAcciones).values({
    propiedadId,
    agenteId: sesion.userId,
    categoria,
    semana,
    descripcion,
    nota: nota?.trim() || null,
  });

  revalidatePath("/pipeline");
}

const AjustePrecioSchema = z.object({
  precio: z.coerce.number().positive("Ingresá un precio válido"),
  moneda: z.enum(["USD", "UYU"]),
});

/** Registra un nuevo precio para la propiedad y deja el anterior en el historial. */
export async function registrarAjustePrecio(
  propiedadId: string,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const sesion = await requerirPropiedadDelAgente(propiedadId);

  const parsed = AjustePrecioSchema.safeParse({
    precio: formData.get("precio"),
    moneda: formData.get("moneda"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const [actual] = await db
    .select({ precio: propiedades.precio, moneda: propiedades.moneda })
    .from(propiedades)
    .where(eq(propiedades.id, propiedadId));

  await db.insert(historialPrecios).values({
    propiedadId,
    precioAnterior: actual?.precio ?? null,
    monedaAnterior: actual?.moneda ?? null,
    precioNuevo: parsed.data.precio,
    monedaNueva: parsed.data.moneda,
    agenteId: sesion.userId,
  });

  await db
    .update(propiedades)
    .set({ precio: parsed.data.precio, moneda: parsed.data.moneda })
    .where(eq(propiedades.id, propiedadId));

  revalidatePath("/pipeline");
  revalidatePath(`/propiedades/${propiedadId}`);
  revalidatePath("/propiedades");
  return { ok: true };
}

/** Corrige la fecha desde la que corre la cadencia del Pipeline (por ejemplo, si venía en proceso desde antes de cargarla en Orion). */
export async function corregirFechaInicioPipeline(propiedadId: string, fecha: string) {
  await requerirPropiedadDelAgente(propiedadId);
  const parsedFecha = new Date(fecha);
  if (isNaN(parsedFecha.getTime())) throw new Error("Fecha inválida.");

  await db
    .update(propiedades)
    .set({ fechaInicioPipeline: parsedFecha })
    .where(eq(propiedades.id, propiedadId));

  revalidatePath("/pipeline");
}
