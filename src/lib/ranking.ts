/**
 * Insignias del Ranking mensual (igual que en Lumen OS). Las tres primeras
 * son por ganancias netas (comisiones) del mes; las últimas tres son por
 * actividad de pipeline / cierres.
 */

export type Insignia = {
  id: string;
  icono: string;
  nombre: string;
  descripcion: string;
};

export const INSIGNIAS: Insignia[] = [
  { id: "CAJA_MASTER", icono: "💸", nombre: "Caja Master", descripcion: "Ganaste +USD 5.000 en un mes" },
  {
    id: "RENDIMIENTO_EXCELENTE",
    icono: "🏆",
    nombre: "Rendimiento Excelente",
    descripcion: "Ganaste +USD 1.500 en un mes",
  },
  { id: "BUEN_MES", icono: "⭐", nombre: "Buen Mes", descripcion: "Ganaste +USD 800 en un mes" },
  {
    id: "TOP_CAPTADOR",
    icono: "🎯",
    nombre: "Top Captador",
    descripcion: "Más propiedades activas del mes",
  },
  { id: "TOP_CIERRES", icono: "🥇", nombre: "Top Cierres", descripcion: "Más operaciones cerradas del mes" },
  {
    id: "PIPELINE_SOLIDO",
    icono: "🔥",
    nombre: "Pipeline Sólido",
    descripcion: "Mantuviste 25+ propiedades 4 semanas",
  },
];

/** Umbrales de ganancias netas (comisiones del mes) para las insignias de dinero, de mayor a menor. */
export const UMBRALES_GANANCIA: { id: string; monto: number }[] = [
  { id: "CAJA_MASTER", monto: 5000 },
  { id: "RENDIMIENTO_EXCELENTE", monto: 1500 },
  { id: "BUEN_MES", monto: 800 },
];

/** Mínimo de propiedades activas para la insignia Pipeline Sólido. */
export const MINIMO_PIPELINE_SOLIDO = 25;

/** Insignia de dinero más alta que alcanza una ganancia neta dada (o null si no llega a ninguna). */
export function insigniaGananciaAlcanzada(gananciaUsd: number): string | null {
  for (const u of UMBRALES_GANANCIA) {
    if (gananciaUsd >= u.monto) return u.id;
  }
  return null;
}
