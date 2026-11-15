// Mis finanzas: categorías, resumen del mes y consejos del Money Day.
// Todo en pesos: lo cargado en dólares se pasa con la cotización del mes.

export type TipoMovimiento = "INGRESO" | "GASTO";
export type Grupo = "INGRESO" | "TRABAJO" | "PERSONAL" | "RESERVA";
export type Moneda = "UYU" | "USD";

export const CATEGORIAS: { clave: string; label: string; grupo: Grupo; icono: string }[] = [
  { clave: "COMISION", label: "Comisiones", grupo: "INGRESO", icono: "🤝" },
  { clave: "OTRO_INGRESO", label: "Otros ingresos", grupo: "INGRESO", icono: "➕" },
  { clave: "PUBLICIDAD", label: "Publicidad y portales", grupo: "TRABAJO", icono: "📣" },
  { clave: "TRANSPORTE", label: "Transporte y combustible", grupo: "TRABAJO", icono: "🚗" },
  { clave: "TELEFONO", label: "Celular e internet", grupo: "TRABAJO", icono: "📱" },
  { clave: "CAPACITACION", label: "Capacitación", grupo: "TRABAJO", icono: "📚" },
  { clave: "OTROS_TRABAJO", label: "Otros del trabajo", grupo: "TRABAJO", icono: "💼" },
  { clave: "VIVIENDA", label: "Vivienda (alquiler o cuota, UTE, OSE)", grupo: "PERSONAL", icono: "🏠" },
  { clave: "SUPERMERCADO", label: "Comida y supermercado", grupo: "PERSONAL", icono: "🛒" },
  { clave: "SALUD", label: "Salud", grupo: "PERSONAL", icono: "🩺" },
  { clave: "FAMILIA", label: "Familia y educación", grupo: "PERSONAL", icono: "👨‍👩‍👧" },
  { clave: "OCIO", label: "Salidas y ocio", grupo: "PERSONAL", icono: "🎉" },
  { clave: "DEUDAS", label: "Tarjetas y deudas", grupo: "PERSONAL", icono: "💳" },
  { clave: "OTROS_PERSONALES", label: "Otros personales", grupo: "PERSONAL", icono: "🧾" },
  { clave: "IMPUESTOS", label: "Impuestos y aportes (BPS, IRPF…)", grupo: "RESERVA", icono: "🏛️" },
  { clave: "FONDO", label: "Fondo para meses flojos", grupo: "RESERVA", icono: "🛟" },
  { clave: "AHORRO", label: "Ahorro e inversión", grupo: "RESERVA", icono: "🐷" },
];

export const GRUPO_LABEL: Record<Grupo, string> = {
  INGRESO: "Ingresos",
  TRABAJO: "Gastos del trabajo",
  PERSONAL: "Gastos personales",
  RESERVA: "Reservas (ahorro, fondo e impuestos)",
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
  trabajo: number;
  personal: number;
  reservas: number;
  /** Ingresos − gastos − reservas (lo que quedó suelto). */
  saldo: number;
  porCategoria: Record<string, number>;
  /** Hay montos en dólares y no hay cotización: no se pueden sumar. */
  faltaCotizacion: boolean;
  dolaresSinConvertir: number;
};

export function resumirMes(movs: MovimientoMin[], cotizacion: number | null): ResumenMes {
  const r: ResumenMes = {
    ingresos: 0,
    trabajo: 0,
    personal: 0,
    reservas: 0,
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
    const g = categoria(m.categoria)?.grupo ?? (m.tipo === "INGRESO" ? "INGRESO" : "PERSONAL");
    if (g === "INGRESO") r.ingresos += p;
    else if (g === "TRABAJO") r.trabajo += p;
    else if (g === "PERSONAL") r.personal += p;
    else r.reservas += p;
  }
  r.saldo = r.ingresos - r.trabajo - r.personal - r.reservas;
  return r;
}

/** Consejos del Money Day, en base a los números del mes (sin juzgar). */
export function consejosDelMes(opts: {
  resumen: ResumenMes;
  presupuesto: Record<string, number>;
  /** Fondo para meses flojos acumulado (en pesos). */
  fondoAcumulado: number;
  /** Gasto mensual promedio (trabajo + personal) de los últimos meses. */
  gastoPromedio: number;
}): { tono: "bien" | "atencion" | "info"; texto: string }[] {
  const { resumen: r, presupuesto, fondoAcumulado, gastoPromedio } = opts;
  const out: { tono: "bien" | "atencion" | "info"; texto: string }[] = [];
  const pesos = (n: number) => `$ ${Math.round(n).toLocaleString("es-UY")}`;

  if (r.ingresos > 0) {
    const ahorro = Math.round((((r.porCategoria.AHORRO ?? 0) + (r.porCategoria.FONDO ?? 0)) / r.ingresos) * 100);
    if (ahorro >= 20) out.push({ tono: "bien", texto: `Separaste el ${ahorro}% de lo que entró para ahorro y fondo. ¡Excelente!` });
    else if (ahorro >= 10) out.push({ tono: "bien", texto: `Separaste el ${ahorro}% para ahorro y fondo. La meta es llegar al 20%.` });
    else out.push({ tono: "atencion", texto: `Este mes separaste ${ahorro}% para ahorro y fondo. Probá apartar al menos el 10% apenas cobrás, antes de gastar.` });
    if (!r.porCategoria.IMPUESTOS)
      out.push({ tono: "atencion", texto: "No separaste nada para impuestos y aportes: conviene apartarlo al cobrar cada comisión, así no te sorprende." });
    const trabajo = r.trabajo / r.ingresos;
    if (trabajo > 0.25) out.push({ tono: "info", texto: `Los gastos del trabajo fueron el ${Math.round(trabajo * 100)}% de lo que cobraste. Revisá cuáles te traen clientes y cuáles no.` });
  } else {
    out.push({ tono: "info", texto: "Este mes no entraron ingresos: es justo para estos meses que sirve el fondo para meses flojos." });
  }

  if (r.saldo < 0) out.push({ tono: "atencion", texto: `Saliste ${pesos(-r.saldo)} más de lo que entró. Mirá en qué categoría se fue y ajustá el presupuesto del mes que viene.` });

  const pasados = Object.entries(presupuesto)
    .filter(([k, v]) => v > 0 && (r.porCategoria[k] ?? 0) > v * 1.1)
    .map(([k, v]) => ({ k, extra: (r.porCategoria[k] ?? 0) / v - 1 }))
    .sort((a, b) => b.extra - a.extra)
    .slice(0, 2);
  for (const p of pasados)
    out.push({ tono: "atencion", texto: `${categoria(p.k)?.label ?? p.k}: gastaste ${Math.round(p.extra * 100)}% más de lo previsto.` });

  if (gastoPromedio > 0) {
    const meses = fondoAcumulado / gastoPromedio;
    if (meses >= 3) out.push({ tono: "bien", texto: `Tu fondo para meses flojos cubre ${meses.toLocaleString("es-UY", { maximumFractionDigits: 1 })} meses de gastos. ¡Meta cumplida!` });
    else out.push({ tono: "info", texto: `Tu fondo para meses flojos cubre ${meses.toLocaleString("es-UY", { maximumFractionDigits: 1 })} meses de gastos. La meta es 3 a 6 meses.` });
  }
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
