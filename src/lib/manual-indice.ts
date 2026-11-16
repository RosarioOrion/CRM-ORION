// Índice del Manual Orion en Capacitación: número de capítulo o letra de
// anexo, bloque del manual (orden de lectura, según el Anexo J) y áreas por
// tema (un capítulo puede estar en varias). Las áreas se guardan en la base y
// la CEO las puede editar; acá está la carga inicial (Tabla B de Rosario).

export type Clase = "CAPITULO" | "ANEXO" | "OTRO";

export const CLASE_LABEL: Record<Clase, string> = {
  CAPITULO: "Capítulo",
  ANEXO: "Anexo",
  OTRO: "Otro material",
};

export const LETRAS_ANEXO = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

/** Bloques del manual (Tabla A), en orden de lectura. */
export const BLOQUES: { clave: string; numero: string | null; nombre: string; desde?: number; hasta?: number }[] = [
  { clave: "INTRO", numero: null, nombre: "Introducción", desde: 0, hasta: 0 },
  { clave: "B1", numero: "1", nombre: "Mentalidad y crecimiento personal", desde: 1, hasta: 9 },
  { clave: "B2", numero: "2", nombre: "De empleado a emprendedor", desde: 10, hasta: 14 },
  { clave: "B3", numero: "3", nombre: "Educación financiera", desde: 15, hasta: 21 },
  { clave: "B4", numero: "4", nombre: "El negocio y el sistema", desde: 22, hasta: 26 },
  { clave: "B5", numero: "5", nombre: "La propiedad", desde: 27, hasta: 30 },
  { clave: "B6", numero: "6", nombre: "Publicar y atraer", desde: 31, hasta: 33 },
  { clave: "B7", numero: "7", nombre: "Las personas", desde: 34, hasta: 39 },
  { clave: "B8", numero: "8", nombre: "Los procesos paso a paso", desde: 40, hasta: 43 },
  { clave: "B9", numero: "9", nombre: "Ética y marco legal", desde: 44, hasta: 48 },
  { clave: "B10", numero: "10", nombre: "Especializaciones", desde: 49, hasta: 55 },
  { clave: "CIERRE", numero: null, nombre: "Primera operación y cierre", desde: 56, hasta: 57 },
  { clave: "ANEXOS", numero: null, nombre: "Anexos" },
];

export const bloqueLabel = (clave: string | null | undefined) => {
  const b = BLOQUES.find((x) => x.clave === clave);
  if (!b) return null;
  return b.numero ? `Bloque ${b.numero} · ${b.nombre}` : b.nombre;
};

export function bloqueDe(clase: Clase, numero: string | null): string | null {
  if (clase === "ANEXO") return "ANEXOS";
  if (clase !== "CAPITULO" || numero === null) return null;
  const n = Number(numero);
  return BLOQUES.find((b) => b.desde !== undefined && n >= b.desde && n <= b.hasta!)?.clave ?? null;
}

/** Áreas iniciales (Tabla B). La clave es fija; nombre, ícono y orden se editan. */
export const AREAS_INICIALES: {
  clave: string;
  nombre: string;
  icono: string;
  orden: number;
  capitulos: number[];
  anexos: string[];
}[] = [
  { clave: "empezar", nombre: "Empezar aquí", icono: "🧭", orden: 1, capitulos: [0, 10, 22, 23, 56, 57], anexos: ["A", "G"] },
  { clave: "mentalidad", nombre: "Mentalidad y bienestar", icono: "🧠", orden: 2, capitulos: [1, 2, 3, 4, 5, 6, 7], anexos: ["F"] },
  { clave: "negocio", nombre: "Tu negocio y productividad", icono: "🏢", orden: 3, capitulos: [10, 11, 12, 13, 14, 24, 25, 26, 33], anexos: ["E"] },
  { clave: "finanzas", nombre: "Finanzas personales", icono: "💰", orden: 4, capitulos: [15, 16, 17, 18, 19, 20, 21, 26], anexos: ["E"] },
  { clave: "captacion", nombre: "Captación y tasación", icono: "🔑", orden: 5, capitulos: [23, 27, 28, 29, 30], anexos: ["B", "C", "D", "I"] },
  { clave: "marketing", nombre: "Marketing y marca personal", icono: "📣", orden: 6, capitulos: [8, 9, 31, 32, 33, 42], anexos: ["C"] },
  { clave: "clientes", nombre: "Clientes, visitas y negociación", icono: "🤝", orden: 7, capitulos: [34, 35, 37, 38, 42, 43, 55], anexos: ["C", "I"] },
  { clave: "ventas", nombre: "Ventas", icono: "🏷️", orden: 8, capitulos: [27, 28, 29, 30, 31, 32, 35, 37, 38, 39, 41, 42, 46, 51, 52, 56], anexos: ["A", "B", "C"] },
  { clave: "alquileres", nombre: "Alquileres", icono: "🏠", orden: 9, capitulos: [27, 28, 29, 30, 31, 32, 35, 36, 37, 38, 39, 40, 42, 45, 49, 54, 55], anexos: ["A", "B", "C"] },
  { clave: "legal", nombre: "Documentación y legal", icono: "📑", orden: 10, capitulos: [12, 30, 36, 39, 44, 45, 46, 47, 48], anexos: ["B", "H"] },
  { clave: "especializaciones", nombre: "Especializaciones", icono: "⭐", orden: 11, capitulos: [49, 50, 51, 52, 53, 54], anexos: [] },
  { clave: "herramientas", nombre: "Herramientas (anexos)", icono: "📚", orden: 12, capitulos: [], anexos: LETRAS_ANEXO },
];

/** Áreas que le tocan a un capítulo o anexo según la Tabla B. */
export function areasIniciales(clase: Clase, numero: string | null): string[] {
  if (numero === null) return [];
  return AREAS_INICIALES.filter((a) =>
    clase === "CAPITULO" ? a.capitulos.includes(Number(numero)) : clase === "ANEXO" ? a.anexos.includes(numero) : false
  ).map((a) => a.clave);
}

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

/**
 * Lee el número o la letra del título: "CAP. 27- PROSPECCION", "CAP 20-…",
 * "CAPITULO 3 …", "1 - MENTALIDAD…", "ANEXO C- GUIONES".
 */
export function leerNumero(titulo: string): { clase: Clase; numero: string | null } {
  const t = sinTildes(titulo).trim();
  const anexo = /^ANEXO\s*[-.:]?\s*([A-J])(?![A-Z])/.exec(t);
  if (anexo) return { clase: "ANEXO", numero: anexo[1] };
  const cap = /^CAP(?:ITULO|\.)?\s*\.?\s*[-:]?\s*(\d{1,2})(?!\d)/.exec(t) ?? /^(\d{1,2})\s*[-–—.:)·]/.exec(t);
  if (cap) {
    const n = Number(cap[1]);
    if (n >= 0 && n <= 99) return { clase: "CAPITULO", numero: String(n) };
  }
  return { clase: "OTRO", numero: null };
}

/** Orden para listar: capítulos por número, después anexos A–J, después el resto. */
export function ordenDe(clase: Clase, numero: string | null): number {
  if (clase === "CAPITULO" && numero !== null) return Number(numero);
  if (clase === "ANEXO" && numero) return 1000 + Math.max(0, LETRAS_ANEXO.indexOf(numero));
  return 5000;
}

/** "Cap. 27", "Anexo C" o null. */
export function etiquetaNumero(clase: string | null | undefined, numero: string | null | undefined): string | null {
  if (!numero) return null;
  if (clase === "CAPITULO") return `Cap. ${numero}`;
  if (clase === "ANEXO") return `Anexo ${numero}`;
  return null;
}

/**
 * Título sin el prefijo de número: "CAP. 27- PROSPECCION- CAPTACION" →
 * "PROSPECCION- CAPTACION". Se usa para mostrar "Cap. 27 · …".
 */
export function tituloSinNumero(titulo: string): string {
  return titulo
    .replace(/^\s*(cap(?:[íi]tulo|\.)?\s*\.?\s*[-:]?\s*\d{1,2}|anexo\s*[-.:]?\s*[a-j](?![a-z])|\d{1,2}\s*(?=[-–—.:)·]))\s*[-–—.:)·]?\s*/i, "")
    .trim() || titulo;
}
