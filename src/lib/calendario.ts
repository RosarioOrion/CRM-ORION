// Calendario de Inicio: junta en un solo lugar todo lo que el agente tiene
// agendado (visitas, firmas de reservas, y a futuro reuniones, tasaciones,
// captaciones...) para pintarlo por día y por color.

export const TIPOS_EVENTO = [
  "VISITA",
  "REUNION",
  "TASACION",
  "FIRMA",
  "CAPTACION",
  "OTRO",
] as const;

export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export const TIPO_EVENTO_LABEL: Record<TipoEvento, string> = {
  VISITA: "Visita",
  REUNION: "Reunión",
  TASACION: "Tasación",
  FIRMA: "Firma",
  CAPTACION: "Captación",
  OTRO: "Otro",
};

/** Color del puntito en el calendario. */
export const TIPO_EVENTO_PUNTO: Record<TipoEvento, string> = {
  VISITA: "bg-blue-500",
  REUNION: "bg-orion-gold",
  TASACION: "bg-emerald-500",
  FIRMA: "bg-rose-600",
  CAPTACION: "bg-violet-500",
  OTRO: "bg-gray-400",
};

/** Color de la etiqueta en la lista del día. */
export const TIPO_EVENTO_ETIQUETA: Record<TipoEvento, string> = {
  VISITA: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  REUNION: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  TASACION: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  FIRMA: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  CAPTACION: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  OTRO: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

export type EventoCalendario = {
  id: string;
  tipo: TipoEvento;
  /** "YYYY-MM-DD" */
  dia: string;
  /** "HH:MM", o null si no tiene hora (ej. firmas cargadas solo con fecha). */
  hora: string | null;
  titulo: string;
  detalle: string | null;
  href: string;
};

const dos = (n: number) => String(n).padStart(2, "0");

/**
 * Pasa una fecha de la base a día/hora en texto. Se usa la misma hora
 * "local del servidor" que usa la Agenda, así el calendario muestra
 * exactamente la misma hora que se ve en la Agenda.
 */
export function aDiaHora(fecha: Date, conHora = true): { dia: string; hora: string | null } {
  const dia = `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
  if (!conHora) return { dia, hora: null };
  const h = fecha.getHours();
  const m = fecha.getMinutes();
  // Fechas cargadas sin hora quedan a las 00:00 — no mostramos esa hora.
  return { dia, hora: h === 0 && m === 0 ? null : `${dos(h)}:${dos(m)}` };
}
