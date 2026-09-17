export const ESTADOS_VISITA = [
  "PROGRAMADA",
  "REALIZADA",
  "CANCELADA",
  "NO_SE_PRESENTO",
] as const;

export type EstadoVisita = (typeof ESTADOS_VISITA)[number];

export const ESTADO_VISITA_LABEL: Record<EstadoVisita, string> = {
  PROGRAMADA: "Programada",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
  NO_SE_PRESENTO: "No se presentó",
};

export const ESTADO_VISITA_COLOR: Record<EstadoVisita, string> = {
  PROGRAMADA: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  REALIZADA: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  CANCELADA: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  NO_SE_PRESENTO: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

/** Agrupa una fecha en un balde legible para la Agenda ("Hoy", "Mañana", etc). */
export function baldeFecha(fecha: Date, ahora: Date = new Date()): string {
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const inicioDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const diffDias = Math.round((inicioDia.getTime() - inicioHoy.getTime()) / 86400000);

  if (diffDias < 0) return "Pasadas";
  if (diffDias === 0) return "Hoy";
  if (diffDias === 1) return "Mañana";
  if (diffDias <= 7) return "Esta semana";
  return "Más adelante";
}

export const ORDEN_BALDES = ["Hoy", "Mañana", "Esta semana", "Más adelante", "Pasadas"];
