"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { finanzasMeses, finanzasMovimientos } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { CATEGORIAS, tipoDeCategoria } from "@/lib/finanzas";

// Mis finanzas: ULTRA PRIVADO. Cada acción trabaja solo sobre los datos del
// usuario de la sesión, y no se puede usar con "Entrar como". A propósito
// NO se registra en Actividad.

export type FinanzasState = { error?: string; ok?: number };

async function dueno(): Promise<string> {
  const sesion = await obtenerSesion();
  if (!sesion) throw new Error("Sesión expirada, volvé a ingresar.");
  if (sesion.suplantadoPor) throw new Error("Mis finanzas es privado: no se puede usar con “Entrar como”.");
  return sesion.userId;
}

const numero = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export async function agregarMovimiento(_prev: FinanzasState, formData: FormData): Promise<FinanzasState> {
  let yo: string;
  try {
    yo = await dueno();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No autorizado." };
  }
  const cat = String(formData.get("categoria") || "");
  if (!CATEGORIAS.some((c) => c.clave === cat)) return { error: "Elegí una categoría." };
  const monto = numero(formData.get("monto"));
  if (!monto) return { error: "Ingresá el monto." };
  const moneda = formData.get("moneda") === "USD" ? "USD" : "UYU";
  const fechaTxt = String(formData.get("fecha") || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTxt)) return { error: "Elegí la fecha." };
  // Mediodía de Uruguay: así la fecha no cambia de día por el huso horario.
  const fecha = new Date(`${fechaTxt}T15:00:00Z`);
  const nota = String(formData.get("nota") || "").trim().slice(0, 200) || null;
  await db.insert(finanzasMovimientos).values({
    usuarioId: yo,
    fecha,
    tipo: tipoDeCategoria(cat),
    categoria: cat,
    monto,
    moneda,
    nota,
  });
  revalidatePath("/finanzas");
  return { ok: Date.now() };
}

/** Borrar un movimiento propio (los traídos de Comisiones se ocultan, para que no vuelvan). */
export async function eliminarMovimiento(id: string): Promise<{ error?: string }> {
  try {
    const yo = await dueno();
    const [m] = await db
      .select({ comisionId: finanzasMovimientos.comisionId })
      .from(finanzasMovimientos)
      .where(and(eq(finanzasMovimientos.id, id), eq(finanzasMovimientos.usuarioId, yo)));
    if (!m) return { error: "No se encontró." };
    if (m.comisionId)
      await db.update(finanzasMovimientos).set({ oculto: true }).where(and(eq(finanzasMovimientos.id, id), eq(finanzasMovimientos.usuarioId, yo)));
    else await db.delete(finanzasMovimientos).where(and(eq(finanzasMovimientos.id, id), eq(finanzasMovimientos.usuarioId, yo)));
    revalidatePath("/finanzas");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo borrar." };
  }
}

async function guardarMes(yo: string, mes: string, cambios: Partial<typeof finanzasMeses.$inferInsert>) {
  await db
    .insert(finanzasMeses)
    .values({ usuarioId: yo, mes, ...cambios })
    .onConflictDoUpdate({ target: [finanzasMeses.usuarioId, finanzasMeses.mes], set: cambios });
}

/** Cotización del dólar del mes (para pasar todo a pesos). */
export async function guardarCotizacion(_prev: FinanzasState, formData: FormData): Promise<FinanzasState> {
  try {
    const yo = await dueno();
    const mes = String(formData.get("mes") || "");
    if (!/^\d{4}-\d{2}$/.test(mes)) return { error: "Mes inválido." };
    const cot = numero(formData.get("cotizacion"));
    if (!cot || cot < 1 || cot > 1000) return { error: "Ingresá la cotización del dólar (ej. 40)." };
    await guardarMes(yo, mes, { cotizacion: cot });
    revalidatePath("/finanzas");
    revalidatePath("/finanzas/money-day");
    return { ok: Date.now() };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo guardar." };
  }
}

/** Presupuesto de un mes (desde Mis finanzas o desde el Money Day). */
export async function guardarPresupuesto(_prev: FinanzasState, formData: FormData): Promise<FinanzasState> {
  try {
    const yo = await dueno();
    const mes = String(formData.get("mes") || "");
    if (!/^\d{4}-\d{2}$/.test(mes)) return { error: "Mes inválido." };
    const presupuesto: Record<string, number> = {};
    for (const c of CATEGORIAS) {
      if (c.grupo === "INGRESO") continue;
      const v = numero(formData.get(`p_${c.clave}`));
      if (v) presupuesto[c.clave] = Math.round(v);
    }
    const ingresoEsperado = numero(formData.get("ingresoEsperado"));
    await guardarMes(yo, mes, { presupuesto, ingresoEsperado });
    // Si viene del Money Day, el mes anterior queda cerrado con sus notas.
    const cerrar = String(formData.get("cerrarMes") || "");
    if (/^\d{4}-\d{2}$/.test(cerrar)) {
      const notas = String(formData.get("notas") || "").trim().slice(0, 2000) || null;
      await guardarMes(yo, cerrar, { cerradoEn: new Date(), notas });
    }
    revalidatePath("/finanzas");
    revalidatePath("/finanzas/money-day");
    revalidatePath("/dashboard");
    return { ok: Date.now() };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo guardar." };
  }
}
