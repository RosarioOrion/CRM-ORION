// Tasación profesional (Método Comparativo de Mercado homogeneizado).
//
// Base: el método de puntajes que usa Rosario (Imperium / Lumen OS):
//   - las publicaciones activas ("dinámicos") se reducen 10% (precio de
//     publicación → precio probable de cierre);
//   - cada punto de diferencia (1 a 4) en estado/construcción y en ubicación
//     ajusta ±5% el valor unitario del comparable.
// Sobre eso se suma lo que usa un tasador profesional:
//   1. Tipo de propiedad con su propia unidad de medida:
//        Apartamento/Oficina, Casa/Dúplex/PH, Local/Galpón → m² ponderados
//        Terreno → m² de terreno · Chacra/Campo → hectáreas
//   2. Superficie ponderada: cubierto 100%, semicubierto (galería, balcón
//      techado) 50%, descubierto (terraza, patio) 30% y, en casas, el
//      terreno libre al 10% (zona urbana) o 15% (balnearia / suburbana).
//   3. Ajustes automáticos: iluminación y ventilación (±4% por punto),
//      tamaño (las más grandes bajan su valor unitario,
//      tope ±10%), garajes (±5% c/u), piscina (±5%), esquina (±8%) y, en
//      campos, índice CONEAT.
//   4. Resultado: valor probable de cierre, rango, precio sugerido de
//      publicación y confiabilidad según qué tan parecidos son los
//      comparables (coeficiente de variación) y si hay ventas cerradas.
//
// Las tasaciones viejas (sin categoría) se siguen calculando con
// src/lib/tasaciones.ts, así no cambian sus números.

export type Categoria = "APARTAMENTO" | "CASA" | "TERRENO" | "CHACRA" | "CAMPO" | "COMERCIAL";

export const TIPOS_TASACION: { tipo: string; categoria: Categoria; icono: string }[] = [
  { tipo: "Apartamento", categoria: "APARTAMENTO", icono: "🏢" },
  { tipo: "Casa", categoria: "CASA", icono: "🏠" },
  { tipo: "Dúplex / PH", categoria: "CASA", icono: "🏘️" },
  { tipo: "Terreno", categoria: "TERRENO", icono: "📐" },
  { tipo: "Chacra", categoria: "CHACRA", icono: "🌳" },
  { tipo: "Campo", categoria: "CAMPO", icono: "🌾" },
  { tipo: "Local comercial", categoria: "COMERCIAL", icono: "🏪" },
  { tipo: "Oficina", categoria: "APARTAMENTO", icono: "💼" },
  { tipo: "Galpón / Depósito", categoria: "COMERCIAL", icono: "🏭" },
];

export function categoriaDe(tipo: string): Categoria | null {
  const t = tipo.trim().toLowerCase();
  const exacto = TIPOS_TASACION.find((x) => x.tipo.toLowerCase() === t);
  if (exacto) return exacto.categoria;
  if (/apto|apartamento|monoambiente|oficina/.test(t)) return "APARTAMENTO";
  if (/casa|duplex|dúplex|ph|chalet/.test(t)) return "CASA";
  if (/terreno|solar|lote/.test(t)) return "TERRENO";
  if (/chacra/.test(t)) return "CHACRA";
  if (/campo|estancia/.test(t)) return "CAMPO";
  if (/local|galp|dep[oó]sito/.test(t)) return "COMERCIAL";
  return null;
}

/** Qué datos pide cada categoría (al sujeto y a cada comparable). */
export const CAMPOS: Record<
  Categoria,
  {
    unidad: "m²" | "ha";
    medida: string; // etiqueta del dato principal
    semi?: boolean;
    desc?: boolean;
    terreno?: boolean;
    garajes?: boolean;
    piscina?: boolean;
    esquina?: boolean;
    coneat?: boolean;
    /** Puntaje 1-4 de iluminación y ventilación. */
    luz?: boolean;
    estado: string; // etiqueta del puntaje 1-4 de "estado"
    ubicacion: string;
  }
> = {
  APARTAMENTO: { unidad: "m²", medida: "m² propios (cubiertos)", semi: true, desc: true, garajes: true, luz: true, estado: "Estado / construcción", ubicacion: "Ubicación" },
  CASA: { unidad: "m²", medida: "m² edificados", semi: true, terreno: true, garajes: true, piscina: true, luz: true, estado: "Estado / construcción", ubicacion: "Ubicación" },
  TERRENO: { unidad: "m²", medida: "m² de terreno", esquina: true, estado: "Servicios y aptitud", ubicacion: "Ubicación" },
  CHACRA: { unidad: "ha", medida: "Hectáreas", estado: "Vivienda y mejoras", ubicacion: "Ubicación y acceso" },
  CAMPO: { unidad: "ha", medida: "Hectáreas", coneat: true, estado: "Mejoras (alambrados, aguadas…)", ubicacion: "Ubicación y acceso" },
  COMERCIAL: { unidad: "m²", medida: "m² cubiertos", desc: true, garajes: true, esquina: true, luz: true, estado: "Estado / construcción", ubicacion: "Ubicación" },
};

/** Iluminación y ventilación (1 interno/oscuro … 4 muy luminoso, ventanas abundantes). */
export const OPCIONES_LUZ = [
  { valor: 1, label: "1 – Interno / oscuro" },
  { valor: 2, label: "2 – Poca luz" },
  { valor: 3, label: "3 – Buena luz" },
  { valor: 4, label: "4 – Muy luminoso" },
];

export const COEF_SEMI = 0.5;
export const COEF_DESC = 0.3;
export const COEF_TERRENO = { URBANA: 0.1, BALNEARIA: 0.15 } as const;
export type ZonaTipo = keyof typeof COEF_TERRENO;
export const ZONA_TIPO_LABEL: Record<ZonaTipo, string> = {
  URBANA: "Urbana (terreno libre al 10%)",
  BALNEARIA: "Balnearia / suburbana (terreno libre al 15%)",
};

export const DESCUENTO_DINAMICO = 0.1;
export const FACTOR_POR_PUNTO = 0.05;
export const FACTOR_GARAJE = 0.05;
export const FACTOR_PISCINA = 0.05;
export const FACTOR_ESQUINA = 0.08;
export const FACTOR_LUZ = 0.04;
export const EXPONENTE_TAMANO = 0.15;
export const TOPE_TAMANO = 0.1;
export const ELASTICIDAD_CONEAT = 0.6;
export const MINIMO_COMPARABLES = 4;

/** Medidas y características (las tiene el sujeto y cada comparable). */
export type Medidas = {
  /** m² cubiertos / m² de terreno / hectáreas según la categoría. */
  m2: number;
  m2Semi?: number;
  m2Desc?: number;
  m2Terreno?: number;
  garajes?: number;
  piscina?: boolean;
  esquina?: boolean;
  coneat?: number;
  /** Iluminación y ventilación 1-4 (vacío en el comparable = no se ajusta). */
  luz?: number;
};

export type ComparablePro = Medidas & {
  link: string;
  precio: number;
  esCierre: boolean;
  /** Sale de una tasación anterior de Orion (valor estimado: sin -10%, no cuenta como cierre). */
  esTasacion?: boolean;
  estado: number;
  ubicacion: number;
};

export type SujetoPro = Medidas & { estado: number; ubicacion: number };

/** Superficie con la que se compara (m² ponderados o hectáreas). */
export function superficieComparable(cat: Categoria, m: Medidas, zona: ZonaTipo): number {
  const c = CAMPOS[cat];
  let s = m.m2 || 0;
  if (c.semi) s += COEF_SEMI * (m.m2Semi || 0);
  if (c.desc) s += COEF_DESC * (m.m2Desc || 0);
  if (c.terreno) s += COEF_TERRENO[zona] * Math.max(0, (m.m2Terreno || 0) - (m.m2 || 0));
  return s;
}

export type Ajuste = { nombre: string; factor: number };

export type ComparableCalculado = {
  superficie: number;
  /** USD por unidad antes de ajustar (con el -10% si es dinámico). */
  base: number;
  ajustes: Ajuste[];
  factor: number;
  /** USD por unidad ajustado. */
  ajustado: number;
  /** Se aleja más de 25% de la mediana: conviene revisarlo. */
  atipico: boolean;
};

export type Confiabilidad = "ALTA" | "MEDIA" | "BAJA";

export type ResultadoPro = {
  unidad: "m²" | "ha";
  superficieSujeto: number;
  comparables: ComparableCalculado[];
  promedio: number;
  /** Coeficiente de variación de los valores ajustados (0,15 = 15%). */
  dispersion: number;
  valorCierre: number;
  rangoMin: number;
  rangoMax: number;
  valorPublicacion: number;
  confiabilidad: Confiabilidad;
  motivos: string[];
};

const redondear = (n: number, a = 1000) => Math.round(n / a) * a;

export function ajustesComparable(cat: Categoria, s: SujetoPro, c: ComparablePro, zona: ZonaTipo): Ajuste[] {
  const k = CAMPOS[cat];
  const out: Ajuste[] = [];
  const dif = s.estado - c.estado + (s.ubicacion - c.ubicacion);
  if (dif) out.push({ nombre: `${k.estado} y ${k.ubicacion.toLowerCase()}`, factor: 1 + FACTOR_POR_PUNTO * dif });
  const supS = superficieComparable(cat, s, zona);
  const supC = superficieComparable(cat, c, zona);
  if (supS > 0 && supC > 0) {
    const f = Math.min(1 + TOPE_TAMANO, Math.max(1 - TOPE_TAMANO, Math.pow(supC / supS, EXPONENTE_TAMANO)));
    if (Math.abs(f - 1) >= 0.005) out.push({ nombre: "Tamaño", factor: f });
  }
  // Garaje: solo si se cargó en el comparable (vacío = no se sabe, no se ajusta).
  if (k.garajes && c.garajes !== undefined && c.garajes !== null) {
    const g = (s.garajes || 0) - c.garajes;
    if (g) out.push({ nombre: "Garaje", factor: 1 + FACTOR_GARAJE * g });
  }
  if (k.piscina && !!s.piscina !== !!c.piscina) out.push({ nombre: "Piscina", factor: s.piscina ? 1 + FACTOR_PISCINA : 1 - FACTOR_PISCINA });
  if (k.esquina && !!s.esquina !== !!c.esquina) out.push({ nombre: "Esquina", factor: s.esquina ? 1 + FACTOR_ESQUINA : 1 - FACTOR_ESQUINA });
  if (k.luz && s.luz && c.luz && s.luz !== c.luz)
    out.push({ nombre: "Luz y ventilación", factor: 1 + FACTOR_LUZ * (s.luz - c.luz) });
  if (k.coneat && s.coneat && c.coneat) {
    const f = Math.pow(s.coneat / c.coneat, ELASTICIDAD_CONEAT);
    if (Math.abs(f - 1) >= 0.005) out.push({ nombre: "Índice CONEAT", factor: f });
  }
  return out;
}

export function comparableCompleto(c: ComparablePro): boolean {
  return c.m2 > 0 && c.precio > 0;
}

export function calcularTasacionPro(
  cat: Categoria,
  sujeto: SujetoPro,
  comparables: ComparablePro[],
  zona: ZonaTipo = "URBANA"
): ResultadoPro {
  const unidad = CAMPOS[cat].unidad;
  const supS = superficieComparable(cat, sujeto, zona);
  const calc = comparables.map((c) => {
    const superficie = superficieComparable(cat, c, zona);
    const precio = c.esCierre || c.esTasacion ? c.precio : c.precio * (1 - DESCUENTO_DINAMICO);
    const base = superficie > 0 ? precio / superficie : 0;
    const ajustes = ajustesComparable(cat, sujeto, c, zona);
    const factor = ajustes.reduce((f, a) => f * a.factor, 1);
    return { superficie, base, ajustes, factor, ajustado: base * factor, atipico: false };
  });
  const vals = calc.map((c) => c.ajustado).filter((v) => v > 0);
  const n = vals.length;
  const promedio = n ? vals.reduce((a, b) => a + b, 0) / n : 0;
  const sd = n > 1 ? Math.sqrt(vals.reduce((a, v) => a + (v - promedio) ** 2, 0) / (n - 1)) : 0;
  const dispersion = promedio ? sd / promedio : 0;
  const orden = [...vals].sort((a, b) => a - b);
  const mediana = n ? (n % 2 ? orden[(n - 1) / 2] : (orden[n / 2 - 1] + orden[n / 2]) / 2) : 0;
  for (const c of calc) c.atipico = mediana > 0 && Math.abs(c.ajustado - mediana) / mediana > 0.25;

  const valorCierre = Math.round(promedio * supS);
  // Rango: ± la dispersión de la muestra (mínimo ±5%, máximo ±20%).
  const margen = Math.min(0.2, Math.max(0.05, dispersion));
  const cierres = comparables.filter((c, i) => c.esCierre && !c.esTasacion && calc[i].ajustado > 0).length;
  const previas = comparables.filter((c, i) => c.esTasacion && calc[i].ajustado > 0).length;
  const atipicos = calc.filter((c) => c.atipico).length;

  const motivos: string[] = [];
  let confiabilidad: Confiabilidad;
  if (n >= MINIMO_COMPARABLES && dispersion <= 0.12 && cierres >= 1) confiabilidad = "ALTA";
  else if (n >= MINIMO_COMPARABLES && dispersion <= 0.2) confiabilidad = "MEDIA";
  else confiabilidad = "BAJA";
  if (n < MINIMO_COMPARABLES) motivos.push(`Hay ${n} comparable(s); se necesitan al menos ${MINIMO_COMPARABLES}.`);
  motivos.push(
    `Los comparables varían ${Math.round(dispersion * 100)}% entre sí ${
      dispersion <= 0.12 ? "(muestra pareja)" : dispersion <= 0.2 ? "(variación moderada)" : "(muy dispares: buscá comparables más parecidos)"
    }.`
  );
  motivos.push(
    cierres
      ? `${cierres} venta(s) cerrada(s) en la muestra.`
      : "No hay ventas cerradas: todos son publicaciones (precio de oferta, no de cierre)."
  );
  if (previas) motivos.push(`${previas} tasación(es) anterior(es) de Orion usadas como comparable.`);
  if (atipicos) motivos.push(`${atipicos} comparable(s) se alejan más de 25% del resto: revisalos o reemplazalos.`);

  return {
    unidad,
    superficieSujeto: supS,
    comparables: calc,
    promedio,
    dispersion,
    valorCierre,
    rangoMin: redondear(valorCierre * (1 - margen)),
    rangoMax: redondear(valorCierre * (1 + margen)),
    // Publicación: el cierre + el mismo margen de negociación que se le
    // descuenta a las publicaciones (10%).
    valorPublicacion: redondear(valorCierre / (1 - DESCUENTO_DINAMICO)),
    confiabilidad,
    motivos,
  };
}

export const CONFIABILIDAD_LABEL: Record<Confiabilidad, { texto: string; clase: string }> = {
  ALTA: { texto: "Alta", clase: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  MEDIA: { texto: "Media", clase: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  BAJA: { texto: "Baja", clase: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

/** Datos extra que se guardan con la tasación (columna "detalle"). */
/** Datos de la ficha para el informe (no entran en el cálculo). */
export type FichaTasacion = {
  propietario?: string;
  telefono?: string;
  padron?: string;
  dormitorios?: number;
  banos?: number;
  antiguedad?: number;
  descripcion?: string;
};

export type DetalleTasacion = {
  categoria: Categoria;
  zonaTipo: ZonaTipo;
  departamento: string | null;
  sujeto: Omit<Medidas, "m2">;
};

export const DEPARTAMENTOS_UY = [
  "Montevideo", "Canelones", "Maldonado", "Colonia", "San José", "Rocha", "Florida", "Lavalleja",
  "Durazno", "Flores", "Soriano", "Río Negro", "Paysandú", "Salto", "Artigas", "Rivera",
  "Tacuarembó", "Cerro Largo", "Treinta y Tres",
];

export function formatoUsd(n: number) {
  return `USD ${Math.round(n).toLocaleString("es-UY")}`;
}

export function formatoSuperficie(n: number, unidad: "m²" | "ha") {
  return `${(Math.round(n * 10) / 10).toLocaleString("es-UY")} ${unidad}`;
}
