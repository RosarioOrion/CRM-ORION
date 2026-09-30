/**
 * Cadencia del Pipeline: 14 semanas para Venta, 7 semanas para Alquiler,
 * transcriptas del manual de Rosario ("Plan 13 semanas" venta / "Plan 7
 * semanas alquileres high ticket"). La última semana de cada ciclo es la
 * "Entrevista crítica" — decisión sobre la continuidad del trabajo — no una
 * acción más.
 */

export const CATEGORIAS_PIPELINE = [
  "SEGUIMIENTO_DUENO",
  "MARKETING",
  "VENTAS_NEGOCIACION",
  "REPORTE",
] as const;

export type CategoriaPipeline = (typeof CATEGORIAS_PIPELINE)[number];

export const CATEGORIA_PIPELINE_LABEL: Record<CategoriaPipeline, string> = {
  SEGUIMIENTO_DUENO: "Seguimiento con el dueño",
  MARKETING: "Marketing y promoción",
  VENTAS_NEGOCIACION: "Ventas y negociación",
  REPORTE: "Reporte y análisis",
};

export const CATEGORIA_PIPELINE_ICONO: Record<CategoriaPipeline, string> = {
  SEGUIMIENTO_DUENO: "📞",
  MARKETING: "📣",
  VENTAS_NEGOCIACION: "🤝",
  REPORTE: "📊",
};

export type AccionesSemana = Record<CategoriaPipeline, string>;

const ENTREVISTA_CRITICA =
  "Entrevista crítica — decisión sobre la continuidad del trabajo.";

// --- Venta: 14 semanas -------------------------------------------------

const CADENCIA_VENTA: Record<number, AccionesSemana> = {
  1: {
    SEGUIMIENTO_DUENO:
      "Preparación del negocio (revisión de títulos, regularizaciones, etc). Home staging recomendado.",
    MARKETING:
      "Material gráfico profesional + publicación en portales, RRSS, cartel físico.",
    VENTAS_NEGOCIACION: "Definir guión para manejo de objeciones y técnicas básicas para cierre.",
    REPORTE: "—",
  },
  2: {
    SEGUIMIENTO_DUENO: "Viernes: informe telefónico al dueño de novedades de la semana.",
    MARKETING: "Compartir con inmobiliarias colegas + seguimiento interesados + encuestas.",
    VENTAS_NEGOCIACION: "Aplicar técnicas de seguimiento, objeciones y negociación inicial.",
    REPORTE: "Reporte.",
  },
  3: {
    SEGUIMIENTO_DUENO: "Viernes: informe telefónico al dueño de novedades de la semana.",
    MARKETING: "Seguimiento interesados + encuestas.",
    VENTAS_NEGOCIACION: "Seguimiento con interesados, manejo de objeciones y negociación inicial.",
    REPORTE: "Reporte.",
  },
  4: {
    SEGUIMIENTO_DUENO: "Viernes: informe telefónico al dueño de novedades de la semana.",
    MARKETING: "Análisis competitivo, posible ajuste de precio + REPUBLICAR.",
    VENTAS_NEGOCIACION: "Evaluar ofertas y negociar incentivos o ajustes.",
    REPORTE: "Reporte.",
  },
  5: {
    SEGUIMIENTO_DUENO: "Viernes: reunión personal con el dueño.",
    MARKETING:
      "Generar contenido orgánico sobre la zona/edificio para redes o WhatsApp a interesados.",
    VENTAS_NEGOCIACION: "Negociación avanzada y ajustes de ofertas.",
    REPORTE: "Reunión con el dueño. Analizar datos disponibles y proponer corrección de precios.",
  },
  6: {
    SEGUIMIENTO_DUENO: "Viernes: informe telefónico al dueño de novedades de la semana.",
    MARKETING: "Seguimiento intensivo. Comunicación de ajuste de precio a interesados si lo hubo.",
    VENTAS_NEGOCIACION: "Manejo avanzado de objeciones y ofertas.",
    REPORTE: "Reporte.",
  },
  7: {
    SEGUIMIENTO_DUENO: "Viernes: informe telefónico al dueño de novedades de la semana.",
    MARKETING: "Llamar inmobiliarias con propiedades similares.",
    VENTAS_NEGOCIACION: "Negociación para cierre efectivo.",
    REPORTE: "Reporte.",
  },
  8: {
    SEGUIMIENTO_DUENO: "Viernes: informe telefónico al dueño de novedades de la semana.",
    MARKETING: "Mejorar la publicidad en portales y RRSS + REPUBLICAR.",
    VENTAS_NEGOCIACION: "Negociación para cierre efectivo.",
    REPORTE: "Reporte.",
  },
  9: {
    SEGUIMIENTO_DUENO: "Viernes: reunión personal con el dueño.",
    MARKETING:
      "Seguimiento intensivo. Comunicación de ajuste de precio a interesados si lo hubo.",
    VENTAS_NEGOCIACION: "Cierre de ofertas y preparación de documentación.",
    REPORTE: "Reunión con el dueño. Analizar datos disponibles y proponer corrección de precios.",
  },
  10: {
    SEGUIMIENTO_DUENO: "Viernes: informe telefónico al dueño de novedades de la semana.",
    MARKETING: "Preparar material para cierre y testimonios.",
    VENTAS_NEGOCIACION: "Finalización de negociaciones.",
    REPORTE: "Reporte.",
  },
  11: {
    SEGUIMIENTO_DUENO: "Viernes: informe telefónico al dueño de novedades de la semana.",
    MARKETING: "Cierre de campañas y reforzar reputación online.",
    VENTAS_NEGOCIACION: "Logística para escritura y entrega.",
    REPORTE: "Reporte.",
  },
  12: {
    SEGUIMIENTO_DUENO: "Viernes: informe telefónico al dueño de novedades de la semana.",
    MARKETING: "Seguimiento postventa y solicitud de testimonios.",
    VENTAS_NEGOCIACION: "Confirmación de cierre y seguimiento.",
    REPORTE: "Reporte.",
  },
  13: {
    SEGUIMIENTO_DUENO: "Viernes: reunión personal con el dueño.",
    MARKETING: "Seguimiento postventa y solicitud de testimonios.",
    VENTAS_NEGOCIACION: "Postventa y referidos.",
    REPORTE: "Reunión con el dueño. Analizar datos disponibles y proponer corrección de precios.",
  },
  14: {
    SEGUIMIENTO_DUENO: ENTREVISTA_CRITICA,
    MARKETING: ENTREVISTA_CRITICA,
    VENTAS_NEGOCIACION: ENTREVISTA_CRITICA,
    REPORTE: ENTREVISTA_CRITICA,
  },
};

// --- Alquiler: 7 semanas ------------------------------------------------

const CADENCIA_ALQUILER: Record<number, AccionesSemana> = {
  1: {
    SEGUIMIENTO_DUENO: "Preparación del negocio. Home staging recomendado.",
    MARKETING: "Material gráfico profesional + publicación en RRSS y portales. Difusión en base de datos.",
    VENTAS_NEGOCIACION: "Definir guión para manejo de objeciones y técnicas básicas para cierre.",
    REPORTE: "—",
  },
  2: {
    SEGUIMIENTO_DUENO: "Viernes: informe telefónico al dueño de novedades de la semana.",
    MARKETING: "Compartir con inmobiliarias colegas + seguimiento interesados.",
    VENTAS_NEGOCIACION: "Coordinación de visitas. Primer filtro de interesados. Seguimiento activo a cada contacto.",
    REPORTE: "Reporte.",
  },
  3: {
    SEGUIMIENTO_DUENO: "Viernes: informe telefónico al dueño de novedades de la semana.",
    MARKETING: "Análisis de consultas y visitas. Contacto con interesados previos. Re-publicación en portales.",
    VENTAS_NEGOCIACION: "Seguimiento con interesados, manejo de objeciones y negociación inicial.",
    REPORTE: "Reporte.",
  },
  4: {
    SEGUIMIENTO_DUENO: "Viernes: reunión personal con el propietario.",
    MARKETING: "Generación de contenido sobre la propiedad o la zona.",
    VENTAS_NEGOCIACION: "Trabajo sobre objeciones. Negociación para cierre efectivo.",
    REPORTE: "Reunión con el propietario. Analizar datos disponibles y proponer corrección de precios si no hubo el movimiento esperado.",
  },
  5: {
    SEGUIMIENTO_DUENO: "Viernes: informe telefónico al dueño de novedades de la semana.",
    MARKETING: "Cierre de campañas. Identificación de los interesados más firmes. Asesoramiento para seleccionar el mejor perfil.",
    VENTAS_NEGOCIACION: "Gestión de propuestas. Cierre de ofertas. Definición de condiciones (precio, plazos, garantías). Preparación de documentación.",
    REPORTE: "Reporte.",
  },
  6: {
    SEGUIMIENTO_DUENO: "Viernes: informe telefónico al dueño de novedades de la semana.",
    MARKETING: "Seguimiento postventa y solicitud de testimonios.",
    VENTAS_NEGOCIACION: "Logística para firma de contrato de arrendamiento.",
    REPORTE: "Reporte.",
  },
  7: {
    SEGUIMIENTO_DUENO: ENTREVISTA_CRITICA,
    MARKETING: ENTREVISTA_CRITICA,
    VENTAS_NEGOCIACION: ENTREVISTA_CRITICA,
    REPORTE: ENTREVISTA_CRITICA,
  },
};

export const DURACION_CICLO: Record<"VENTA" | "ALQUILER", number> = {
  VENTA: 14,
  ALQUILER: 7,
};

// --- Alertas automáticas (igual que en Lumen OS) ------------------------

/** Mínimo objetivo de propiedades activas por agente (confirmado en Lumen OS). */
export const MINIMO_PROPIEDADES_ACTIVAS = 20;

/**
 * Días sin ajustar el precio a partir de los cuales se sugiere revisarlo.
 * Lumen OS lo marca a partir de ~3 semanas sin movimiento; no expone el
 * número exacto en pantalla, así que este umbral es una aproximación.
 */
export const UMBRAL_REVISAR_PRECIO_DIAS = 21;

/** Días sin seguimiento a partir de los cuales una propiedad se considera "estancada". */
export const UMBRAL_ESTANCADA_DIAS = 7;

/** Vencida: ya pasó todo el ciclo de cadencia (14 o 7 semanas) sin cerrar. */
export function estaVencido(dias: number, operacion: "VENTA" | "ALQUILER"): boolean {
  return dias > DURACION_CICLO[operacion] * 7;
}

export function diasEnMercado(fechaInicio: Date, ahora: Date = new Date()): number {
  const ms = ahora.getTime() - new Date(fechaInicio).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

/** Semana 1-based, capada en la duración total del ciclo. */
export function semanaActual(dias: number, operacion: "VENTA" | "ALQUILER"): number {
  const semana = Math.floor(dias / 7) + 1;
  return Math.min(semana, DURACION_CICLO[operacion]);
}

export function esSemanaFinal(semana: number, operacion: "VENTA" | "ALQUILER"): boolean {
  return semana >= DURACION_CICLO[operacion];
}

export function accionesDeLaSemana(
  operacion: "VENTA" | "ALQUILER",
  semana: number
): AccionesSemana {
  const tabla = operacion === "VENTA" ? CADENCIA_VENTA : CADENCIA_ALQUILER;
  const s = Math.min(Math.max(semana, 1), DURACION_CICLO[operacion]);
  return tabla[s];
}

/** Hoy es viernes en el huso horario de Montevideo (UTC-3, sin DST). */
export function esViernesHoy(ahora: Date = new Date()): boolean {
  const montevideo = new Date(ahora.getTime() - 3 * 60 * 60 * 1000);
  return montevideo.getUTCDay() === 5;
}

// --- Tareas que se repiten: seguimiento al dueño y republicar ----------
//
// No dependen de la semana del plan (que corre desde el día de ingreso) sino
// del calendario: se hacen los LUNES, cada semana o cada 15 días según la
// propiedad. Si un lunes no se hizo, queda atrasado (en rojo) hasta que se
// registre; al registrarlo, el próximo se cuenta desde el lunes de esa semana.

export const FRECUENCIAS_SEGUIMIENTO = [7, 14] as const;
export type FrecuenciaSeguimiento = (typeof FRECUENCIAS_SEGUIMIENTO)[number];

export const FRECUENCIA_LABEL: Record<FrecuenciaSeguimiento, string> = {
  7: "Todos los lunes",
  14: "Cada 15 días (lunes por medio)",
};

export function esFrecuencia(v: unknown): v is FrecuenciaSeguimiento {
  return v === 7 || v === 14;
}

const DIA_MS = 24 * 60 * 60 * 1000;

function inicioDelDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sumarDias(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Lunes (00:00) de la semana de `d`. */
export function lunesDe(d: Date): Date {
  const x = inicioDelDia(d);
  const desdeLunes = (x.getDay() + 6) % 7;
  return sumarDias(x, -desdeLunes);
}

/** Primer lunes en o después de `d`. */
export function primerLunesDesde(d: Date): Date {
  const x = inicioDelDia(d);
  const l = lunesDe(x);
  return l.getTime() === x.getTime() ? l : sumarDias(l, 7);
}

/**
 * Lunes en que toca la próxima vez. Sin registros previos: el primer lunes
 * desde que la propiedad entró al Pipeline. Con registros: el lunes de la
 * semana del último + la frecuencia.
 */
export function proximoLunesQueToca(
  ultima: Date | null,
  inicio: Date,
  frecuencia: number
): Date {
  if (!ultima) return primerLunesDesde(inicio);
  return sumarDias(lunesDe(ultima), frecuencia);
}

export type EstadoRecurrente = "PROXIMO" | "HECHO" | "HOY" | "ATRASADO";

export function estadoRecurrente(
  toca: Date,
  hayRegistro: boolean,
  ahora: Date
): EstadoRecurrente {
  const hoy = inicioDelDia(ahora).getTime();
  const t = inicioDelDia(toca).getTime();
  if (t > hoy) return hayRegistro ? "HECHO" : "PROXIMO";
  if (t === hoy) return "HOY";
  return "ATRASADO";
}

export function diasDeAtraso(toca: Date, ahora: Date): number {
  return Math.max(0, Math.round((inicioDelDia(ahora).getTime() - inicioDelDia(toca).getTime()) / DIA_MS));
}

/** ¿En esta semana del plan corresponde plantear un ajuste de precio al dueño? */
export function semanaPideAjuste(acciones: AccionesSemana): boolean {
  return Object.values(acciones).some((t) =>
    /posible ajuste de precio|proponer correcci[oó]n de precio/i.test(t)
  );
}

/** Texto corto para una fecha guardada en hora de Uruguay: "lun 06/10". */
export function fechaCorta(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  const dias = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const dd = String(x.getDate()).padStart(2, "0");
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  return `${dias[x.getDay()]} ${dd}/${mm}`;
}
