import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { capacitacionPaginas, documentosCapacitacion } from "@/db/schema";

// Buscador dentro de los PDF de Capacitación: se extrae el texto de cada
// página (con pdf.js, en el servidor) y se guarda; la búsqueda ignora
// mayúsculas y tildes. Los materiales que son solo un link (Drive, etc.) no
// se pueden leer: hay que subir el PDF a Orion.

/** Minúsculas, sin tildes y con espacios simples (para buscar). */
export function normalizar(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Texto de cada página de un PDF. */
export async function extraerPaginas(pdf: Uint8Array): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const tarea = pdfjs.getDocument({ data: pdf, disableFontFace: true, useSystemFonts: false });
  const doc = await tarea.promise;
  const paginas: string[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const p = await doc.getPage(i);
      const c = await p.getTextContent();
      const texto = c.items
        .map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : ""))
        .join("")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{2,}/g, "\n")
        .trim();
      paginas.push(texto);
      p.cleanup();
    }
  } finally {
    await tarea.destroy();
  }
  return paginas;
}

/** Extrae y guarda el texto de un material (si tiene PDF subido a Orion). */
export async function indexarDocumento(documentoId: string): Promise<number> {
  const [d] = await db
    .select({ archivo: documentosCapacitacion.archivo })
    .from(documentosCapacitacion)
    .where(eq(documentosCapacitacion.id, documentoId));
  let paginas: string[] = [];
  const coma = d?.archivo?.indexOf(",") ?? -1;
  if (d?.archivo && coma > 0) {
    try {
      paginas = await extraerPaginas(new Uint8Array(Buffer.from(d.archivo.slice(coma + 1), "base64")));
    } catch (e) {
      // No se marca como hecho: se reintenta en el próximo arranque.
      console.error("[capacitacion] no se pudo leer el PDF", documentoId, e instanceof Error ? e.message : e);
      return 0;
    }
  }
  await db.transaction(async (tx) => {
    await tx.delete(capacitacionPaginas).where(eq(capacitacionPaginas.documentoId, documentoId));
    const filas = paginas
      .map((texto, i) => ({ documentoId, pagina: i + 1, texto, busqueda: normalizar(texto) }))
      .filter((f) => f.busqueda.length > 0);
    if (filas.length) await tx.insert(capacitacionPaginas).values(filas);
    // Se marca aunque no tenga texto (por ejemplo, un PDF escaneado), así no se reintenta.
    await tx
      .update(documentosCapacitacion)
      .set({ textoIndexadoEn: new Date() })
      .where(eq(documentosCapacitacion.id, documentoId));
  });
  return paginas.length;
}

/** Los PDF ya subidos que todavía no tienen el texto extraído (de a uno, en segundo plano). */
export async function indexarPendientes(): Promise<number> {
  const pendientes = await db
    .select({ id: documentosCapacitacion.id })
    .from(documentosCapacitacion)
    .where(and(isNull(documentosCapacitacion.textoIndexadoEn), isNotNull(documentosCapacitacion.archivo)));
  for (const p of pendientes) await indexarDocumento(p.id);
  return pendientes.length;
}

export type ResultadoBusqueda = {
  documentoId: string;
  pagina: number;
  antes: string;
  coincide: string;
  despues: string;
};

/** Fragmento del texto original alrededor de la coincidencia (sin tildes ni mayúsculas). */
export function fragmento(original: string, q: string, margen = 90): { antes: string; coincide: string; despues: string } | null {
  // Se normaliza carácter por carácter para poder volver a la posición original.
  let norm = "";
  const pos: number[] = [];
  for (let i = 0; i < original.length; i++) {
    const n = original[i].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s/g, " ");
    for (const ch of n) {
      norm += ch;
      pos.push(i);
    }
  }
  const qn = normalizar(q);
  // Los espacios del texto pueden ser varios: se busca tolerando eso.
  const re = new RegExp(
    "(?<![a-z0-9])" + qn.split(" ").map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+")
  );
  const m = re.exec(norm);
  if (!m) return null;
  const ini = pos[m.index];
  const fin = pos[m.index + m[0].length - 1] + 1;
  const a = Math.max(0, ini - margen);
  const b = Math.min(original.length, fin + margen);
  const limpiar = (t: string) => t.replace(/\s+/g, " ");
  return {
    antes: (a > 0 ? "…" : "") + limpiar(original.slice(a, ini)),
    coincide: limpiar(original.slice(ini, fin)),
    despues: limpiar(original.slice(fin, b)) + (b < original.length ? "…" : ""),
  };
}

/** Busca una palabra o frase en todos los PDF. Devuelve una coincidencia por página. */
export async function buscarEnManual(q: string, limite = 120): Promise<ResultadoBusqueda[]> {
  const qn = normalizar(q);
  if (qn.length < 2) return [];
  // Desde el inicio de una palabra ("iva" no encuentra "positiva"; "colch" sí encuentra "colchón").
  const patron = `\\m${qn
    .split(" ")
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+")}`;
  const filas = await db
    .select({ documentoId: capacitacionPaginas.documentoId, pagina: capacitacionPaginas.pagina, texto: capacitacionPaginas.texto })
    .from(capacitacionPaginas)
    .where(sql`${capacitacionPaginas.busqueda} ~ ${patron}`)
    .orderBy(asc(capacitacionPaginas.documentoId), asc(capacitacionPaginas.pagina))
    .limit(limite * 2);
  const out: ResultadoBusqueda[] = [];
  for (const f of filas) {
    const fr = fragmento(f.texto, q);
    if (fr) out.push({ documentoId: f.documentoId, pagina: f.pagina, ...fr });
    if (out.length >= limite) break;
  }
  return out;
}
