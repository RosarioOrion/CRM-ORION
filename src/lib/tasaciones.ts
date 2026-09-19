// Método Comparativo de Mercado — misma lógica que usa Lumen OS, verificada
// contra dos tasaciones reales ahí (matcheando al dólar el USD/m² ajustado
// de cada comparable, el promedio y el valor estimado final).
//
// Cómo funciona:
// 1. A cada comparable que NO es un cierre (es decir, es una publicación
//    "dinámica" todavía activa, no una venta/alquiler ya concretado) se le
//    aplica un descuento fijo del 10% sobre el precio ingresado, porque el
//    precio de publicación suele ser más alto que el precio real de cierre.
// 2. El USD/m² de cada comparable se ajusta hacia arriba o abajo según qué
//    tan mejor o peor es su estado y su ubicación respecto de la propiedad
//    que se está tasando: cada punto de diferencia (1 a 4) en estado o en
//    ubicación suma o resta un 5% al factor de ajuste.
// 3. El valor estimado final es el promedio de esos USD/m² ajustados,
//    multiplicado por la superficie de la propiedad sujeto.
//
// Lo que Lumen OS SI tiene y esto todavía no: el "Análisis Inteligente" con
// IA (score de liquidez, riesgo de sobreprecio, rango mínimo/máximo con
// comentario). Eso depende de la misma decisión de proveedor de IA que
// Capacitación y Mi Carta Semanal — ver tarea pendiente.

export const DESCUENTO_DINAMICO = 0.1;
export const FACTOR_POR_PUNTO = 0.05;
export const MINIMO_COMPARABLES = 4;

export const OPCIONES_ESTADO = [
  { valor: 1, label: "1 – Malo" },
  { valor: 2, label: "2 – Regular" },
  { valor: 3, label: "3 – Bueno" },
  { valor: 4, label: "4 – Excelente" },
];

export const OPCIONES_UBICACION = [
  { valor: 1, label: "1 – Mala" },
  { valor: 2, label: "2 – Regular" },
  { valor: 3, label: "3 – Buena" },
  { valor: 4, label: "4 – Excelente" },
];

export type Comparable = {
  link: string;
  m2: number;
  precio: number;
  esCierre: boolean;
  estado: number;
  ubicacion: number;
};

export function precioEfectivo(c: Comparable): number {
  return c.esCierre ? c.precio : c.precio * (1 - DESCUENTO_DINAMICO);
}

export function usdM2Base(c: Comparable): number {
  if (!c.m2) return 0;
  return precioEfectivo(c) / c.m2;
}

export function factorAjuste(
  c: Comparable,
  estadoSujeto: number,
  ubicacionSujeto: number
): number {
  const diferencia = (estadoSujeto - c.estado) + (ubicacionSujeto - c.ubicacion);
  return 1 + FACTOR_POR_PUNTO * diferencia;
}

export function usdM2Ajustado(
  c: Comparable,
  estadoSujeto: number,
  ubicacionSujeto: number
): number {
  return usdM2Base(c) * factorAjuste(c, estadoSujeto, ubicacionSujeto);
}

export type ResultadoTasacion = {
  ajustados: number[]; // USD/m² ajustado de cada comparable, redondeado (para mostrar)
  promedioUsdM2: number; // sin redondear, para no perder precisión antes de multiplicar
  promedioUsdM2Redondeado: number;
  valorEstimado: number;
};

export function calcularTasacion(
  comparables: Comparable[],
  estadoSujeto: number,
  ubicacionSujeto: number,
  m2Sujeto: number
): ResultadoTasacion {
  if (comparables.length === 0 || !m2Sujeto) {
    return {
      ajustados: [],
      promedioUsdM2: 0,
      promedioUsdM2Redondeado: 0,
      valorEstimado: 0,
    };
  }
  const ajustadosExactos = comparables.map((c) =>
    usdM2Ajustado(c, estadoSujeto, ubicacionSujeto)
  );
  const promedioUsdM2 =
    ajustadosExactos.reduce((a, b) => a + b, 0) / ajustadosExactos.length;
  const valorEstimado = Math.round(promedioUsdM2 * m2Sujeto);

  return {
    ajustados: ajustadosExactos.map((v) => Math.round(v)),
    promedioUsdM2,
    promedioUsdM2Redondeado: Math.round(promedioUsdM2),
    valorEstimado,
  };
}
