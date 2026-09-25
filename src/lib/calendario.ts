// Calendario de Inicio: junta en un solo lugar todo lo que el agente tiene
// agendado (visitas, firmas de reservas, y a futuro reuniones, tasaciones,
// captaciones...) para pintarlo por día y por color.

export const TIPOS_EVENTO = [
  "VISITA",
  "VISITA_CAPTACION",
  "REUNION",
  "REUNION_EQUIPO",
  "TASACION",
  "FIRMA",
  "MATERIAL_GRAFICO",
  "OTRO",
] as const;

export type TipoEvento = (typeof TIPOS_EVENTO)[number];

/** Tipos que se agendan como "actividad" (todo menos la visita a propiedad). */
export const TIPOS_ACTIVIDAD = TIPOS_EVENTO.filter(
  (t) => t !== "VISITA"
) as Exclude<TipoEvento, "VISITA">[];

export function esTipoEvento(v: unknown): v is TipoEvento {
  return typeof v === "string" && (TIPOS_EVENTO as readonly string[]).includes(v);
}

export const TIPO_EVENTO_LABEL: Record<TipoEvento, string> = {
  VISITA: "Visita a propiedad",
  VISITA_CAPTACION: "Visita de captación",
  REUNION: "Reunión",
  REUNION_EQUIPO: "Reunión de equipo",
  TASACION: "Tasación",
  FIRMA: "Firma",
  MATERIAL_GRAFICO: "Material gráfico",
  OTRO: "Otro",
};

export const TIPO_EVENTO_ICONO: Record<TipoEvento, string> = {
  VISITA: "🏠",
  VISITA_CAPTACION: "🚀",
  REUNION: "🤝",
  REUNION_EQUIPO: "👥",
  TASACION: "📐",
  FIRMA: "✍️",
  MATERIAL_GRAFICO: "🎨",
  OTRO: "📌",
};

/** Ayuda para el campo "Título" según el tipo elegido. */
export const TIPO_EVENTO_EJEMPLO: Record<TipoEvento, string> = {
  VISITA: "",
  VISITA_CAPTACION: "Ej: Chacra en Santa Rosa — conocer al propietario",
  REUNION: "Ej: Reunión con propietario para firmar autorización",
  REUNION_EQUIPO: "Ej: Reunión semanal del equipo",
  TASACION: "Ej: Tasar casa en Malvín",
  FIRMA: "Ej: Firma de boleto — Apto 501",
  MATERIAL_GRAFICO: "Ej: Fotos y video de la casa de Carrasco",
  OTRO: "Ej: Trámite en la Intendencia",
};

/** Color del puntito en el calendario. */
export const TIPO_EVENTO_PUNTO: Record<TipoEvento, string> = {
  VISITA: "bg-blue-500",
  VISITA_CAPTACION: "bg-violet-500",
  REUNION: "bg-orion-gold",
  REUNION_EQUIPO: "bg-orange-500",
  TASACION: "bg-emerald-500",
  FIRMA: "bg-rose-600",
  MATERIAL_GRAFICO: "bg-pink-400",
  OTRO: "bg-gray-400",
};

/** Color de la etiqueta en listas. */
export const TIPO_EVENTO_ETIQUETA: Record<TipoEvento, string> = {
  VISITA: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  VISITA_CAPTACION: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  REUNION: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  REUNION_EQUIPO: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  TASACION: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  FIRMA: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  MATERIAL_GRAFICO: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  OTRO: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

export const ESTADOS_ACTIVIDAD = ["PENDIENTE", "REALIZADA", "CANCELADA"] as const;
export type EstadoActividad = (typeof ESTADOS_ACTIVIDAD)[number];

export const ESTADO_ACTIVIDAD_LABEL: Record<EstadoActividad, string> = {
  PENDIENTE: "Pendiente",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
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
  /** Nombre del agente si no es del usuario (vista del equipo / reunión de equipo). */
  agente?: string;
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

/** Opciones de duración para el formulario (en minutos). */
export const DURACIONES: { valor: number; label: string }[] = [
  { valor: 15, label: "15 min" },
  { valor: 30, label: "30 min" },
  { valor: 45, label: "45 min" },
  { valor: 60, label: "1 hora" },
  { valor: 90, label: "1 h 30" },
  { valor: 120, label: "2 horas" },
  { valor: 180, label: "3 horas" },
  { valor: 240, label: "4 horas" },
  { valor: 480, label: "Todo el día" },
];

/** Duración que se asume para calcular superposiciones si no se cargó. */
export const DURACION_POR_DEFECTO = 60;

export function textoDuracion(min: number | null | undefined): string | null {
  if (!min) return null;
  const op = DURACIONES.find((d) => d.valor === min);
  if (op) return op.label;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${m}` : ""}` : `${m} min`;
}

/**
 * "Ahora" con la hora de Montevideo, expresada igual que las fechas guardadas
 * (que se cargan como hora local de Uruguay). Así "vencida" y "Hoy" funcionan
 * bien aunque el servidor esté en otra zona horaria.
 */
export function ahoraUY(): Date {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Montevideo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );
  return new Date(
    Number(partes.year),
    Number(partes.month) - 1,
    Number(partes.day),
    Number(partes.hour),
    Number(partes.minute)
  );
}

/** Fecha guardada → valor para <input type="datetime-local">. */
export function aInputFechaHora(fecha: Date): string {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T${dos(
    fecha.getHours()
  )}:${dos(fecha.getMinutes())}`;
}
