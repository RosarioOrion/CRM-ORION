export const TIPOS_PROPIEDAD = [
  "Apartamento",
  "Casa",
  "Oficina",
  "Local",
  "Depósito",
  "Galpón",
  "Garage",
  "Terreno",
  "Quinta",
  "Campo",
  "Chacra",
  "Estancia",
] as const;

// Una propiedad puede estar Activa, Reservada (mientras se cierra una venta o
// alquiler), Inactiva (pausada temporalmente), Cerrada (se dio de baja, por
// ejemplo porque la vendió/alquiló otra inmobiliaria o el dueño desistió), o
// Vendida/Alquilada (cuando una Reservada se firma).
export const ESTADOS_PROPIEDAD = [
  "ACTIVA",
  "RESERVADA",
  "PAUSADA",
  "CERRADA",
  "VENDIDA",
  "ALQUILADA",
] as const;

export const ESTADO_LABEL: Record<string, string> = {
  ACTIVA: "Activa",
  RESERVADA: "Reservada",
  PAUSADA: "Inactiva",
  CERRADA: "Cerrada",
  VENDIDA: "Vendida",
  ALQUILADA: "Alquilada",
};

export const ESTADO_COLOR: Record<string, string> = {
  ACTIVA: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  RESERVADA: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  PAUSADA: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  CERRADA: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  VENDIDA: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  ALQUILADA: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

/** Saca las etiquetas de estado tipo "[CERRADA]" que quedaron pegadas al título al migrar desde Lumen OS. */
export function limpiarTitulo(titulo: string): string {
  return titulo
    .replace(/\s*\[[^\]]*\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export const OPERACION_LABEL: Record<string, string> = {
  VENTA: "Venta",
  ALQUILER: "Alquiler",
};

/**
 * Arma el resumen compacto de características que se muestra en la ficha
 * de la grilla de propiedades, tipo "90m² · 2d · 2b".
 */
export function resumenCaracteristicas(p: {
  m2Cubiertos: number | null;
  m2Privados: number | null;
  m2Terreno: number | null;
  hectareas: number | null;
  dormitorios: number | null;
  banos: number | null;
}): string {
  const partes: string[] = [];

  const m2 = p.m2Cubiertos ?? p.m2Privados ?? p.m2Terreno;
  if (m2) {
    partes.push(`${m2}m²`);
  } else if (p.hectareas) {
    partes.push(`${p.hectareas}ha`);
  }
  if (p.dormitorios) partes.push(`${p.dormitorios}d`);
  if (p.banos) partes.push(`${p.banos}b`);

  return partes.join(" · ");
}
