// Ubicar una propiedad en el mapa con OpenStreetMap (Nominatim, sin costo
// ni clave). Lo usan el mapa del formulario (en el navegador) y la
// herramienta de Admin que ubica las propiedades que quedaron sin
// ubicación (en el servidor).
//
// Orden de búsqueda, de lo más preciso a lo más general:
//   a) calle y número + barrio + departamento   → exacta
//      (si no aparece con el número: solo la calle → aproximada)
//   b) esquina, si la dirección dice "y", "esq." o "esquina": el cruce de
//      las dos calles → aproximada
//   c) barrio + departamento → aproximada (zona)
//   d) solo el departamento → aproximada (muy general)

export type Precision = "exacta" | "calle" | "esquina" | "barrio" | "departamento";

export type Ubicacion = { punto: [number, number]; zoom: number; precision: Precision };

/** Exacta o lo bastante cerca (calle, esquina) para guardarla como ubicación de la propiedad. */
export function esGuardable(p: Precision): boolean {
  return p === "exacta" || p === "calle" || p === "esquina";
}

type Resultado = { lat: string; lon: string; geojson?: { type: string; coordinates: unknown } };

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

/** Caja [oeste, sur, este, norte] para buscar solo dentro de ella. */
type Caja = [number, number, number, number];

async function buscar(
  q: string,
  conGeometria: boolean,
  headers?: Record<string, string>,
  caja?: Caja
): Promise<Resultado[]> {
  try {
    const url = `${NOMINATIM}?format=json&countrycodes=uy&limit=${conGeometria ? 30 : 1}${
      conGeometria ? "&polygon_geojson=1" : ""
    }${caja ? `&viewbox=${caja.join(",")}&bounded=1` : ""}&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { Accept: "application/json", ...headers } });
    if (!r.ok) return [];
    return (await r.json()) as Resultado[];
  } catch {
    return [];
  }
}

const unir = (...partes: string[]) => partes.map((p) => p.trim()).filter(Boolean).join(", ");

/** "Av. Brasil y Ellauri", "Brasil esq. Ellauri", "Brasil esquina Ellauri" → las dos calles. */
export function separarEsquina(direccion: string): [string, string] | null {
  const partes = direccion.split(/\s+(?:y|e|esq\.?|esquina)\s+/i);
  if (partes.length !== 2) return null;
  const limpiar = (c: string) => sinNumeroDePuerta(c);
  const [a, b] = partes.map(limpiar);
  return a && b ? [a, b] : null;
}

/**
 * Saca el número de puerta y el apartamento: "Ellauri 1234 apto 5" →
 * "Ellauri". Respeta los números del nombre ("18 de Julio", "Calle 21").
 */
function sinNumeroDePuerta(direccion: string): string {
  return direccion
    .replace(/\b(apto|apartamento|ap|unidad|esc|piso)\.?\s*\S+/gi, "")
    .replace(/\s+(n[º°o]\.?\s*)?\d+[a-z]?\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

type Punto = [number, number]; // [lng, lat], como en GeoJSON

// Tramos de una calle (LineString o MultiLineString).
function tramosDeCalle(rs: Resultado[]): Punto[][] {
  const out: Punto[][] = [];
  for (const r of rs) {
    const g = r.geojson;
    if (!g) continue;
    if (g.type === "LineString") out.push(g.coordinates as Punto[]);
    else if (g.type === "MultiLineString") out.push(...(g.coordinates as Punto[][]));
  }
  return out;
}

/** Punto donde se cruzan los segmentos p1-p2 y p3-p4, si se cruzan. */
function cruce(p1: Punto, p2: Punto, p3: Punto, p4: Punto): Punto | null {
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (d === 0) return null;
  const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
  const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
}

function metros(a: Punto, b: Punto): number {
  const k = 111_320;
  const dx = (a[0] - b[0]) * k * Math.cos(((a[1] + b[1]) / 2) * (Math.PI / 180));
  const dy = (a[1] - b[1]) * k;
  return Math.hypot(dx, dy);
}

function cruceDeTramos(a: Punto[][], b: Punto[][]): Punto | null {
  for (const la of a)
    for (let i = 1; i < la.length; i++)
      for (const lb of b)
        for (let j = 1; j < lb.length; j++) {
          const c = cruce(la[i - 1], la[i], lb[j - 1], lb[j]);
          if (c) return c;
        }
  return null;
}

function masCercanos(a: Punto[][], b: Punto[][]): { d: number; p: Punto } | null {
  let mejor: { d: number; p: Punto } | null = null;
  for (const pa of a.flat())
    for (const pb of b.flat()) {
      const d = metros(pa, pb);
      if (!mejor || d < mejor.d) mejor = { d, p: [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2] };
    }
  return mejor;
}

/**
 * Cruce de dos calles: donde se cortan sus tramos; si no se cortan (calles
 * que terminan una en la otra, rotondas), los puntos más cercanos a menos
 * de 120 m. OpenStreetMap devuelve solo algunos tramos de cada calle: si el
 * del cruce no vino, se vuelven a pedir las dos calles en un cuadrado de
 * ~600 m alrededor de donde quedaron más cerca.
 */
async function buscarEsquina(
  calles: [string, string],
  zona: string,
  departamento: string,
  headers?: Record<string, string>
): Promise<[number, number] | null> {
  const geometria = async (calle: string, caja?: Caja) => {
    const conZona = caja ? unir(calle, departamento) : unir(calle, zona, departamento);
    let nombre = calle;
    let t = tramosDeCalle(await buscar(conZona, true, headers, caja));
    // En OpenStreetMap muchas figuran con el tipo adelante ("Avenida 18 de Julio").
    if (!t.length && !/^(av|avda|avenida|bv|bulevar|boulevard|rambla|camino|calle)\b/i.test(calle)) {
      nombre = `Avenida ${calle}`;
      t = tramosDeCalle(
        await buscar(caja ? unir(nombre, departamento) : unir(nombre, zona, departamento), true, headers, caja)
      );
    }
    return { t, nombre };
  };
  const resultado = (a: Punto[][], b: Punto[][]): [number, number] | null => {
    const c = cruceDeTramos(a, b);
    if (c) return [c[1], c[0]];
    const m = masCercanos(a, b);
    return m && m.d < 120 ? [m.p[1], m.p[0]] : null;
  };

  const a = await geometria(calles[0]);
  if (!a.t.length) return null;
  const b = await geometria(calles[1]);
  if (!b.t.length) return null;
  const directo = resultado(a.t, b.t);
  if (directo) return directo;

  const cerca = masCercanos(a.t, b.t);
  if (!cerca || cerca.d > 5000) return null;
  const delta = 0.003; // ~300 m para cada lado
  const caja: Caja = [cerca.p[0] - delta, cerca.p[1] - delta, cerca.p[0] + delta, cerca.p[1] + delta];
  const a2 = await geometria(a.nombre, caja);
  const b2 = await geometria(b.nombre, caja);
  return a2.t.length && b2.t.length ? resultado(a2.t, b2.t) : null;
}

export async function ubicarPropiedad(
  direccion: string,
  zona: string,
  departamento: string,
  /** En el servidor hay que identificarse ante Nominatim (User-Agent). */
  headers?: Record<string, string>
): Promise<Ubicacion | null> {
  direccion = direccion.trim();
  const esquina = direccion ? separarEsquina(direccion) : null;

  // a) calle + barrio + departamento
  if (direccion && !esquina) {
    const [r] = await buscar(unir(direccion, zona, departamento), false, headers);
    if (r) return { punto: [Number(r.lat), Number(r.lon)], zoom: 17, precision: "exacta" };
    const calle = sinNumeroDePuerta(direccion);
    if (calle && calle !== direccion) {
      const [rc] = await buscar(unir(calle, zona, departamento), false, headers);
      if (rc) return { punto: [Number(rc.lat), Number(rc.lon)], zoom: 16, precision: "calle" };
    }
  }

  // b) esquina
  if (esquina) {
    // Primero dentro del barrio; si no, en todo el departamento (esquinas en el límite entre barrios).
    const p =
      (await buscarEsquina(esquina, zona, departamento, headers)) ??
      (zona ? await buscarEsquina(esquina, "", departamento, headers) : null);
    if (p) return { punto: p, zoom: 17, precision: "esquina" };
  }

  // c) barrio + departamento
  if (zona) {
    const [r] = await buscar(unir(zona, departamento), false, headers);
    if (r) return { punto: [Number(r.lat), Number(r.lon)], zoom: 15, precision: "barrio" };
  }

  // d) departamento
  if (departamento) {
    const [r] = await buscar(departamento, false, headers);
    if (r) return { punto: [Number(r.lat), Number(r.lon)], zoom: 11, precision: "departamento" };
  }
  return null;
}
