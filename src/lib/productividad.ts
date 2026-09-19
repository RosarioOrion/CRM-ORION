/**
 * Ventanas de tiempo para el dashboard de Productividad, en huso horario de
 * Montevideo (UTC-3, sin horario de verano).
 */

export const PERIODOS_PRODUCTIVIDAD = ["SEMANA", "MES", "TRIMESTRE"] as const;
export type PeriodoProductividad = (typeof PERIODOS_PRODUCTIVIDAD)[number];

export const PERIODO_PRODUCTIVIDAD_LABEL: Record<PeriodoProductividad, string> = {
  SEMANA: "Esta semana",
  MES: "Este mes",
  TRIMESTRE: "Trimestre",
};

const OFFSET_MONTEVIDEO_MS = 3 * 60 * 60 * 1000;

/** Fecha/hora actual expresada como si fuera UTC, para hacer cálculos de calendario en huso de Montevideo. */
function aMontevideo(fecha: Date): Date {
  return new Date(fecha.getTime() - OFFSET_MONTEVIDEO_MS);
}

function deMontevideoAUtc(fechaMontevideo: Date): Date {
  return new Date(fechaMontevideo.getTime() + OFFSET_MONTEVIDEO_MS);
}

/** Lunes 00:00 (Montevideo) de la semana que contiene `ahora`. */
export function inicioSemana(ahora: Date = new Date()): Date {
  const m = aMontevideo(ahora);
  const dia = m.getUTCDay(); // 0=domingo
  const diasDesdeLunes = dia === 0 ? 6 : dia - 1;
  const lunes = new Date(
    Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate() - diasDesdeLunes)
  );
  return deMontevideoAUtc(lunes);
}

/** Día 1 00:00 (Montevideo) del mes que contiene `ahora`. */
export function inicioMes(ahora: Date = new Date()): Date {
  const m = aMontevideo(ahora);
  const primero = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), 1));
  return deMontevideoAUtc(primero);
}

/** Últimos ~3 meses (rolling), no trimestre calendario fijo. */
export function inicioTrimestre(ahora: Date = new Date()): Date {
  const m = aMontevideo(ahora);
  const hace3Meses = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() - 3, m.getUTCDate()));
  return deMontevideoAUtc(hace3Meses);
}

export function inicioPeriodo(periodo: PeriodoProductividad, ahora: Date = new Date()): Date {
  if (periodo === "SEMANA") return inicioSemana(ahora);
  if (periodo === "MES") return inicioMes(ahora);
  return inicioTrimestre(ahora);
}
