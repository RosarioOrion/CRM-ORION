// Verificación antes de captar: ¿alguien del equipo ya tiene a este
// propietario y, si lo tiene, está trabajando la MISMA propiedad?
//
// Regla para "misma propiedad": mismo tipo, misma zona (una incluida en la
// otra) y direcciones que no sean claramente distintas. Si alguna de las
// dos no tiene dirección no se puede distinguir, así que se toma como la
// misma (para que no se pisen dos agentes); cargando la dirección se
// destraba si de verdad es otra.

import { TIPOS_PROPIEDAD } from "@/lib/propiedades";
import { BARRIOS_CONOCIDOS } from "@/lib/revisar-propiedad";

/** Tipo de una captación cargada sin tipo (se compara como cualquiera). */
export const TIPO_A_DEFINIR = "A definir";

export type PropiedadComparable = {
  tipo: string;
  zona: string | null;
  direccion: string | null;
};

function normalizar(t: string | null | undefined): string {
  return (t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Palabras que no ayudan a distinguir una calle de otra.
const RELLENO = new Set(["av", "avda", "avenida", "calle", "bv", "bulevar", "boulevard", "rambla", "dr", "doctor", "gral", "general", "de", "del", "la", "el", "y", "esq", "esquina", "apto", "apartamento", "ap", "piso", "unidad"]);

function partesDireccion(d: string | null): { calle: string; numero: string | null } | null {
  const t = normalizar(d);
  if (!t) return null;
  const sinApto = t.replace(/\b(apto|apartamento|ap|unidad|piso)\s*\w+/g, " ");
  const numero = /\b(\d{2,5})\b/.exec(sinApto)?.[1] ?? null;
  const calle = sinApto
    .split(" ")
    .filter((p) => p && !RELLENO.has(p) && !/^\d+$/.test(p))
    .join(" ");
  return { calle, numero };
}

export type Comparacion = "MISMA" | "POSIBLE" | "DISTINTA";

export function compararPropiedades(a: PropiedadComparable, b: PropiedadComparable): Comparacion {
  const ta = normalizar(a.tipo);
  const tb = normalizar(b.tipo);
  const sinTipo = normalizar(TIPO_A_DEFINIR);
  if (ta !== tb && ta !== sinTipo && tb !== sinTipo) return "DISTINTA";
  const za = normalizar(a.zona);
  const zb = normalizar(b.zona);
  if (za && zb && !za.includes(zb) && !zb.includes(za)) return "DISTINTA";

  const da = partesDireccion(a.direccion);
  const db = partesDireccion(b.direccion);
  if (!da || !db || !da.calle || !db.calle) return "POSIBLE";
  const mismaCalle = da.calle.includes(db.calle) || db.calle.includes(da.calle);
  if (!mismaCalle) return "DISTINTA";
  if (da.numero && db.numero && da.numero !== db.numero) return "DISTINTA";
  return "MISMA";
}

const SINONIMOS_TIPO: [RegExp, string][] = [
  [/\b(apto|aptos|apartamento|apartamentos|monoambiente|duplex|penthouse)\b/, "Apartamento"],
  [/\b(casa|casas|ph|chalet)\b/, "Casa"],
  [/\b(local|locales)\b/, "Local"],
  [/\b(oficina|oficinas)\b/, "Oficina"],
  [/\b(terreno|terrenos|solar|lote)\b/, "Terreno"],
];

/**
 * Del título de la captación ("Apto 2 dorm. en Pocitos") saca el tipo y el
 * barrio, para poder compararla después con lo que cargue otro agente.
 */
export function inferirDeTitulo(titulo: string): { tipo: string; zona: string | null } {
  const t = normalizar(titulo);
  let tipo: string = TIPO_A_DEFINIR;
  for (const [re, valor] of SINONIMOS_TIPO) {
    if (re.test(t)) {
      tipo = valor;
      break;
    }
  }
  if (tipo === TIPO_A_DEFINIR) {
    tipo = TIPOS_PROPIEDAD.find((x) => new RegExp(`\\b${normalizar(x)}\\b`).test(t)) ?? TIPO_A_DEFINIR;
  }
  const zona =
    [...BARRIOS_CONOCIDOS]
      .sort((a, b) => b.length - a.length)
      .find((b) => new RegExp(`(^| )${normalizar(b)}( |$)`).test(t)) ?? null;
  return { tipo, zona };
}
