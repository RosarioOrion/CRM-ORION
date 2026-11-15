// Mis finanzas: categorías, resumen del mes y consejos del Money Day.
// Todo en pesos: lo cargado en dólares se pasa con la cotización del mes.

export type TipoMovimiento = "INGRESO" | "GASTO";
// Las 5 categorías del Manual Orion (Capítulo 17) + ingresos.
export type Grupo = "INGRESO" | "FIJOS" | "VARIABLES" | "NEGOCIO" | "IMPUESTOS" | "AHORRO";
export type Moneda = "UYU" | "USD";

/** Grupos de egresos, en el orden del manual. */
export const GRUPOS_EGRESO: Grupo[] = ["FIJOS", "VARIABLES", "NEGOCIO", "IMPUESTOS", "AHORRO"];

// Las claves de categoría no cambian (los movimientos guardados siguen valiendo).
export const CATEGORIAS: { clave: string; label: string; grupo: Grupo; icono: string }[] = [
  { clave: "COMISION", label: "Comisiones", grupo: "INGRESO", icono: "🤝" },
  { clave: "OTRO_INGRESO", label: "Otros ingresos", grupo: "INGRESO", icono: "➕" },
  { clave: "VIVIENDA", label: "Vivienda (alquiler o cuota, gastos comunes)", grupo: "FIJOS", icono: "🏠" },
  { clave: "SERVICIOS", label: "Servicios (UTE, OSE, internet)", grupo: "FIJOS", icono: "💡" },
  { clave: "SALUD", label: "Mutualista y seguros", grupo: "FIJOS", icono: "🩺" },
  { clave: "DEUDAS", label: "Cuotas, tarjetas y préstamos", grupo: "FIJOS", icono: "💳" },
  { clave: "SUPERMERCADO", label: "Supermercado", grupo: "VARIABLES", icono: "🛒" },
  { clave: "TRANSPORTE_PERSONAL", label: "Transporte personal", grupo: "VARIABLES", icono: "🚌" },
  { clave: "OCIO", label: "Salidas y gustos", grupo: "VARIABLES", icono: "🎉" },
  { clave: "FAMILIA", label: "Ropa, regalos y familia", grupo: "VARIABLES", icono: "🎁" },
  { clave: "OTROS_PERSONALES", label: "Otros (y gastos hormiga)", grupo: "VARIABLES", icono: "🧾" },
  { clave: "TELEFONO", label: "Celular y datos", grupo: "NEGOCIO", icono: "📱" },
  { clave: "TRANSPORTE", label: "Combustible y traslados", grupo: "NEGOCIO", icono: "🚗" },
  { clave: "PUBLICIDAD", label: "Publicidad y portales", grupo: "NEGOCIO", icono: "📣" },
  { clave: "OTROS_TRABAJO", label: "Herramientas", grupo: "NEGOCIO", icono: "🧰" },
  { clave: "CAPACITACION", label: "Formación", grupo: "NEGOCIO", icono: "📚" },
  { clave: "IMPUESTOS", label: "Impuestos y aportes", grupo: "IMPUESTOS", icono: "🏛️" },
  { clave: "COLCHON", label: "Colchón (para tu sueldo fijo)", grupo: "AHORRO", icono: "🛏️" },
  { clave: "FONDO", label: "Fondo de emergencia", grupo: "AHORRO", icono: "🛟" },
  { clave: "AHORRO", label: "Ahorro e inversión", grupo: "AHORRO", icono: "🐷" },
];

export const GRUPO_LABEL: Record<Grupo, string> = {
  INGRESO: "Ingresos",
  FIJOS: "1. Fijos personales",
  VARIABLES: "2. Variables personales",
  NEGOCIO: "3. Negocio",
  IMPUESTOS: "4. Impuestos y aportes",
  AHORRO: "5. Ahorro e inversión",
};

export const categoria = (clave: string) => CATEGORIAS.find((c) => c.clave === clave);
export const tipoDeCategoria = (clave: string): TipoMovimiento =>
  categoria(clave)?.grupo === "INGRESO" ? "INGRESO" : "GASTO";

export type MovimientoMin = {
  tipo: string;
  categoria: string;
  monto: number;
  moneda: string;
  oculto?: boolean;
};

export function aPesos(monto: number, moneda: string, cotizacion: number | null): number | null {
  if (moneda === "USD") return cotizacion ? monto * cotizacion : null;
  return monto;
}

export type ResumenMes = {
  ingresos: number;
  porGrupo: Record<Grupo, number>;
  /** Fijos + variables + negocio. */
  gastos: number;
  /** Impuestos + ahorro (lo que se separa). */
  separado: number;
  /** Ingresos − todo lo que salió o se separó. */
  saldo: number;
  porCategoria: Record<string, number>;
  /** Hay montos en dólares y no hay cotización: no se pueden sumar. */
  faltaCotizacion: boolean;
  dolaresSinConvertir: number;
};

export function resumirMes(movs: MovimientoMin[], cotizacion: number | null): ResumenMes {
  const porGrupo: Record<Grupo, number> = { INGRESO: 0, FIJOS: 0, VARIABLES: 0, NEGOCIO: 0, IMPUESTOS: 0, AHORRO: 0 };
  const r: ResumenMes = {
    ingresos: 0,
    porGrupo,
    gastos: 0,
    separado: 0,
    saldo: 0,
    porCategoria: {},
    faltaCotizacion: false,
    dolaresSinConvertir: 0,
  };
  for (const m of movs) {
    if (m.oculto) continue;
    const p = aPesos(m.monto, m.moneda, cotizacion);
    if (p === null) {
      r.faltaCotizacion = true;
      r.dolaresSinConvertir += m.monto;
      continue;
    }
    r.porCategoria[m.categoria] = (r.porCategoria[m.categoria] ?? 0) + p;
    const g = categoria(m.categoria)?.grupo ?? (m.tipo === "INGRESO" ? "INGRESO" : "VARIABLES");
    porGrupo[g] += p;
  }
  r.ingresos = porGrupo.INGRESO;
  r.gastos = porGrupo.FIJOS + porGrupo.VARIABLES + porGrupo.NEGOCIO;
  r.separado = porGrupo.IMPUESTOS + porGrupo.AHORRO;
  r.saldo = r.ingresos - r.gastos - r.separado;
  return r;
}

/**
 * Consejos del Money Day: describen los números del mes y remiten al Manual
 * Orion (Capítulos 15 a 19). No imponen porcentajes: cada agente decide su
 * reparto según su situación.
 */
export function consejosDelMes(opts: {
  resumen: ResumenMes;
  presupuesto: Record<string, number>;
  /** Fondo de emergencia acumulado (en pesos). */
  fondoAcumulado: number;
  /** Gasto mensual promedio (fijos + variables) de los últimos meses. */
  gastoPromedio: number;
}): { tono: "bien" | "atencion" | "info"; texto: string }[] {
  const { resumen: r, presupuesto, fondoAcumulado, gastoPromedio } = opts;
  const out: { tono: "bien" | "atencion" | "info"; texto: string }[] = [];

  if (r.ingresos > 0) {
    const ahorro = Math.round((r.porGrupo.AHORRO / r.ingresos) * 100);
    if (ahorro > 0)
      out.push({ tono: "bien", texto: `Separaste el ${ahorro}% de lo que entró para colchón, fondo y ahorro. Págate primero (Cap. 15).` });
    else
      out.push({ tono: "atencion", texto: "Este mes no registraste nada en Ahorro e inversión. El Cap. 15 propone empezar aunque sea con poco, el mismo día que cobrás." });
    const negocio = Math.round((r.porGrupo.NEGOCIO / r.ingresos) * 100);
    if (negocio > 0) out.push({ tono: "info", texto: `Tu negocio te costó el ${negocio}% de lo que cobraste este mes (Cap. 17: separá siempre negocio y personal).` });
  } else {
    out.push({ tono: "info", texto: "Este mes no entraron ingresos: para estos meses está el colchón (Cap. 18)." });
  }

  if (r.saldo < 0)
    out.push({ tono: "atencion", texto: `Salió ${pesos(-r.saldo)} más de lo que entró. ¿Qué pasó y qué ajustás? (Cap. 17)` });

  const pasados = Object.entries(presupuesto)
    .filter(([k, v]) => v > 0 && (r.porCategoria[k] ?? 0) > v * 1.1)
    .map(([k, v]) => ({ k, extra: (r.porCategoria[k] ?? 0) / v - 1 }))
    .sort((a, b) => b.extra - a.extra)
    .slice(0, 2);
  for (const p of pasados)
    out.push({ tono: "atencion", texto: `${categoria(p.k)?.label ?? p.k}: gastaste ${Math.round(p.extra * 100)}% más de lo previsto. ¿Fue excepcional o se repite?` });

  if (gastoPromedio > 0 && fondoAcumulado > 0) {
    const meses = (fondoAcumulado / gastoPromedio).toLocaleString("es-UY", { maximumFractionDigits: 1 });
    out.push({ tono: "info", texto: `Tu fondo de emergencia cubre ${meses} meses de tus gastos personales. El Cap. 19 explica cuánto conviene tener.` });
  }
  if (!out.some((c) => c.tono === "atencion")) out.push({ tono: "bien", texto: "¡Buen mes! Reconocé tu logro antes de planear el siguiente (Cap. 17)." });
  return out;
}

export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function mesLabel(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} ${a}`;
}

export function mesSiguiente(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
}

export function mesAnterior(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

/** Hoy en Uruguay: clave del mes, día y si es el último día del mes. */
export function hoyUY(ahora: Date = new Date()): { mes: string; dia: number; ultimoDia: boolean; fecha: string } {
  const uy = new Date(ahora.getTime() - 3 * 3600 * 1000);
  const a = uy.getUTCFullYear();
  const m = uy.getUTCMonth() + 1;
  const dia = uy.getUTCDate();
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const mes = `${a}-${String(m).padStart(2, "0")}`;
  return { mes, dia, ultimoDia: dia === ultimo, fecha: `${mes}-${String(dia).padStart(2, "0")}` };
}

export const pesos = (n: number) => `$ ${Math.round(n).toLocaleString("es-UY")}`;
