export const ESTADOS_PROPIEDAD = [
  "ACTIVA",
  "PAUSADA",
  "CERRADA",
  "VENDIDA",
  "ALQUILADA",
  "VENDIDA_OTRA_INMOBILIARIA",
  "ALQUILADA_OTRA_INMOBILIARIA",
] as const;

export const ESTADO_LABEL: Record<string, string> = {
  ACTIVA: "Activa",
  PAUSADA: "Suspendida",
  CERRADA: "Dada de baja",
  VENDIDA: "Vendida",
  ALQUILADA: "Alquilada",
  VENDIDA_OTRA_INMOBILIARIA: "Vendida (otra inmobiliaria)",
  ALQUILADA_OTRA_INMOBILIARIA: "Alquilada (otra inmobiliaria)",
};

export const ESTADO_COLOR: Record<string, string> = {
  ACTIVA: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  PAUSADA: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  CERRADA: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  VENDIDA: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  ALQUILADA: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  VENDIDA_OTRA_INMOBILIARIA:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  ALQUILADA_OTRA_INMOBILIARIA:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

/** Saca las etiquetas de estado tipo "[CERRADA]" que quedaron pegadas al título al migrar desde Lumen OS. */
export function limpiarTitulo(titulo: string): string {
  return titulo
    .replace(/\s*\[[^\]]*\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
