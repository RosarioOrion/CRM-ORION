// Verificación antes de captar: ¿alguien del equipo ya tiene a este
// propietario y, si lo tiene, está trabajando la MISMA propiedad?
//
// Regla para "misma propiedad": mismo tipo, misma zona (una incluida en la
// otra) y direcciones que no sean claramente distintas. Si alguna de las
// dos no tiene dirección no se puede distinguir, así que se toma como la
// misma (para que no se pisen dos agentes); cargando la dirección se
// destraba si de verdad es otra.

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
  if (normalizar(a.tipo) !== normalizar(b.tipo)) return "DISTINTA";
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
