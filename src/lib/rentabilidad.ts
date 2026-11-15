// Rentabilidad y valor por capitalización de renta.
//
// Renta bruta anual   = alquiler mensual × (12 − meses vacíos)
// Gastos del dueño    = contribución + primaria + otros fijos + mantenimiento
//                       + administración (% del alquiler cobrado)
// Renta neta (NOI)    = renta bruta − gastos del dueño          (antes de IRPF)
// Rentabilidad bruta  = alquiler × 12 / precio
// Rentabilidad neta   = renta neta / precio
// Valor por renta     = renta neta / tasa de capitalización
//
// IRPF (Uruguay, persona física): 12% sobre la renta cobrada menos los gastos
// deducibles (contribución, primaria y administración). Se muestra aparte:
// las tasas de capitalización de mercado se miden antes de impuestos.

export type DatosRenta = {
  /** Alquiler mensual en USD. */
  alquilerMensual: number;
  /** Meses al año sin inquilino (vacancia). */
  mesesVacios?: number;
  contribucionAnual?: number;
  primariaAnual?: number;
  /** Gastos comunes a cargo del dueño, seguro, etc. (USD por año). */
  otrosGastosAnuales?: number;
  /** % del alquiler para mantenimiento / reparaciones. */
  mantenimientoPct?: number;
  /** % de honorarios de administración. */
  administracionPct?: number;
};

export type ResultadoRenta = {
  rentaBruta: number;
  gastos: number;
  rentaNeta: number;
  irpf: number;
  rentaNetaDespuesIrpf: number;
};

export const IRPF_ARRENDAMIENTOS = 0.12;

export function calcularRenta(d: DatosRenta): ResultadoRenta {
  const meses = Math.max(0, 12 - Math.min(12, d.mesesVacios ?? 0));
  const rentaBruta = (d.alquilerMensual || 0) * meses;
  const administracion = rentaBruta * ((d.administracionPct ?? 0) / 100);
  const mantenimiento = rentaBruta * ((d.mantenimientoPct ?? 0) / 100);
  const fijos = (d.contribucionAnual ?? 0) + (d.primariaAnual ?? 0) + (d.otrosGastosAnuales ?? 0);
  const gastos = administracion + mantenimiento + fijos;
  const rentaNeta = rentaBruta - gastos;
  const deducibles = administracion + (d.contribucionAnual ?? 0) + (d.primariaAnual ?? 0);
  const irpf = Math.max(0, rentaBruta - deducibles) * IRPF_ARRENDAMIENTOS;
  return { rentaBruta, gastos, rentaNeta, irpf, rentaNetaDespuesIrpf: rentaNeta - irpf };
}

export type Rentabilidad = ResultadoRenta & {
  bruta: number; // 0,08 = 8%
  neta: number;
  netaDespuesIrpf: number;
  anosRecupero: number | null;
};

export function calcularRentabilidad(precio: number, d: DatosRenta): Rentabilidad | null {
  if (!precio || !d.alquilerMensual) return null;
  const r = calcularRenta(d);
  return {
    ...r,
    bruta: (d.alquilerMensual * 12) / precio,
    neta: r.rentaNeta / precio,
    netaDespuesIrpf: r.rentaNetaDespuesIrpf / precio,
    anosRecupero: r.rentaNeta > 0 ? precio / r.rentaNeta : null,
  };
}

/** Valor por capitalización (tasa en %, ej. 8 = 8%). */
export function valorPorRenta(d: DatosRenta, tasaPct: number): number {
  if (!tasaPct) return 0;
  return Math.round(calcularRenta(d).rentaNeta / (tasaPct / 100));
}

/**
 * Tasas de capitalización de referencia (netas, antes de impuestos) por tipo.
 * Son orientativas: cada agente debe ajustarlas a su zona y al inquilino.
 */
export const TASAS_REFERENCIA: { tipo: string; min: number; max: number; nota: string }[] = [
  { tipo: "Vivienda (apartamento, casa)", min: 4.5, max: 6, nota: "más baja en zonas muy buscadas" },
  { tipo: "Oficina", min: 6, max: 7.5, nota: "según edificio y plazo del contrato" },
  { tipo: "Local comercial", min: 6.5, max: 8.5, nota: "esquina y avenida, más baja; barrio, más alta" },
  { tipo: "Galpón / depósito", min: 7.5, max: 9.5, nota: "según accesos y altura" },
  { tipo: "Campo (arrendamiento)", min: 2.5, max: 4, nota: "renta por hectárea sobre valor de la tierra" },
];

/** Tasa sugerida para arrancar, según la categoría de la tasación. */
export function tasaSugerida(categoria: string | null): number {
  switch (categoria) {
    case "COMERCIAL":
      return 7.5;
    case "APARTAMENTO":
      return 5.5;
    case "CASA":
      return 5;
    case "CAMPO":
    case "CHACRA":
      return 3;
    case "TERRENO":
      return 5;
    default:
      return 6;
  }
}

export const pct = (n: number, dec = 1) => `${(n * 100).toLocaleString("es-UY", { maximumFractionDigits: dec, minimumFractionDigits: dec })}%`;

// --- Formulario (montos en USD o en pesos con cotización) ---

export type FormRenta = {
  moneda: "USD" | "UYU";
  cotizacion?: number;
  alquilerMensual?: number;
  mesesVacios?: number;
  contribucionAnual?: number;
  primariaAnual?: number;
  otrosGastosAnuales?: number;
  mantenimientoPct?: number;
  administracionPct?: number;
};

export const RENTA_VACIA: FormRenta = { moneda: "USD", mesesVacios: 1, mantenimientoPct: 3, administracionPct: 0 };

/** Pasa el formulario a dólares (null si falta el alquiler o la cotización). */
export function aDatosRenta(f: FormRenta): DatosRenta | null {
  if (!f.alquilerMensual) return null;
  const k = f.moneda === "UYU" ? (f.cotizacion && f.cotizacion > 0 ? 1 / f.cotizacion : null) : 1;
  if (!k) return null;
  return {
    alquilerMensual: f.alquilerMensual * k,
    mesesVacios: f.mesesVacios,
    contribucionAnual: (f.contribucionAnual ?? 0) * k,
    primariaAnual: (f.primariaAnual ?? 0) * k,
    otrosGastosAnuales: (f.otrosGastosAnuales ?? 0) * k,
    mantenimientoPct: f.mantenimientoPct,
    administracionPct: f.administracionPct,
  };
}


export type RentaGuardada = FormRenta & { tasa: number; valor: number };

/**
 * Valor final de la tasación: por comparables, por renta o, si hay los dos,
 * conciliado (promedio simple de ambos métodos).
 */
export function valorFinal(
  comparables: number | null,
  renta: number | null
): { valor: number; metodo: "COMPARABLES" | "RENTA" | "CONCILIADO" } | null {
  if (comparables && renta) return { valor: Math.round((comparables + renta) / 2), metodo: "CONCILIADO" };
  if (comparables) return { valor: comparables, metodo: "COMPARABLES" };
  if (renta) return { valor: renta, metodo: "RENTA" };
  return null;
}

export const METODO_LABEL = {
  COMPARABLES: "Por comparables",
  RENTA: "Por capitalización de renta",
  CONCILIADO: "Conciliado (promedio de comparables y renta)",
} as const;
