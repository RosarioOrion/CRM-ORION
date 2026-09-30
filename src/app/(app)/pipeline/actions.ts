"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { propiedades, historialPrecios, pipelineAcciones, seguimientos, contactos } from "@/db/schema";
import { reemplazarPrecio } from "@/lib/precio-texto";
import { obtenerSesion } from "@/lib/auth";
import { ahoraUY } from "@/lib/calendario";
import { esCanal } from "@/lib/seguimientos";
import { DESCRIPCION_REPUBLICADO } from "@/lib/pipeline-datos";
import {
  CATEGORIAS_PIPELINE,
  esFrecuencia,
  proximoLunesQueToca,
  diasEnMercado,
  semanaActual,
  type CategoriaPipeline,
} from "@/lib/pipeline";

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


/** Cambia el precio (y el precio escrito en título/descripción) y lo deja en el historial. */
async function aplicarAjustePrecio(
  propiedadId: string,
  precio: number,
  moneda: "USD" | "UYU",
  agenteId: string
) {
  const [actual] = await db
    .select({
      precio: propiedades.precio,
      moneda: propiedades.moneda,
      titulo: propiedades.titulo,
      descripcion: propiedades.descripcion,
    })
    .from(propiedades)
    .where(eq(propiedades.id, propiedadId));

  // El precio viejo escrito en el título y la descripción también se actualiza.
  let titulo = actual?.titulo;
  let descripcion = actual?.descripcion ?? null;
  if (actual?.precio) {
    const ant = { precio: actual.precio, moneda: actual.moneda };
    const nue = { precio: precio, moneda: moneda };
    if (titulo) titulo = reemplazarPrecio(titulo, ant, nue).texto;
    if (descripcion) descripcion = reemplazarPrecio(descripcion, ant, nue).texto;
  }

  await db.insert(historialPrecios).values({
    propiedadId,
    precioAnterior: actual?.precio ?? null,
    monedaAnterior: actual?.moneda ?? null,
    precioNuevo: precio,
    monedaNueva: moneda,
    agenteId: agenteId,
  });

  await db
    .update(propiedades)
    .set({ precio: precio, moneda: moneda, titulo, descripcion })
    .where(eq(propiedades.id, propiedadId));

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

  await aplicarAjustePrecio(propiedadId, parsed.data.precio, parsed.data.moneda, sesion.userId);

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

function revalidarPipeline(propiedadId: string) {
  revalidatePath("/pipeline");
  revalidatePath(`/propiedades/${propiedadId}`);
  revalidatePath("/dashboard");
}

/** Cada cuánto se hace el seguimiento al dueño (y republicar): 7 o 14 días. */
export async function elegirFrecuenciaSeguimiento(propiedadId: string, frecuencia: number) {
  await requerirPropiedadDelAgente(propiedadId);
  if (!esFrecuencia(frecuencia)) throw new Error("Frecuencia inválida.");
  await db
    .update(propiedades)
    .set({ frecuenciaSeguimiento: frecuencia })
    .where(eq(propiedades.id, propiedadId));
  revalidarPipeline(propiedadId);
}

export type SeguimientoPipelineState = { error?: string; ok?: number };

/**
 * Seguimiento de los lunes al dueño, desde el Pipeline: se guarda en el
 * historial de seguimientos del contacto (así sigue valiendo la regla de
 * contacto frío), marca la tarea de la semana y, si el dueño aceptó un
 * ajuste de precio, actualiza el precio.
 */
export async function registrarSeguimientoPipeline(
  _prev: SeguimientoPipelineState,
  formData: FormData
): Promise<SeguimientoPipelineState> {
  const propiedadId = String(formData.get("propiedadId") ?? "");
  let sesion;
  try {
    sesion = await requerirPropiedadDelAgente(propiedadId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No autorizado." };
  }

  const [p] = await db.select().from(propiedades).where(eq(propiedades.id, propiedadId));
  if (!p) return { error: "Propiedad no encontrada." };

  const canal = String(formData.get("canal") ?? "");
  if (!esCanal(canal)) return { error: "Elegí si fue mensaje o llamada." };
  const r = String(formData.get("respondio") ?? "");
  if (r !== "si" && r !== "no") return { error: "Indicá si respondió o no." };
  const respondio = r === "si";
  const nota = String(formData.get("nota") ?? "").trim() || null;
  if (respondio && !nota) return { error: "Anotá qué respondió el dueño." };

  const aj = String(formData.get("ajustePlanteado") ?? "");
  const ajustePlanteado = aj === "si" ? true : aj === "no" ? false : null;
  let ajusteAceptado: boolean | null = null;
  let ajustePrecio: number | null = null;
  let ajusteMoneda: "USD" | "UYU" | null = null;
  if (ajustePlanteado) {
    const ac = String(formData.get("ajusteAceptado") ?? "");
    if (ac !== "si" && ac !== "no") return { error: "Indicá si el dueño aceptó el ajuste." };
    ajusteAceptado = ac === "si";
    if (ajusteAceptado) {
      const precio = Number(formData.get("ajustePrecio"));
      const moneda = String(formData.get("ajusteMoneda") ?? p.moneda);
      if (!Number.isFinite(precio) || precio <= 0) return { error: "Ingresá el nuevo precio." };
      if (moneda !== "USD" && moneda !== "UYU") return { error: "Moneda inválida." };
      ajustePrecio = Math.round(precio);
      ajusteMoneda = moneda;
    }
  }

  const ahora = ahoraUY();
  const real = new Date();
  const fecha = new Date(ahora.getTime() + real.getSeconds() * 1000 + real.getMilliseconds());
  const frecuencia = esFrecuencia(p.frecuenciaSeguimiento) ? p.frecuenciaSeguimiento : 7;
  const proxLunes = proximoLunesQueToca(fecha, p.fechaInicioPipeline, frecuencia);
  const proximaFecha = new Date(proxLunes.getFullYear(), proxLunes.getMonth(), proxLunes.getDate(), 10, 0);

  await db.insert(seguimientos).values({
    contactoId: p.duenoId,
    propiedadId,
    agenteId: sesion.userId,
    fecha,
    canal,
    respondio,
    nota,
    proximaFecha,
    ajustePlanteado,
    ajusteAceptado,
    ajustePrecio,
    ajusteMoneda,
  });

  // Respondió: el dueño deja de estar frío.
  if (respondio) {
    await db.update(contactos).set({ frioDesde: null }).where(eq(contactos.id, p.duenoId));
  }

  // Queda marcada la tarea "Seguimiento con el dueño" de la semana del plan.
  const semana = semanaActual(diasEnMercado(p.fechaInicioPipeline), p.operacion);
  await db.insert(pipelineAcciones).values({
    propiedadId,
    agenteId: sesion.userId,
    categoria: "SEGUIMIENTO_DUENO",
    semana,
    descripcion: respondio ? "Seguimiento al dueño — respondió" : "Seguimiento al dueño — sin respuesta",
    nota,
  });

  if (ajusteAceptado && ajustePrecio && ajusteMoneda) {
    await aplicarAjustePrecio(propiedadId, ajustePrecio, ajusteMoneda, sesion.userId);
    revalidatePath("/propiedades");
  }

  revalidarPipeline(propiedadId);
  revalidatePath(`/contactos/${p.duenoId}`);
  return { ok: Date.now() };
}

/** Republicar: queda registrado y el próximo toca según la frecuencia. */
export async function registrarRepublicacion(propiedadId: string) {
  const sesion = await requerirPropiedadDelAgente(propiedadId);
  const [p] = await db
    .select({ inicio: propiedades.fechaInicioPipeline, operacion: propiedades.operacion })
    .from(propiedades)
    .where(eq(propiedades.id, propiedadId));
  if (!p) throw new Error("Propiedad no encontrada.");
  await db.insert(pipelineAcciones).values({
    propiedadId,
    agenteId: sesion.userId,
    categoria: "MARKETING",
    semana: semanaActual(diasEnMercado(p.inicio), p.operacion),
    descripcion: DESCRIPCION_REPUBLICADO,
  });
  revalidarPipeline(propiedadId);
}
