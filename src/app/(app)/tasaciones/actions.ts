"use server";

import { and, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { propiedades, tasaciones } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";
import { MARGEN_M2_SUGERIDOS, type ComparableSugerido } from "@/lib/tasaciones";
import {
  calcularTasacionPro,
  CAMPOS,
  categoriaDe,
  MINIMO_COMPARABLES,
  type Categoria,
  type ComparablePro,
  type SujetoPro,
  type ZonaTipo,
} from "@/lib/tasacion-pro";
import { registrar } from "@/lib/registro-actividad";
import { vincularTasacion } from "../captaciones/flujo-actions";

export type TasacionState = { error?: string; ok?: number };

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

function parseComparables(raw: string): ComparablePro[] | null {
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
      m2Semi: num(c.m2Semi),
      m2Desc: num(c.m2Desc),
      m2Terreno: num(c.m2Terreno),
      garajes: c.garajes === undefined || c.garajes === null || c.garajes === "" ? undefined : Math.max(0, Math.round(Number(c.garajes)) || 0),
      piscina: c.piscina ? true : undefined,
      esquina: c.esquina ? true : undefined,
      coneat: num(c.coneat),
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
  const departamento = String(formData.get("departamento") || "").trim();
  const link = String(formData.get("link") || "").trim();
  const m2 = Number(formData.get("m2"));
  const estado = Number(formData.get("estado"));
  const ubicacion = Number(formData.get("ubicacion"));
  const notas = String(formData.get("notas") || "").trim();
  const ajusteManualRaw = String(formData.get("ajusteManual") || "").trim();
  const ajusteManual = ajusteManualRaw ? Math.round(Number(ajusteManualRaw)) : null;
  const comparablesRaw = String(formData.get("comparablesJson") || "[]");
  const zonaTipo: ZonaTipo = formData.get("zonaTipo") === "BALNEARIA" ? "BALNEARIA" : "URBANA";

  const categoria = categoriaDe(tipo);
  if (!tipo || !categoria) return { error: "Elegí el tipo de propiedad." };
  const k = CAMPOS[categoria];
  if (!m2 || m2 <= 0) return { error: `Ingresá ${k.medida.toLowerCase()}.` };
  if (![1, 2, 3, 4].includes(estado)) return { error: `Elegí ${k.estado.toLowerCase()}.` };
  if (![1, 2, 3, 4].includes(ubicacion)) return { error: "Elegí la ubicación." };

  const sujeto: SujetoPro = {
    m2,
    estado,
    ubicacion,
    m2Semi: k.semi ? num(formData.get("m2Semi")) : undefined,
    m2Desc: k.desc ? num(formData.get("m2Desc")) : undefined,
    m2Terreno: k.terreno ? num(formData.get("m2Terreno")) : undefined,
    garajes: k.garajes ? num(formData.get("garajes")) : undefined,
    piscina: k.piscina && formData.get("piscina") === "on" ? true : undefined,
    esquina: k.esquina && formData.get("esquina") === "on" ? true : undefined,
    coneat: k.coneat ? num(formData.get("coneat")) : undefined,
  };
  if (k.terreno && !sujeto.m2Terreno) return { error: "Ingresá los m² de terreno (pesan mucho en el valor de una casa)." };

  const comparables = parseComparables(comparablesRaw);
  if (!comparables) return { error: "Error al leer los comparables." };
  if (comparables.length < MINIMO_COMPARABLES) {
    return {
      error: `Necesitás al menos ${MINIMO_COMPARABLES} comparables completos. Tenés ${comparables.length}.`,
    };
  }
  for (const c of comparables) {
    if (!c.m2 || c.m2 <= 0 || !c.precio || c.precio <= 0) {
      return { error: `Todos los comparables necesitan ${k.medida.toLowerCase()} y precio.` };
    }
  }

  const resultado = calcularTasacionPro(categoria, sujeto, comparables, zonaTipo);
  const { m2: _m2, estado: _e, ubicacion: _u, ...extras } = sujeto;
  void _m2; void _e; void _u;

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
      promedioUsdM2: resultado.promedio,
      valorEstimado: resultado.valorCierre,
      ajusteManual,
      notas: notas || null,
      detalle: { categoria, zonaTipo, departamento: departamento || null, sujeto: extras },
      agenteId: sesion.userId,
    })
    .returning({ id: tasaciones.id });

  await registrar("Hizo una tasación", { entidad: "tasacion", id: fila.id });
  revalidatePath("/tasaciones");
  // Tasación hecha desde una captación en "Tasando": queda vinculada y vuelve a Captaciones.
  const captacionId = String(formData.get("captacionId") || "");
  if (captacionId) {
    await vincularTasacion(captacionId, fila.id);
    redirect("/captaciones");
  }
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

  if (fila.agenteId !== sesion.userId && !esCEO(sesion.rol)) {
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
const TIPOS_ORION: Record<string, string[]> = {
  Apartamento: ["Apartamento"],
  Casa: ["Casa"],
  "Dúplex / PH": ["Casa"],
  Terreno: ["Terreno"],
  Chacra: ["Chacra", "Quinta"],
  Campo: ["Campo", "Estancia"],
  "Local comercial": ["Local"],
  Oficina: ["Oficina"],
  "Galpón / Depósito": ["Galpón", "Depósito"],
};

export async function sugerirComparables(
  tipo: string,
  zona: string,
  m2: number
): Promise<{ error?: string; sugeridos?: ComparableSugerido[] }> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "No autorizado." };

  tipo = tipo.trim();
  zona = zona.trim();
  const cat: Categoria | null = categoriaDe(tipo);
  if (!tipo || !cat || !zona || !m2 || m2 <= 0) {
    return { error: "Completá tipo, zona y superficie para buscar comparables." };
  }

  const medida =
    cat === "TERRENO"
      ? sql<number>`${propiedades.m2Terreno}`
      : cat === "CHACRA" || cat === "CAMPO"
      ? sql<number>`${propiedades.hectareas}`
      : sql<number>`coalesce(${propiedades.m2Cubiertos}, ${propiedades.m2Privados})`;
  const escapar = (t: string) => t.replace(/[\\%_]/g, (c) => `\\${c}`);
  const tipos = TIPOS_ORION[tipo] ?? [tipo];

  const filas = await db
    .select({
      id: propiedades.id,
      codigo: propiedades.codigo,
      titulo: propiedades.titulo,
      zona: propiedades.zona,
      estado: propiedades.estado,
      precio: propiedades.precio,
      m2: medida.mapWith(Number),
      m2Terreno: propiedades.m2Terreno,
      cocheras: propiedades.cocheras,
      extras: propiedades.extras,
    })
    .from(propiedades)
    .where(
      and(
        eq(propiedades.operacion, "VENTA"),
        eq(propiedades.moneda, "USD"),
        isNotNull(propiedades.precio),
        inArray(propiedades.estado, ["ACTIVA", "RESERVADA", "VENDIDA"]),
        or(...tipos.map((t) => ilike(propiedades.tipo, escapar(t)))),
        ilike(propiedades.zona, `%${escapar(zona)}%`),
        sql`${medida} between ${m2 * (1 - MARGEN_M2_SUGERIDOS)} and ${m2 * (1 + MARGEN_M2_SUGERIDOS)}`
      )
    )
    .orderBy(sql`abs(${medida} - ${m2})`)
    .limit(8);

  const k = CAMPOS[cat];
  return {
    sugeridos: filas.map((f) => ({
      link: `/propiedades/${f.id}`,
      m2: f.m2,
      precio: f.precio ?? 0,
      esCierre: f.estado !== "ACTIVA",
      estado: 3,
      ubicacion: 3,
      m2Terreno: k.terreno ? f.m2Terreno ?? undefined : undefined,
      garajes: k.garajes ? f.cocheras ?? (f.extras?.includes("Garaje") ? 1 : undefined) : undefined,
      piscina: k.piscina && f.extras?.includes("Piscina") ? true : undefined,
      codigo: f.codigo,
      titulo: f.titulo,
      zona: f.zona,
      estadoPropiedad: f.estado,
    })),
  };
}
