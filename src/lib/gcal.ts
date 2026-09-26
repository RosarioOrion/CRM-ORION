// Google Calendar (gratis, en un solo sentido: Orion → Google).
//
// 1) Botón "Agregar a Google Calendar" en cada actividad: arma un link que
//    abre Google Calendar con el evento ya completado, listo para guardar.
// 2) Enlace de suscripción (ver src/lib/ics.ts): Google lee la agenda de
//    Orion cada algunas horas y la muestra como un calendario más.

export const ZONA_UY = "America/Montevideo";

const dos = (n: number) => String(n).padStart(2, "0");

/** Fecha guardada (hora local de Uruguay) → "YYYYMMDDTHHMMSS", sin zona. */
export function aFechaHoraCompacta(fecha: Date): string {
  return `${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}T${dos(
    fecha.getHours()
  )}${dos(fecha.getMinutes())}00`;
}

/** Fecha guardada → "YYYYMMDD". */
export function aFechaCompacta(fecha: Date): string {
  return `${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}`;
}

/** Las fechas cargadas sin hora quedan a las 00:00 → evento de todo el día. */
export function esTodoElDia(fecha: Date, duracionMin?: number | null): boolean {
  return (fecha.getHours() === 0 && fecha.getMinutes() === 0) || duracionMin === 480;
}

export function diaSiguiente(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1);
}

/** Link "Agregar a Google Calendar" con el evento precargado. */
export function linkGoogleCalendar(ev: {
  titulo: string;
  fecha: Date;
  duracionMin?: number | null;
  lugar?: string | null;
  detalle?: string | null;
}): string {
  const todoElDia = esTodoElDia(ev.fecha, ev.duracionMin);
  const dates = todoElDia
    ? `${aFechaCompacta(ev.fecha)}/${aFechaCompacta(diaSiguiente(ev.fecha))}`
    : `${aFechaHoraCompacta(ev.fecha)}/${aFechaHoraCompacta(
        new Date(ev.fecha.getTime() + (ev.duracionMin || 60) * 60000)
      )}`;
  const p = new URLSearchParams({ action: "TEMPLATE", text: ev.titulo, dates, ctz: ZONA_UY });
  if (ev.lugar) p.set("location", ev.lugar);
  if (ev.detalle) p.set("details", ev.detalle);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
