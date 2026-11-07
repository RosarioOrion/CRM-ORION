import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { comisiones, objetivosMensuales } from "@/db/schema";
import { ahoraUY } from "@/lib/calendario";

// Objetivo del mes en el Inicio: comisiones COBRADAS en el mes (marcadas
// "Cobrado" en Comisiones, por fecha de cobro) contra el objetivo del
// agente. Si no lo definió, se asigna solo con el promedio de lo cobrado en
// los 3 meses anteriores y se le avisa. Cada agente ve el suyo.
//
// "Cierres del mes": operaciones (reservas de venta o alquiler) que le
// generaron su comisión de agente este mes — los overrides de Team Leader
// no cuentan como cierre propio.

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// Las fechas de cobro y de creación se guardan en UTC; Uruguay es UTC-3.
const DESFASE_UY = 3 * 3600 * 1000;

function claveMes(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Clave "YYYY-MM" de una fecha guardada en UTC, en hora de Uruguay. */
function claveMesUTC(d: Date): string {
  const uy = new Date(d.getTime() - DESFASE_UY);
  return `${uy.getUTCFullYear()}-${String(uy.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type ObjetivoMes = {
  mes: string;
  mesLabel: string;
  cobrado: number;
  objetivo: number | null;
  automatico: boolean;
  /** Promedio de lo cobrado en los 3 meses anteriores (base del automático). */
  promedio: number;
  cierres: number;
};

export async function cargarObjetivoMes(usuarioId: string): Promise<ObjetivoMes> {
  const ahora = ahoraUY();
  const mes = claveMes(ahora);
  const anteriores = [1, 2, 3].map((n) => claveMes(new Date(ahora.getFullYear(), ahora.getMonth() - n, 1)));
  // Desde el día 1 de hace 3 meses (con margen por el huso horario).
  const desde = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth() - 3, 1) - DESFASE_UY);

  const [cobradas, generadas, [guardado]] = await Promise.all([
    db
      .select({ monto: comisiones.monto, fechaPago: comisiones.fechaPago })
      .from(comisiones)
      .where(and(eq(comisiones.beneficiarioId, usuarioId), eq(comisiones.pagada, true), gte(comisiones.fechaPago, desde))),
    db
      .select({
        concepto: comisiones.concepto,
        creadoEn: comisiones.creadoEn,
        reservaVentaId: comisiones.reservaVentaId,
        reservaAlquilerId: comisiones.reservaAlquilerId,
      })
      .from(comisiones)
      .where(and(eq(comisiones.beneficiarioId, usuarioId), gte(comisiones.creadoEn, desde))),
    db
      .select()
      .from(objetivosMensuales)
      .where(and(eq(objetivosMensuales.usuarioId, usuarioId), eq(objetivosMensuales.mes, mes))),
  ]);

  const porMes = new Map<string, number>();
  for (const c of cobradas) {
    if (!c.fechaPago) continue;
    const k = claveMesUTC(c.fechaPago);
    porMes.set(k, (porMes.get(k) ?? 0) + c.monto);
  }
  const cobrado = porMes.get(mes) ?? 0;
  const promedio = Math.round(anteriores.reduce((n, k) => n + (porMes.get(k) ?? 0), 0) / anteriores.length);

  const cierres = new Set(
    generadas
      .filter((c) => !c.concepto.startsWith("Override") && claveMesUTC(c.creadoEn) === mes)
      .map((c) => c.reservaVentaId ?? c.reservaAlquilerId)
      .filter(Boolean)
  ).size;

  let objetivo = guardado?.monto ?? null;
  let automatico = guardado?.automatico ?? false;
  if (!guardado && promedio > 0) {
    // Primera vez en el mes sin objetivo: se asigna el promedio.
    await db
      .insert(objetivosMensuales)
      .values({ usuarioId, mes, monto: promedio, automatico: true })
      .onConflictDoNothing();
    objetivo = promedio;
    automatico = true;
  }

  return {
    mes,
    mesLabel: MESES[ahora.getMonth()],
    cobrado,
    objetivo,
    automatico,
    promedio,
    cierres,
  };
}
