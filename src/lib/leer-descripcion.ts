// Lector de descripciones (copys) de propiedades. Sin IA: reglas de texto
// que buscan los datos más comunes de un aviso uruguayo (dormitorios, baños,
// m², piso, frente/contrafrente, cochera, gastos comunes, extras…).
// El resultado solo PRECARGA el formulario: el agente revisa antes de guardar.

export type LecturaDescripcion = {
  tipo?: string;
  operacion?: "VENTA" | "ALQUILER";
  titulo?: string;
  moneda?: "USD" | "UYU";
  precio?: number;
  dormitorios?: number;
  banos?: number;
  ambientes?: number;
  m2Cubiertos?: number;
  m2Privados?: number;
  m2Terreno?: number;
  hectareas?: number;
  cocheras?: number;
  bodegas?: number;
  numeroPiso?: number;
  cantidadPisos?: number;
  antiguedad?: number;
  disposicion?: string;
  orientacion?: string;
  gastosComunes?: number;
  estadoEdilicio?: string;
  mascotas?: boolean;
  extras: string[];
};

const PALABRAS_NUMERO: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
};

const ORDINALES: Record<string, number> = {
  primer: 1, primero: 1, segundo: 2, tercer: 3, tercero: 3, cuarto: 4,
  quinto: 5, sexto: 6, septimo: 7, setimo: 7, octavo: 8, noveno: 9, decimo: 10,
};

// Número en cifras o en palabras ("2", "dos", "un").
const N = `(\\d+|${Object.keys(PALABRAS_NUMERO).join("|")})`;

function aNumero(s: string): number | undefined {
  if (s in PALABRAS_NUMERO) return PALABRAS_NUMERO[s];
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** "150.000" → 150000 · "1.234,5" → 1234.5 · "85,5" → 85.5 */
export function leerImporte(s: string): number | undefined {
  // Sin espacios ni el punto/coma final de la oración ("USD 185.000.").
  let t = s.replace(/\s/g, "").replace(/[.,]+$/, "");
  const ultPunto = t.lastIndexOf(".");
  const ultComa = t.lastIndexOf(",");
  if (ultPunto >= 0 && ultComa >= 0) {
    const decimal = ultPunto > ultComa ? "." : ",";
    const miles = decimal === "." ? "," : ".";
    t = t.split(miles).join("").replace(decimal, ".");
  } else if (ultPunto >= 0 || ultComa >= 0) {
    const sep = ultPunto >= 0 ? "." : ",";
    // Grupos de 3 cifras = separador de miles; si no, es decimal.
    const esMiles = new RegExp(`^\\d{1,3}(\\${sep}\\d{3})+$`).test(t);
    t = esMiles ? t.split(sep).join("") : t.replace(sep, ".");
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** Minúsculas, sin tildes y con las unidades unificadas (m², mts → m2). */
function normalizar(texto: string): string {
  return texto
    .replace(/²/g, "2")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(metros? cuadrados?|mts?\.? ?2|mts?\.?|mc2|m2s)(?![a-z0-9])/g, "m2")
    .replace(/\bm 2\b/g, "m2")
    .replace(/[ \t]+/g, " ");
}

/** ¿La coincidencia en `pos` está negada? ("sin ascensor", "no tiene cochera"). */
function negado(t: string, pos: number): boolean {
  const antes = t.slice(Math.max(0, pos - 14), pos);
  return /\b(sin|no tiene|no cuenta con|no hay|no)\s+(\w+\s)?$/.test(antes);
}

/** Primer número delante de la palabra clave, sin negación. */
function contar(t: string, clave: string): number | undefined {
  const re = new RegExp(`\\b${N}\\s*(?:\\w+\\s)?(?:${clave})(?![a-z])`, "g");
  for (const m of t.matchAll(re)) {
    if (negado(t, m.index)) continue;
    const n = aNumero(m[1]);
    if (n !== undefined) return n;
  }
  // "dormitorios: 3"
  const re2 = new RegExp(`\\b(?:${clave})\\s*:\\s*(\\d+)`);
  const m2 = t.match(re2);
  return m2 ? Number(m2[1]) : undefined;
}

/** Hay una mención afirmativa (no negada) de la palabra clave. */
function menciona(t: string, clave: string): boolean {
  const re = new RegExp(`\\b(?:${clave})`, "g");
  for (const m of t.matchAll(re)) {
    if (!negado(t, m.index)) return true;
  }
  return false;
}

const TIPOS: { tipo: string; clave: string }[] = [
  { tipo: "Apartamento", clave: "apartamentos?|aptos?\\b|depto|monoambiente|penthouse|loft" },
  { tipo: "Casa", clave: "casa\\b(?! de caseros)|chalet|vivienda" },
  { tipo: "Oficina", clave: "oficinas?\\b" },
  { tipo: "Local", clave: "local comercial|local\\b" },
  { tipo: "Depósito", clave: "deposito\\b" },
  { tipo: "Galpón", clave: "galpon\\b" },
  { tipo: "Terreno", clave: "terreno\\b|solar\\b|lote\\b" },
  { tipo: "Quinta", clave: "quinta\\b" },
  { tipo: "Chacra", clave: "chacra\\b" },
  { tipo: "Estancia", clave: "estancia\\b" },
  { tipo: "Campo", clave: "campo\\b" },
];

/** Gana el tipo que aparece primero en el texto (suele ser el titular). */
function leerTipo(t: string): string | undefined {
  let mejor: { tipo: string; pos: number } | undefined;
  for (const { tipo, clave } of TIPOS) {
    const m = new RegExp(`\\b(?:${clave})`).exec(t);
    if (m && (!mejor || m.index < mejor.pos)) mejor = { tipo, pos: m.index };
  }
  return mejor?.tipo;
}

function leerOperacion(t: string): "VENTA" | "ALQUILER" | undefined {
  const alq = t.search(/\b(alquiler|alquila|se alquila|en alquiler|arrienda|arrendamiento)\b/);
  const ven = t.search(/\b(venta|vende|se vende|en venta)\b/);
  if (alq < 0 && ven < 0) return undefined;
  if (alq < 0) return "VENTA";
  if (ven < 0) return "ALQUILER";
  return alq < ven ? "ALQUILER" : "VENTA";
}

type TipoSuperficie = "terreno" | "privada" | "total";

function clasificarSuperficie(s: string): TipoSuperficie | undefined {
  if (/(terreno|solar|lote|padron)/.test(s)) return "terreno";
  if (/(propios|internos|interiores|privad|habitables|cubiertos|utiles)/.test(s)) return "privada";
  if (/(total|edificad|construid)/.test(s)) return "total";
  return undefined;
}

/** Clasifica cada "NN m2" según las palabras que lo rodean. */
function leerSuperficies(t: string, l: LecturaDescripcion) {
  const re = /(\d+(?:[.,]\d+)?)\s*m2\b/g;
  const sueltos: number[] = [];
  for (const m of t.matchAll(re)) {
    const n = leerImporte(m[1]);
    if (n === undefined) continue;
    const antes = t.slice(Math.max(0, m.index - 40), m.index);
    // m² de un ambiente puntual (terraza de 10 m², balcón…): no es la superficie.
    if (/(terraza|balcon|patio|jardin|garaje|cochera|living|comedor|dormitorio|cocina|parrillero|azotea|deck)[^,.;\d\n]{0,18}$/.test(antes)) continue;
    // Manda la palabra que sigue ("80 m2 propios"); si no hay, la que precede.
    const despues = t.slice(m.index + m[0].length, m.index + m[0].length + 25).split(/[,.;\n(]/)[0];
    const previo = antes.split(/[,.;\n]/).pop() ?? "";
    const tipo = clasificarSuperficie(despues) ?? clasificarSuperficie(previo);
    const v = Math.round(n);
    if (tipo === "terreno") l.m2Terreno ??= v;
    else if (tipo === "privada") l.m2Privados ??= v;
    else if (tipo === "total") l.m2Cubiertos ??= v;
    else sueltos.push(v);
  }
  // Sin etiqueta: el primero es la superficie total (o el terreno, si es lote).
  if (sueltos.length) {
    if (l.tipo === "Terreno" || l.tipo === "Quinta") l.m2Terreno ??= sueltos[0];
    else if (l.m2Cubiertos === undefined) l.m2Cubiertos = sueltos[0];
    else l.m2Privados ??= sueltos[0];
  }
}

function leerPiso(t: string, l: LecturaDescripcion) {
  if (/\bplanta baja\b/.test(t)) l.numeroPiso = 0;
  const ord = Object.keys(ORDINALES).join("|");
  const m =
    t.match(/\bpiso\s*(?:n(?:ro|o|°|º)?\.?\s*)?(\d{1,2})\b(?!\s*m2)/) ??
    t.match(/\b(\d{1,2})\s*(?:°|º|er|ro|do|to|vo|no|mo)?\.?\s*piso\b/) ??
    t.match(new RegExp(`\\b(${ord})\\s+piso\\b`));
  if (m) l.numeroPiso = ORDINALES[m[1]] ?? Number(m[1]);
  // "edificio de 10 pisos", "casa en dos plantas"
  const c = t.match(new RegExp(`\\b${N}\\s*(?:pisos|plantas|niveles)\\b`));
  if (c) l.cantidadPisos = aNumero(c[1]);
}

function leerDisposicion(t: string): string | undefined {
  if (/\bcontra ?frente\b/.test(t)) return "Al contrafrente";
  if (/\b(al|de) frente\b|\bfrente al (mar|parque|rambla)|\bes frente\b|\bfrentista\b/.test(t)) return "Al frente";
  if (/\b(es|unidad|apartamento|disposicion:?) lateral\b/.test(t)) return "Lateral";
  if (/\b(apartamento|unidad|es) interior\b/.test(t)) return "Interior";
  return undefined;
}

const PUNTOS = ["noreste", "noroeste", "sureste", "suroeste", "norte", "sur", "este", "oeste"];

function leerOrientacion(t: string): string | undefined {
  const m = t.match(
    new RegExp(`\\b(?:orientacion|orientad[oa]|vista al|luz del)\\s*:?\\s*(?:al |hacia el |el )?(${PUNTOS.join("|")})\\b`)
  );
  if (!m) return undefined;
  return m[1].charAt(0).toUpperCase() + m[1].slice(1);
}

const MONEDA = "(u\\$s|us\\$|u\\$d|usd|dolares|\\$u|uyu|\\$)";

function moneda(simbolo: string): "USD" | "UYU" {
  return /u\$s|us\$|u\$d|usd|dolares/.test(simbolo) ? "USD" : "UYU";
}

function leerGastosYPrecio(t: string, l: LecturaDescripcion) {
  // Gastos comunes: "GC $ 8.500", "gastos comunes: 8500"
  const gc = new RegExp(`\\b(?:gastos? comunes|g\\.? ?c\\.?)\\s*(?:aprox\\.?|aproximados?)?\\s*:?\\s*(?:de\\s*)?(?:${MONEDA}\\s*)?(\\d[\\d.,]*)`).exec(t);
  // Tramo del texto ocupado por los GC, para no confundir su monto con el precio.
  let tramoGc: [number, number] | undefined;
  if (gc) {
    const n = leerImporte(gc[2]);
    if (n !== undefined) {
      l.gastosComunes = Math.round(n);
      tramoGc = [gc.index, gc.index + gc[0].length];
    }
  }

  // Precio: "USD 150.000", "U$S 150.000", "$ 25.000", "150.000 dólares"
  const candidatos: { monto: number; moneda: "USD" | "UYU"; pos: number; etiquetado: boolean }[] = [];
  const re1 = new RegExp(`${MONEDA}\\s*(\\d[\\d.,]*)(\\s*mil\\b)?`, "g");
  for (const m of t.matchAll(re1)) {
    const n = leerImporte(m[2]);
    if (n === undefined) continue;
    candidatos.push({ monto: m[3] ? n * 1000 : n, moneda: moneda(m[1]), pos: m.index, etiquetado: false });
  }
  const re2 = /(\d[\d.,]*)(\s*mil)?\s*(dolares|usd|u\$s|pesos)\b/g;
  for (const m of t.matchAll(re2)) {
    const n = leerImporte(m[1]);
    if (n === undefined) continue;
    candidatos.push({ monto: m[2] ? n * 1000 : n, moneda: m[3] === "pesos" ? "UYU" : "USD", pos: m.index, etiquetado: false });
  }
  const validos = candidatos
    .filter((c) => !tramoGc || c.pos < tramoGc[0] || c.pos >= tramoGc[1])
    .filter((c) => !/(gastos? comunes|contribucion|primaria|impuesto|g\.? ?c\.?)\s*:?\s*(de\s*)?$/.test(t.slice(Math.max(0, c.pos - 30), c.pos)))
    .map((c) => ({ ...c, etiquetado: /(precio|valor|venta|alquiler|vende|alquila|piden?|mensual)[^\d]{0,20}$/.test(t.slice(Math.max(0, c.pos - 30), c.pos)) }))
    .filter((c) => c.monto >= 100);
  const elegido = validos.find((c) => c.etiquetado) ?? validos.find((c) => c.moneda === "USD") ?? validos[0];
  if (elegido) {
    l.precio = Math.round(elegido.monto);
    l.moneda = elegido.moneda;
  }
}

function leerEstado(t: string, l: LecturaDescripcion) {
  if (/\ba estrenar\b|\ben pozo\b/.test(t)) {
    l.estadoEdilicio = "7 – A estrenar";
    l.antiguedad ??= 0;
  } else if (/\b(totalmente |completamente )?reciclad[oa]\b/.test(t) && !/\bpara reciclar\b/.test(t)) {
    l.estadoEdilicio = "6 – Reciclado";
  } else if (/\b(para reciclar|a reciclar|reciclar total)\b/.test(t)) {
    l.estadoEdilicio = "1 – Reciclar total";
  } else if (/\b(excelente|impecable|muy buen) estado\b/.test(t)) {
    l.estadoEdilicio = "5 – Muy bueno";
  } else if (/\bbuen estado\b/.test(t)) {
    l.estadoEdilicio = "4 – Bueno";
  }

  const a =
    t.match(/\b(\d{1,3})\s*anos de (?:antiguedad|construccion|construido)/) ??
    t.match(/\bantiguedad\s*:?\s*(?:de\s*)?(\d{1,3})\s*anos?\b/);
  if (a) l.antiguedad = Number(a[1]);
  const anio = t.match(/\b(?:construid[oa]|edificad[oa]|del ano|ano de construccion:?)\s*(?:en\s*)?(?:el\s*(?:ano\s*)?)?((?:19|20)\d{2})\b/);
  if (anio && l.antiguedad === undefined) {
    const n = new Date().getFullYear() - Number(anio[1]);
    if (n >= 0) l.antiguedad = n;
  }
}

function leerMascotas(t: string): boolean | undefined {
  if (/\bno (se )?(acepta|admite|permite)n? mascotas\b|\bsin mascotas\b/.test(t)) return false;
  if (/\b(acepta|admite|permite)n? mascotas\b|\bmascotas (permitidas|bienvenidas)\b|\bpet ?friendly\b/.test(t)) return true;
  return undefined;
}

// Extras del formulario → palabras que los delatan en el copy.
const EXTRAS: { extra: string; clave: string }[] = [
  { extra: "Agua corriente", clave: "agua corriente|\\bose\\b" },
  { extra: "Gas natural", clave: "gas natural|gas por cañeria|gas por caneria" },
  { extra: "Aire acondicionado", clave: "aire acondicionado|aires acondicionados|\\ba/a\\b|\\bsplits?\\b" },
  { extra: "Calefacción", clave: "calefaccion|losa radiante|loza radiante|radiadores|caldera|estufa|calefactor" },
  { extra: "Conexión lavarropas", clave: "lavarropas|lavadero" },
  { extra: "Circuito de cámaras", clave: "camaras|cctv|videovigilancia" },
  { extra: "Acceso controlado", clave: "portero|porteria|vigilancia|seguridad 24|acceso controlado|guardia|barrio privado|conserje" },
  { extra: "Placards", clave: "placards?|vestidor|roperos? empotrados?" },
  { extra: "Desayunador", clave: "desayunador" },
  { extra: "Baño social", clave: "bano social|toilette|toilet" },
  { extra: "Comedor", clave: "comedor" },
  { extra: "Living", clave: "living" },
  { extra: "Estudio", clave: "estudio\\b|escritorio\\b" },
  { extra: "Balcón", clave: "balcon|balcones" },
  { extra: "Cocina", clave: "cocina" },
  { extra: "Garaje", clave: "garaje|garage|cochera" },
  { extra: "Parrillero", clave: "parrillero|parrilla|barbacoa" },
  { extra: "Piscina", clave: "piscina|pileta" },
  { extra: "Patio", clave: "patio" },
  { extra: "Terraza", clave: "terraza|azotea" },
  { extra: "Ascensor", clave: "ascensor" },
  { extra: "Amoblado", clave: "amoblado|amueblado|con muebles" },
  { extra: "Jardín", clave: "jardin|parque propio" },
  { extra: "Luz eléctrica", clave: "luz electrica|\\bute\\b|energia electrica" },
  { extra: "Alambrado", clave: "alambrado" },
  { extra: "Tajamar", clave: "tajamar" },
  { extra: "Casa de caseros", clave: "casa de caseros|casa de peon|vivienda de caseros" },
  { extra: "Galpón", clave: "galpon" },
  { extra: "Corral", clave: "corral|brete|manga" },
];

/** Lee el copy y devuelve los datos que pudo reconocer. */
export function leerDescripcion(texto: string): LecturaDescripcion {
  const t = normalizar(texto);
  const l: LecturaDescripcion = { extras: [] };

  l.tipo = leerTipo(t);
  l.operacion = leerOperacion(t);

  // Título: la primera línea, si es corta (suele ser el titular del aviso).
  const primera = texto.split("\n").map((s) => s.trim()).find(Boolean);
  if (primera && primera.length <= 90) l.titulo = primera.replace(/^[^\p{L}\p{N}]+/u, "").replace(/[*_#]+/g, "").trim() || undefined;

  if (/\bmonoambiente\b/.test(t)) {
    l.dormitorios = 0;
    l.ambientes = 1;
  }
  l.dormitorios = contar(t, "dormitorios?|dorm\\.?|dormis?|habitaciones|habitacion|cuartos|recamaras|suites?") ?? l.dormitorios;
  l.banos = contar(t, "banos?|bano completo");
  l.ambientes = contar(t, "ambientes") ?? l.ambientes;
  l.cocheras = contar(t, "cocheras?|garajes?|garages?|lugares? de (?:estacionamiento|garaje)|estacionamientos?");
  // "garaje para 2 autos"
  const autos = t.match(new RegExp(`\\b(?:cochera|garaje|garage)[^.,;]{0,15}para ${N} (?:autos|vehiculos|coches)\\b`));
  if (l.cocheras === undefined && autos) l.cocheras = aNumero(autos[1]);
  if (l.cocheras === undefined && menciona(t, "cochera|garaje|garage")) l.cocheras = 1;
  l.bodegas = contar(t, "bodegas?");
  if (l.bodegas === undefined && menciona(t, "bodega\\b")) l.bodegas = 1;

  const h = t.match(/(\d+(?:[.,]\d+)?)\s*(?:has?|hectareas?|hect\.?)\b/);
  if (h) {
    const n = leerImporte(h[1]);
    if (n !== undefined) l.hectareas = Math.round(n);
  }

  leerSuperficies(t, l);
  leerPiso(t, l);
  l.disposicion = leerDisposicion(t);
  l.orientacion = leerOrientacion(t);
  leerGastosYPrecio(t, l);
  leerEstado(t, l);
  l.mascotas = leerMascotas(t);

  for (const { extra, clave } of EXTRAS) {
    if (menciona(t, clave)) l.extras.push(extra);
  }

  return l;
}
