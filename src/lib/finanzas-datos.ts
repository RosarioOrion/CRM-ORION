import { and, asc, desc, eq, gte, isNotNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { comisiones, finanzasMeses, finanzasMovimientos } from "@/db/schema";
import { aPesos, categoria, mesSiguiente, type MovimientoMin } from "@/lib/finanzas";

// Acceso a datos de Mis finanzas. TODAS las consultas van filtradas por el
// usuario dueño: nadie más (ni la CEO) puede leer estos datos.

/** Inicio del mes en Uruguay (UTC−3), como fecha UTC. */
function inicioMes(mes: string): Date {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, 1, 3));
}

/** Las comisiones cobradas en Orion entran solas como ingreso (una sola vez). */
export async function sincronizarComisiones(usuarioId: string) {
  const cobradas = await db
    .select({ id: comisiones.id, monto: comisiones.monto, fechaPago: comisiones.fechaPago, concepto: comisiones.concepto })
    .from(comisiones)
    .where(and(eq(comisiones.beneficiarioId, usuarioId), eq(comisiones.pagada, true), isNotNull(comisiones.fechaPago)));
  if (!cobradas.length) return;
  await db
    .insert(finanzasMovimientos)
    .values(
      cobradas.map((c) => ({
        usuarioId,
        fecha: c.fechaPago!,
        tipo: "INGRESO",
        categoria: "COMISION",
        monto: c.monto,
        moneda: "USD",
        nota: `${c.concepto} (desde Comisiones)`,
        comisionId: c.id,
      }))
    )
    .onConflictDoNothing();
}

export async function movimientosDelMes(usuarioId: string, mes: string) {
  return db
    .select()
    .from(finanzasMovimientos)
    .where(
      and(
        eq(finanzasMovimientos.usuarioId, usuarioId),
        gte(finanzasMovimientos.fecha, inicioMes(mes)),
        lt(finanzasMovimientos.fecha, inicioMes(mesSiguiente(mes)))
      )
    )
    .orderBy(desc(finanzasMovimientos.fecha), desc(finanzasMovimientos.creadoEn));
}

export async function filaMes(usuarioId: string, mes: string) {
  const [f] = await db
    .select()
    .from(finanzasMeses)
    .where(and(eq(finanzasMeses.usuarioId, usuarioId), eq(finanzasMeses.mes, mes)));
  return f ?? null;
}

/** Última cotización cargada (para proponerla en un mes nuevo). */
export async function ultimaCotizacion(usuarioId: string): Promise<number | null> {
  const [f] = await db
    .select({ c: finanzasMeses.cotizacion })
    .from(finanzasMeses)
    .where(and(eq(finanzasMeses.usuarioId, usuarioId), isNotNull(finanzasMeses.cotizacion)))
    .orderBy(desc(finanzasMeses.mes))
    .limit(1);
  return f?.c ?? null;
}

/**
 * Fondo de emergencia acumulado (todo lo separado en "Fondo") y gasto
 * mensual promedio de los últimos 3 meses (fijos + variables personales), en pesos.
 */
export async function indicadoresHistoricos(usuarioId: string, cotizacionHoy: number | null) {
  const [movs, meses] = await Promise.all([
    db
      .select({
        fecha: finanzasMovimientos.fecha,
        categoria: finanzasMovimientos.categoria,
        monto: finanzasMovimientos.monto,
        moneda: finanzasMovimientos.moneda,
        oculto: finanzasMovimientos.oculto,
      })
      .from(finanzasMovimientos)
      .where(eq(finanzasMovimientos.usuarioId, usuarioId))
      .orderBy(asc(finanzasMovimientos.fecha)),
    db
      .select({ mes: finanzasMeses.mes, cotizacion: finanzasMeses.cotizacion })
      .from(finanzasMeses)
      .where(eq(finanzasMeses.usuarioId, usuarioId)),
  ]);
  const cot = new Map(meses.map((m) => [m.mes, m.cotizacion]));
  const claveMes = (d: Date) => {
    const uy = new Date(d.getTime() - 3 * 3600 * 1000);
    return `${uy.getUTCFullYear()}-${String(uy.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  let fondo = 0;
  const gastoPorMes = new Map<string, number>();
  for (const m of movs) {
    if (m.oculto) continue;
    const k = claveMes(m.fecha);
    const p = aPesos(m.monto, m.moneda, cot.get(k) ?? cotizacionHoy);
    if (p === null) continue;
    const g = categoria(m.categoria)?.grupo;
    if (m.categoria === "FONDO") fondo += p;
    if (g === "FIJOS" || g === "VARIABLES") gastoPorMes.set(k, (gastoPorMes.get(k) ?? 0) + p);
  }
  const ultimos = [...gastoPorMes.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 3);
  const gastoPromedio = ultimos.length ? ultimos.reduce((n, [, v]) => n + v, 0) / ultimos.length : 0;
  return { fondoAcumulado: fondo, gastoPromedio };
}

export type { MovimientoMin };
