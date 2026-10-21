"use server";

import { and, eq, ilike, inArray, isNotNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { propiedades, tasaciones } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import {
  calcularTasacion,
  MINIMO_COMPARABLES,
  MARGEN_M2_SUGERIDOS,
  type Comparable,
  type ComparableSugerido,
} from "@/lib/tasaciones";

export type TasacionState = { error?: string; ok?: number };

function parseComparables(raw: string): Comparable[] | null {
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return arr.map((c) => ({
      link: String(c.link || ""),
      m2: Number(c.m2) || 0,
      precio: Number(c.precio) || 0,
      esCierre: Boolean(c.esCierre),
      estado: Number(c.estado) || 1,
      ubicacion: Number(c.ubicacion) || 1,
    }));
  } catch {
    return null;
  }
}

export async function crearTasacion(
  _prevState: TasacionState,
  formData: FormData
): Promise<TasacionState> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "No autorizado." };

  const tipo = String(formData.get("tipo") || "").trim();
  const direccion = String(formData.get("direccion") || "").trim();
  const zona = String(formData.get("zona") || "").trim();
  const link = String(formData.get("link") || "").trim();
  const m2 = Number(formData.get("m2"));
  const estado = Number(formData.get("estado"));
  const ubicacion = Number(formData.get("ubicacion"));
  const notas = String(formData.get("notas") || "").trim();
  const ajusteManualRaw = String(formData.get("ajusteManual") || "").trim();
  const ajusteManual = ajusteManualRaw ? Math.round(Number(ajusteManualRaw)) : null;
  const comparablesRaw = String(formData.get("comparablesJson") || "[]");

  if (!tipo) return { error: "Ingresá el tipo de propiedad." };
  if (!m2 || m2 <= 0) return { error: "Ingresá la superficie (m²)." };
  if (![1, 2, 3, 4].includes(estado)) return { error: "Elegí el estado." };
  if (![1, 2, 3, 4].includes(ubicacion)) return { error: "Elegí la ubicación." };

  const comparables = parseComparables(comparablesRaw);
  if (!comparables) return { error: "Error al leer los comparables." };
  if (comparables.length < MINIMO_COMPARABLES) {
    return {
      error: `Necesitás al menos ${MINIMO_COMPARABLES} comparables completos. Tenés ${comparables.length}.`,
    };
  }
  for (const c of comparables) {
    if (!c.m2 || c.m2 <= 0 || !c.precio || c.precio <= 0) {
      return { error: "Todos los comparables necesitan m² y precio." };
    }
  }

  const resultado = calcularTasacion(comparables, estado, ubicacion, m2);

  const [fila] = await db
    .insert(tasaciones)
    .values({
      tipo,
      direccion: direccion || null,
      zona: zona || null,
      link: link || null,
      m2,
      estado,
      ubicacion,
      comparables,
      promedioUsdM2: resultado.promedioUsdM2,
      valorEstimado: resultado.valorEstimado,
      ajusteManual,
      notas: notas || null,
      agenteId: sesion.userId,
    })
    .returning({ id: tasaciones.id });

  revalidatePath("/tasaciones");
  redirect(`/tasaciones/${fila.id}`);
}

export async function eliminarTasacion(tasacionId: string) {
  const sesion = await obtenerSesion();
  if (!sesion) throw new Error("No autorizado.");

  const [fila] = await db
    .select({ agenteId: tasaciones.agenteId })
    .from(tasaciones)
    .where(eq(tasaciones.id, tasacionId));
  if (!fila) return;

  if (fila.agenteId !== sesion.userId && !esAdmin(sesion.rol)) {
    throw new Error("No autorizado.");
  }

  await db.delete(tasaciones).where(eq(tasaciones.id, tasacionId));
  revalidatePath("/tasaciones");
}

export async function actualizarAjusteManual(
  tasacionId: string,
  valor: number | null
) {
  const sesion = await obtenerSesion();
  if (!sesion) throw new Error("No autorizado.");

  await db
    .update(tasaciones)
    .set({ ajusteManual: valor })
    .where(eq(tasaciones.id, tasacionId));

  revalidatePath(`/tasaciones/${tasacionId}`);
}

// "Sugerir comparables": propiedades en venta de Orion del mismo tipo y zona,
// con superficie parecida. Las vendidas o reservadas entran como Cierre y las
// activas como Dinámico. Solo en dólares, para no mezclar monedas.
export async function sugerirComparables(
  tipo: string,
  zona: string,
  m2: number
): Promise<{ error?: string; sugeridos?: ComparableSugerido[] }> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "No autorizado." };

  tipo = tipo.trim();
  zona = zona.trim();
  if (!tipo || !zona || !m2 || m2 <= 0) {
    return { error: "Completá tipo, zona y m² para buscar comparables." };
  }

  const m2Prop = sql<number>`coalesce(${propiedades.m2Cubiertos}, ${propiedades.m2Privados}, ${propiedades.m2Terreno})`;
  const escapar = (t: string) => t.replace(/[\\%_]/g, (c) => `\\${c}`);

  const filas = await db
    .select({
      id: propiedades.id,
      codigo: propiedades.codigo,
      titulo: propiedades.titulo,
      zona: propiedades.zona,
      estado: propiedades.estado,
      precio: propiedades.precio,
      m2: m2Prop.mapWith(Number),
    })
    .from(propiedades)
    .where(
      and(
        eq(propiedades.operacion, "VENTA"),
        eq(propiedades.moneda, "USD"),
        isNotNull(propiedades.precio),
        inArray(propiedades.estado, ["ACTIVA", "RESERVADA", "VENDIDA"]),
        ilike(propiedades.tipo, escapar(tipo)),
        ilike(propiedades.zona, `%${escapar(zona)}%`),
        sql`${m2Prop} between ${m2 * (1 - MARGEN_M2_SUGERIDOS)} and ${m2 * (1 + MARGEN_M2_SUGERIDOS)}`
      )
    )
    .orderBy(sql`abs(${m2Prop} - ${m2})`)
    .limit(8);

  return {
    sugeridos: filas.map((f) => ({
      link: `/propiedades/${f.id}`,
      m2: f.m2,
      precio: f.precio ?? 0,
      esCierre: f.estado !== "ACTIVA",
      estado: 3,
      ubicacion: 3,
      codigo: f.codigo,
      titulo: f.titulo,
      zona: f.zona,
      estadoPropiedad: f.estado,
    })),
  };
}
