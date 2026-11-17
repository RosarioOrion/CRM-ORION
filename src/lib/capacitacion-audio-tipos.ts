// Constantes y tipos de los audios de Capacitación que también usa el
// navegador (sin importar la base de datos).

/** Máximo por archivo de audio. */
export const AUDIO_MAX_BYTES = 80 * 1024 * 1024;
/** Tamaño de cada pedazo que manda el navegador al subir. */
export const AUDIO_TROZO_BYTES = 4 * 1024 * 1024;

export type AudioCapitulo = {
  id: string;
  parte: number;
  nombre: string;
  peso: number;
  duracionSeg: number | null;
};

/** "1 h 05 min", "23 min", "45 s". */
export function duracionLegible(seg: number | null | undefined): string | null {
  if (!seg || seg <= 0) return null;
  const m = Math.round(seg / 60);
  if (seg < 60) return `${Math.round(seg)} s`;
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
}
