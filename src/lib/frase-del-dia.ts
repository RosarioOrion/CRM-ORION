import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { capacitacionPaginas, documentosCapacitacion, frasesInicio } from "@/db/schema";
import { nombreMaterial } from "@/lib/manual-indice";
import { CATEGORIA_FRASE, FRASES_SEMILLA, type CategoriaFrase } from "@/lib/frases-semilla";

// "Frase del día" del Inicio: cada capítulo del Manual Orion termina con una
// "AFIRMACIÓN DEL CAPÍTULO" y su "Acción asociada". Orion las saca del texto de
// los PDF (el mismo que usa el buscador) y suma las frases propias que cargue
// la CEO. Todo el equipo ve la misma frase cada día, y cambia día a día.

export type Frase = {
  texto: string;
  accion: string | null;
  /** Capítulo de donde sale, con link a la página. */
  fuente: { nombre: string; href: string } | null;
  /** Frases de autores: quién la dijo y de qué obra. */
  autor?: string | null;
  obra?: string | null;
  categoria?: string | null;
};

/** Carga una sola vez la base de frases de autores (frases-semilla.ts). */
export async function cargarFrasesSemilla() {
  const ya = await db.execute(sql`SELECT 1 FROM datos_cargados WHERE clave = 'frases-semilla'`);
  if (ya.length) return 0;
  await db.insert(frasesInicio).values(
    FRASES_SEMILLA.map((f) => ({ texto: f.t, accion: null, autor: f.a, fuente: f.f ?? null, categoria: f.c, origen: "SEMILLA" }))
  );
  await db.execute(sql`INSERT INTO datos_cargados (clave) VALUES ('frases-semilla') ON CONFLICT DO NOTHING`);
  return FRASES_SEMILLA.length;
}

/** Etiqueta de categoría ("🧠 Mentalidad"). */
export const etiquetaCategoria = (c: string | null | undefined) =>
  c && c in CATEGORIA_FRASE ? CATEGORIA_FRASE[c as CategoriaFrase] : null;

/** Hash estable de un texto, para mezclar siempre igual. */
function hash(t: string): number {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return h >>> 0;
}

const TITULO = /A\s?F\s?I\s?R\s?M\s?A\s?C\s?I\s?[OÓ]\s?N\s+D\s?E\s?L\s+C\s?A\s?P\s?[IÍ]\s?T\s?U\s?L\s?O/i;

/** De la página final de un capítulo: la afirmación y la acción asociada. */
export function leerAfirmacion(texto: string): { texto: string; accion: string | null } | null {
  const m = TITULO.exec(texto);
  if (!m) return null;
  const resto = texto.slice(m.index + m[0].length);
  const iAccion = resto.search(/Acci[oó]n asociada\s*:/i);
  const cuerpo = (iAccion >= 0 ? resto.slice(0, iAccion) : resto.split(/\n\s*\d+\s*$/)[0])
    .replace(/\s+/g, " ")
    .trim();
  if (cuerpo.length < 8 || cuerpo.length > 300) return null;
  let accion: string | null = null;
  if (iAccion >= 0) {
    accion = resto
      .slice(iAccion)
      .replace(/^Acci[oó]n asociada\s*:\s*/i, "")
      .split("\n")[0]
      .replace(/\s+/g, " ")
      .trim();
    accion = accion ? accion.charAt(0).toUpperCase() + accion.slice(1) : null;
  }
  return { texto: cuerpo, accion };
}

/** Por si todavía no hay capítulos ni frases cargadas. */
const RESPALDO: Frase[] = [
  { texto: "Lo que hacés hoy es la cartera que vas a tener en tres meses.", accion: "Hacé hoy tus llamadas de captación antes de las 11.", fuente: null },
  { texto: "Una llamada más por día son treinta oportunidades más por mes.", accion: "Cumplí tu Plan del día completo.", fuente: null },
  { texto: "Cada propietario que escuchás con atención es una puerta que se abre.", accion: "En tu próxima llamada, preguntá primero qué necesita.", fuente: null },
];

/** Número de día en Uruguay (cambia a la medianoche de Montevideo). */
function diaUY(ahora: Date): number {
  return Math.floor((ahora.getTime() - 3 * 3600 * 1000) / (24 * 3600 * 1000));
}

export async function fraseDelDia(ahora: Date = new Date()): Promise<Frase> {
  const pool: Frase[] = [];
  try {
    const paginas = await db
      .select({
        texto: capacitacionPaginas.texto,
        pagina: capacitacionPaginas.pagina,
        id: documentosCapacitacion.id,
        clase: documentosCapacitacion.clase,
        numero: documentosCapacitacion.numero,
        titulo: documentosCapacitacion.titulo,
      })
      .from(capacitacionPaginas)
      .innerJoin(documentosCapacitacion, eq(capacitacionPaginas.documentoId, documentosCapacitacion.id))
      .where(
        and(
          eq(documentosCapacitacion.clase, "CAPITULO"),
          sql`${capacitacionPaginas.busqueda} LIKE '%a f i r m a c i o n d e l c a p i t u l o%'`
        )
      )
      .orderBy(sql`coalesce(${documentosCapacitacion.orden}, 5000)`, asc(capacitacionPaginas.pagina));
    const vistos = new Set<string>();
    for (const p of paginas) {
      if (vistos.has(p.id)) continue;
      const a = leerAfirmacion(p.texto);
      if (!a) continue;
      vistos.add(p.id);
      pool.push({
        ...a,
        fuente: { nombre: nombreMaterial(p.clase, p.numero, p.titulo), href: `/capacitacion/${p.id}?pagina=${p.pagina}` },
      });
    }
  } catch {
    // tablas del buscador todavía no creadas
  }
  try {
    const propias = await db.select().from(frasesInicio).orderBy(asc(frasesInicio.creadoEn));
    for (const f of propias)
      pool.push({ texto: f.texto, accion: f.accion, fuente: null, autor: f.autor, obra: f.fuente, categoria: f.categoria });
  } catch {
    // tabla todavía no creada
  }
  // Mezcla fija (no depende del orden de carga): así se alternan manual,
  // autores, refranes y frases propias en lugar de ir en bloques.
  const lista = pool.length ? [...pool].sort((a, b) => hash(a.texto) - hash(b.texto)) : RESPALDO;
  return lista[((diaUY(ahora) % lista.length) + lista.length) % lista.length];
}
