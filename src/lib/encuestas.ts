// Encuesta post-visita: preguntas, respuestas y resumen. Todo se responde
// con clics (el comentario es opcional). Lo usan la página pública
// /encuesta/<token>, la Agenda y la ficha de la propiedad.

export type RespuestasEncuesta = {
  propiedad: number; // 1 a 5 estrellas
  precio: string; // clave de OPCIONES_PRECIO
  gusto: string[]; // claves de OPCIONES_GUSTO
  noGusto: string[]; // claves de OPCIONES_NO_GUSTO
  interes: string; // clave de OPCIONES_INTERES
  atencion: number; // 1 a 5 estrellas
  comentario?: string;
};

type Opcion = { clave: string; label: string; emoji?: string };

export const OPCIONES_PRECIO: Opcion[] = [
  { clave: "BAJO", label: "Bajo", emoji: "👌" },
  { clave: "ADECUADO", label: "Adecuado", emoji: "✅" },
  { clave: "ALTO", label: "Alto", emoji: "📈" },
];

export const OPCIONES_GUSTO: Opcion[] = [
  { clave: "UBICACION", label: "Ubicación", emoji: "📍" },
  { clave: "LUZ", label: "Luz natural", emoji: "☀️" },
  { clave: "DISTRIBUCION", label: "Tamaño y distribución", emoji: "📐" },
  { clave: "ESTADO", label: "Estado / terminaciones", emoji: "✨" },
  { clave: "VISTA", label: "Vista", emoji: "🌅" },
  { clave: "AMENITIES", label: "Amenities / edificio", emoji: "🏊" },
  { clave: "PRECIO", label: "Precio", emoji: "💰" },
  { clave: "EXTERIOR", label: "Patio / balcón / terraza", emoji: "🌿" },
];

export const OPCIONES_NO_GUSTO: Opcion[] = [
  { clave: "PRECIO", label: "Precio", emoji: "💰" },
  { clave: "TAMANO", label: "Tamaño", emoji: "📏" },
  { clave: "ESTADO", label: "Necesita arreglos", emoji: "🔧" },
  { clave: "UBICACION", label: "Ubicación", emoji: "📍" },
  { clave: "LUZ", label: "Poca luz / orientación", emoji: "🌥️" },
  { clave: "RUIDO", label: "Ruido", emoji: "🔊" },
  { clave: "GASTOS", label: "Gastos comunes", emoji: "🧾" },
  { clave: "NADA", label: "Nada en particular", emoji: "👍" },
];

// En venta el paso siguiente es una oferta; en alquiler, señar. Las claves
// son las mismas para poder resumir igual.
export type Operacion = "VENTA" | "ALQUILER";

export const OPCIONES_INTERES: Opcion[] = [
  { clave: "TENGO_OFERTA", label: "Ya tengo una oferta para pasar", emoji: "🤝" },
  { clave: "EVALUANDO", label: "Sí, estoy evaluando una oferta", emoji: "🤔" },
  { clave: "SEGUNDA_VISITA", label: "Quiero una segunda visita", emoji: "🔁" },
  { clave: "DESCARTADA", label: "Sigo buscando, la propiedad queda descartada", emoji: "🔍" },
];

const OPCIONES_INTERES_ALQUILER: Opcion[] = [
  { clave: "TENGO_OFERTA", label: "Quiero señarla", emoji: "🤝" },
  { clave: "EVALUANDO", label: "Estoy evaluando señarla", emoji: "🤔" },
  { clave: "SEGUNDA_VISITA", label: "Quiero una segunda visita", emoji: "🔁" },
  { clave: "DESCARTADA", label: "Sigo buscando, la propiedad queda descartada", emoji: "🔍" },
];

export function opcionesInteres(operacion: string): Opcion[] {
  return operacion === "ALQUILER" ? OPCIONES_INTERES_ALQUILER : OPCIONES_INTERES;
}

/** Textos de las preguntas que cambian según la operación. */
export function textosEncuesta(operacion: string) {
  const alquiler = operacion === "ALQUILER";
  return {
    precio: alquiler ? "💰 El valor del alquiler te parece…" : "💰 El precio te parece…",
    interes: alquiler ? "🏠 ¿Te gustaría alquilarla?" : "🏠 ¿Ofertarías por esta propiedad?",
  };
}

export function etiqueta(opciones: Opcion[], clave: string | undefined) {
  const o = opciones.find((x) => x.clave === clave);
  return o ? `${o.emoji ?? ""} ${o.label}`.trim() : "";
}

/** Valida lo que manda el cliente; devuelve null si falta algo obligatorio. */
export function validarRespuestas(datos: unknown): RespuestasEncuesta | null {
  if (!datos || typeof datos !== "object") return null;
  const d = datos as Record<string, unknown>;
  const estrellas = (v: unknown) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5 ? (v as number) : null);
  const una = (v: unknown, ops: Opcion[]) => (typeof v === "string" && ops.some((o) => o.clave === v) ? v : null);
  const varias = (v: unknown, ops: Opcion[]) =>
    Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && ops.some((o) => o.clave === x)))] : [];

  const propiedad = estrellas(d.propiedad);
  const atencion = estrellas(d.atencion);
  const precio = una(d.precio, OPCIONES_PRECIO);
  const interes = una(d.interes, OPCIONES_INTERES);
  if (!propiedad || !atencion || !precio || !interes) return null;
  const comentario = typeof d.comentario === "string" ? d.comentario.trim().slice(0, 1000) : "";
  return {
    propiedad,
    precio,
    gusto: varias(d.gusto, OPCIONES_GUSTO),
    noGusto: varias(d.noGusto, OPCIONES_NO_GUSTO),
    interes,
    atencion,
    ...(comentario ? { comentario } : {}),
  };
}

/** Mensaje de WhatsApp con el link a la encuesta. */
export function mensajeEncuesta(v: { nombre: string; propiedad: string; link: string }) {
  const nombre = v.nombre.trim().split(/\s+/)[0] ?? "";
  return (
    `Hola${nombre ? ` ${nombre}` : ""}, ¡muchas gracias por visitar ${v.propiedad} con nosotros! 🏡\n` +
    `¿Me ayudás con una encuesta cortita? Son unos clics, no tenés que escribir nada 🙏\n` +
    v.link
  );
}

export type ResumenEncuestas = {
  respondidas: number;
  promedioPropiedad: number | null;
  promedioAtencion: number | null;
  precio: { label: string; cantidad: number }[];
  gusto: { label: string; cantidad: number }[];
  noGusto: { label: string; cantidad: number }[];
  interes: { label: string; cantidad: number }[];
};

/** Resumen de varias encuestas (para mostrarle al dueño). */
export function resumirEncuestas(lista: RespuestasEncuesta[], operacion: string): ResumenEncuestas {
  const promedio = (xs: number[]) =>
    xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;
  const contar = (ops: Opcion[], claves: string[]) =>
    ops
      .map((o) => ({ label: `${o.emoji ?? ""} ${o.label}`.trim(), cantidad: claves.filter((c) => c === o.clave).length }))
      .filter((x) => x.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad);
  return {
    respondidas: lista.length,
    promedioPropiedad: promedio(lista.map((r) => r.propiedad)),
    promedioAtencion: promedio(lista.map((r) => r.atencion)),
    precio: contar(OPCIONES_PRECIO, lista.map((r) => r.precio)),
    gusto: contar(OPCIONES_GUSTO, lista.flatMap((r) => r.gusto)),
    noGusto: contar(OPCIONES_NO_GUSTO, lista.flatMap((r) => r.noGusto)),
    interes: contar(opcionesInteres(operacion), lista.map((r) => r.interes)),
  };
}
