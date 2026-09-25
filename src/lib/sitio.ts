import { and, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { propiedades, usuarios } from "@/db/schema";

// Página web pública "Orion Propiedades": lee directo de las propiedades del
// CRM. Solo se muestran las Activas y Reservadas que tengan "Mostrar en la
// web" marcado. Nunca se exponen datos del dueño.

export const NOMBRE_SITIO = "Orion Propiedades";
export const POR_PAGINA = 24;

export const ESTADOS_PUBLICOS = ["ACTIVA", "RESERVADA"] as const;

const condicionPublica = and(
  eq(propiedades.publicadaWeb, true),
  inArray(propiedades.estado, [...ESTADOS_PUBLICOS])
);

/**
 * Título para la web: sin el código de Lumen del principio ("L3 - "), sin
 * el precio al final ("(USD 178.000)"), sin etiquetas "[...]" y, si vino
 * todo en mayúsculas, en formato normal.
 */
export function tituloPublico(titulo: string): string {
  let t = titulo
    .replace(/\s*\[[^\]]*\]/g, "")
    .replace(/^\s*L\d+\s*[-–—:]\s*/i, "")
    .replace(/\s*\((USD|UYU|U\$S|\$)[^)]*\)\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const letras = t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, "");
  const mayus = letras.replace(/[^A-ZÁÉÍÓÚÑ]/g, "").length;
  if (letras.length > 8 && mayus / letras.length > 0.7) {
    t = t.toLowerCase();
    t = t.charAt(0).toUpperCase() + t.slice(1);
  }
  return t;
}

export function precioTexto(precio: number | null, moneda: string) {
  if (!precio) return "Consultar precio";
  const simbolo = moneda === "UYU" ? "$" : "USD";
  return `${simbolo} ${precio.toLocaleString("es-UY")}`;
}

/** Teléfono uruguayo → número para wa.me (598 + sin el 0 inicial). */
export function numeroWhatsApp(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  let d = telefono.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("598")) return d;
  if (d.startsWith("0")) d = d.slice(1);
  return `598${d}`;
}

export type Filtros = {
  operacion?: string;
  tipo?: string;
  zona?: string;
  dormitorios?: string;
  precioMin?: string;
  precioMax?: string;
  moneda?: string;
  orden?: string;
  pagina?: string;
};

const columnasTarjeta = {
  id: propiedades.id,
  codigo: propiedades.codigo,
  titulo: propiedades.titulo,
  operacion: propiedades.operacion,
  tipo: propiedades.tipo,
  zona: propiedades.zona,
  departamento: propiedades.departamento,
  precio: propiedades.precio,
  moneda: propiedades.moneda,
  estado: propiedades.estado,
  dormitorios: propiedades.dormitorios,
  banos: propiedades.banos,
  m2Cubiertos: propiedades.m2Cubiertos,
  m2Privados: propiedades.m2Privados,
  m2Terreno: propiedades.m2Terreno,
  hectareas: propiedades.hectareas,
  cocheras: propiedades.cocheras,
  // Solo la cantidad: las fotos se sirven aparte por /api/fotos (son pesadas).
  cantidadFotos: sql<number>`jsonb_array_length(${propiedades.fotos})`.mapWith(Number),
};

export type TarjetaPropiedad = Awaited<ReturnType<typeof buscarPropiedades>>["filas"][number];

export async function buscarPropiedades(f: Filtros) {
  const conds: (SQL | undefined)[] = [condicionPublica];
  if (f.operacion === "VENTA" || f.operacion === "ALQUILER") {
    conds.push(eq(propiedades.operacion, f.operacion));
  }
  if (f.tipo) conds.push(eq(propiedades.tipo, f.tipo));
  if (f.zona?.trim()) {
    const z = `%${f.zona.trim()}%`;
    conds.push(or(ilike(propiedades.zona, z), ilike(propiedades.departamento, z)));
  }
  const dorm = Number(f.dormitorios);
  if (dorm > 0) conds.push(gte(propiedades.dormitorios, dorm));
  const min = Number(f.precioMin);
  const max = Number(f.precioMax);
  if (min > 0 || max > 0) {
    if (f.moneda === "USD" || f.moneda === "UYU") conds.push(eq(propiedades.moneda, f.moneda));
    if (min > 0) conds.push(gte(propiedades.precio, min));
    if (max > 0) conds.push(lte(propiedades.precio, max));
  }

  const orden =
    f.orden === "precio_asc"
      ? sql`${propiedades.precio} ASC NULLS LAST`
      : f.orden === "precio_desc"
        ? sql`${propiedades.precio} DESC NULLS LAST`
        : desc(propiedades.creadoEn);

  const pagina = Math.max(1, Number(f.pagina) || 1);
  const where = and(...conds);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(propiedades)
    .where(where);

  const filas = await db
    .select(columnasTarjeta)
    .from(propiedades)
    .where(where)
    .orderBy(orden)
    .limit(POR_PAGINA)
    .offset((pagina - 1) * POR_PAGINA);

  return { filas, total, pagina, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}

export async function propiedadesDestacadas(limite = 6) {
  return db
    .select(columnasTarjeta)
    .from(propiedades)
    .where(and(condicionPublica, eq(propiedades.estado, "ACTIVA")))
    .orderBy(sql`jsonb_array_length(${propiedades.fotos}) > 0 DESC`, desc(propiedades.creadoEn))
    .limit(limite);
}

/** Tipos y zonas que existen entre las propiedades publicadas (para los filtros). */
export async function opcionesFiltros() {
  const tipos = await db
    .selectDistinct({ v: propiedades.tipo })
    .from(propiedades)
    .where(condicionPublica)
    .orderBy(propiedades.tipo);
  const zonas = await db
    .selectDistinct({ v: propiedades.zona })
    .from(propiedades)
    .where(condicionPublica)
    .orderBy(propiedades.zona);
  const [cuentas] = await db
    .select({
      venta: sql<number>`count(*) filter (where ${propiedades.operacion} = 'VENTA')`.mapWith(Number),
      alquiler: sql<number>`count(*) filter (where ${propiedades.operacion} = 'ALQUILER')`.mapWith(Number),
    })
    .from(propiedades)
    .where(condicionPublica);
  return {
    tipos: tipos.map((t) => t.v).filter(Boolean),
    zonas: zonas.map((z) => z.v).filter(Boolean),
    venta: cuentas?.venta ?? 0,
    alquiler: cuentas?.alquiler ?? 0,
  };
}

export async function propiedadPublica(codigo: string) {
  const [p] = await db
    .select({
      id: propiedades.id,
      codigo: propiedades.codigo,
      titulo: propiedades.titulo,
      operacion: propiedades.operacion,
      tipo: propiedades.tipo,
      subtipo: propiedades.subtipo,
      zona: propiedades.zona,
      departamento: propiedades.departamento,
      precio: propiedades.precio,
      moneda: propiedades.moneda,
      estado: propiedades.estado,
      m2Cubiertos: propiedades.m2Cubiertos,
      m2Privados: propiedades.m2Privados,
      m2Terreno: propiedades.m2Terreno,
      hectareas: propiedades.hectareas,
      dormitorios: propiedades.dormitorios,
      banos: propiedades.banos,
      ambientes: propiedades.ambientes,
      cocheras: propiedades.cocheras,
      bodegas: propiedades.bodegas,
      antiguedad: propiedades.antiguedad,
      numeroPiso: propiedades.numeroPiso,
      cantidadPisos: propiedades.cantidadPisos,
      orientacion: propiedades.orientacion,
      disposicion: propiedades.disposicion,
      gastosComunes: propiedades.gastosComunes,
      mascotas: propiedades.mascotas,
      estadoEdilicio: propiedades.estadoEdilicio,
      extras: propiedades.extras,
      descripcion: propiedades.descripcion,
      cantidadFotos: sql<number>`jsonb_array_length(${propiedades.fotos})`.mapWith(Number),
      agenteNombre: usuarios.nombre,
      agenteTelefono: usuarios.telefono,
    })
    .from(propiedades)
    .innerJoin(usuarios, eq(propiedades.agenteId, usuarios.id))
    .where(and(condicionPublica, eq(propiedades.codigo, codigo)));
  return p ?? null;
}

/** Una foto (data URL guardada en la base) de una propiedad publicada. */
export async function fotoPublica(id: string, indice: number) {
  const [fila] = await db
    .select({ foto: sql<string | null>`${propiedades.fotos} ->> ${sql.raw(String(Math.trunc(indice)))}` })
    .from(propiedades)
    .where(and(condicionPublica, eq(propiedades.id, id)));
  return fila?.foto ?? null;
}

export function urlFoto(id: string, indice: number) {
  return `/api/fotos/${id}/${indice}`;
}
