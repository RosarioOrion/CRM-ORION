"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { capacitacionAreas, documentosCapacitacion } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { borrarAudiosDe } from "@/lib/capacitacion-audio";
import { esCEO } from "@/lib/permisos";
import { esTipoMaterial } from "@/lib/capacitacion";
import { asegurarColumnaTipo, listarAreas } from "./datos";
import { indexarDocumento } from "@/lib/capacitacion-texto";
import { LETRAS_ANEXO, ordenDe, BLOQUES, type Clase } from "@/lib/manual-indice";

/** Número, bloque y áreas que vienen del formulario. */
async function leerIndice(formData: FormData) {
  const claseRaw = String(formData.get("clase") || "OTRO");
  const clase: Clase = claseRaw === "CAPITULO" || claseRaw === "ANEXO" ? claseRaw : "OTRO";
  let numero: string | null = String(formData.get("numero") || "").trim().toUpperCase() || null;
  if (clase === "CAPITULO") numero = numero && /^\d{1,2}$/.test(numero) ? String(Number(numero)) : null;
  else if (clase === "ANEXO") numero = numero && LETRAS_ANEXO.includes(numero) ? numero : null;
  else numero = null;
  const bloqueRaw = String(formData.get("bloque") || "");
  const bloque = BLOQUES.some((b) => b.clave === bloqueRaw) ? bloqueRaw : null;
  const validas = new Set((await listarAreas()).map((a) => a.clave));
  const areas = [...new Set(formData.getAll("areas").map(String))].filter((a) => validas.has(a));
  return { clase, numero, orden: ordenDe(clase, numero), bloque, areas };
}

async function requerirAdmin() {
  const sesion = await obtenerSesion();
  if (!sesion || !esCEO(sesion.rol)) {
    throw new Error("No autorizado.");
  }
  return sesion;
}

// Los PDF grandes (el manual de capacitación completo puede pesar varios
// MB con imágenes) conviene subirlos a un link externo (Drive, etc.) en
// vez de guardarlos en la base — esto es solo para documentos livianos.
const ARCHIVO_MAX_BYTES = 15 * 1024 * 1024;

export type DocumentoState = { error?: string; ok?: number };

export async function subirDocumentoCapacitacion(
  _prevState: DocumentoState,
  formData: FormData
): Promise<DocumentoState> {
  let sesion;
  try {
    sesion = await requerirAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No autorizado." };
  }

  const tipoRaw = String(formData.get("tipo") || "PDF");
  const tipo = esTipoMaterial(tipoRaw) ? tipoRaw : "PDF";
  const titulo = String(formData.get("titulo") || "").trim();
  const descripcion = String(formData.get("descripcion") || "").trim();
  const link = String(formData.get("link") || "").trim();
  const paginasRaw = String(formData.get("paginas") || "").trim();
  const paginas = paginasRaw ? Math.max(0, Math.round(Number(paginasRaw))) : null;
  const archivo = formData.get("archivo");

  if (!titulo) return { error: "Ingresá un título." };
  if (link && !/^https?:\/\//i.test(link)) {
    return { error: "El link tiene que empezar con http:// o https://" };
  }
  if (tipo === "VIDEO" && !link) {
    return { error: "Pegá el link de la clase grabada (YouTube, Vimeo, Drive o Loom)." };
  }

  let archivoDataUri: string | null = null;
  let archivoNombre: string | null = null;
  let archivoPesoBytes: number | null = null;

  if (tipo === "PDF" && archivo instanceof File && archivo.size > 0) {
    if (archivo.type !== "application/pdf") {
      return { error: "El archivo tiene que ser un PDF." };
    }
    if (archivo.size > ARCHIVO_MAX_BYTES) {
      return {
        error: `El PDF pesa más de ${Math.round(ARCHIVO_MAX_BYTES / (1024 * 1024))}MB. Para archivos más pesados, pegá un link (Drive, etc.) en vez de subirlo.`,
      };
    }
    const buffer = Buffer.from(await archivo.arrayBuffer());
    archivoDataUri = `data:application/pdf;base64,${buffer.toString("base64")}`;
    archivoNombre = archivo.name;
    archivoPesoBytes = archivo.size;
  }

  if (!archivoDataUri && !link) {
    return { error: "Subí un PDF o pegá un link al documento." };
  }

  await asegurarColumnaTipo();
  const indice = await leerIndice(formData);
  const [nuevo] = await db.insert(documentosCapacitacion).values({
    ...indice,
    tipo,
    titulo,
    descripcion: descripcion || null,
    archivo: archivoDataUri,
    archivoNombre,
    archivoPesoBytes,
    link: link || null,
    paginas: tipo === "PDF" ? paginas : null,
    subidoPorId: sesion.userId,
  }).returning({ id: documentosCapacitacion.id });
  // Buscador: se extrae el texto del PDF en segundo plano.
  if (archivoDataUri) void indexarDocumento(nuevo.id).catch(() => {});

  revalidatePath("/capacitacion");
  revalidatePath("/capacitacion/subir");
  return { ok: Date.now() };
}

/** Editar un material ya subido (título, descripción, link, páginas o reemplazar el PDF). */
export async function editarDocumentoCapacitacion(
  _prevState: DocumentoState,
  formData: FormData
): Promise<DocumentoState> {
  try {
    await requerirAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No autorizado." };
  }
  const id = String(formData.get("documentoId") || "");
  await asegurarColumnaTipo();
  const [actual] = await db
    .select({ tipo: documentosCapacitacion.tipo, archivoNombre: documentosCapacitacion.archivoNombre })
    .from(documentosCapacitacion)
    .where(eq(documentosCapacitacion.id, id));
  if (!actual) return { error: "Ese material ya no existe." };

  const titulo = String(formData.get("titulo") || "").trim();
  const descripcion = String(formData.get("descripcion") || "").trim();
  const link = String(formData.get("link") || "").trim();
  const paginasRaw = String(formData.get("paginas") || "").trim();
  const paginas = paginasRaw ? Math.max(0, Math.round(Number(paginasRaw))) : null;
  const archivo = formData.get("archivo");
  const esVideo = actual.tipo === "VIDEO";

  if (!titulo) return { error: "Ingresá un título." };
  if (link && !/^https?:\/\//i.test(link)) return { error: "El link tiene que empezar con http:// o https://" };
  if (esVideo && !link) return { error: "Pegá el link de la clase grabada." };

  const cambios: Partial<typeof documentosCapacitacion.$inferInsert> = {
    ...(await leerIndice(formData)),
    titulo,
    descripcion: descripcion || null,
    link: link || null,
    paginas: esVideo ? null : paginas,
  };
  if (!esVideo && archivo instanceof File && archivo.size > 0) {
    if (archivo.type !== "application/pdf") return { error: "El archivo tiene que ser un PDF." };
    if (archivo.size > ARCHIVO_MAX_BYTES) {
      return { error: `El PDF pesa más de ${Math.round(ARCHIVO_MAX_BYTES / (1024 * 1024))}MB. Pegá un link en vez de subirlo.` };
    }
    const buffer = Buffer.from(await archivo.arrayBuffer());
    cambios.archivo = `data:application/pdf;base64,${buffer.toString("base64")}`;
    cambios.archivoNombre = archivo.name;
    cambios.archivoPesoBytes = archivo.size;
  } else if (!esVideo && !actual.archivoNombre && !link) {
    return { error: "Subí un PDF o pegá un link al documento." };
  }

  await db.update(documentosCapacitacion).set(cambios).where(eq(documentosCapacitacion.id, id));
  if (cambios.archivo) void indexarDocumento(id).catch(() => {});
  revalidatePath("/capacitacion");
  revalidatePath("/capacitacion/subir");
  revalidatePath(`/capacitacion/${id}`);
  return { ok: Date.now() };
}

export async function eliminarDocumentoCapacitacion(documentoId: string) {
  await requerirAdmin();
  await db.delete(documentosCapacitacion).where(eq(documentosCapacitacion.id, documentoId));
  await borrarAudiosDe(documentoId);
  revalidatePath("/capacitacion");
  revalidatePath("/capacitacion/subir");
}

// --- Áreas por tema (solo la CEO) ------------------------------------------

export async function guardarArea(_prev: DocumentoState, formData: FormData): Promise<DocumentoState> {
  try {
    await requerirAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No autorizado." };
  }
  const clave = String(formData.get("clave") || "").trim();
  const nombre = String(formData.get("nombre") || "").trim().slice(0, 60);
  const icono = String(formData.get("icono") || "").trim().slice(0, 8) || "📘";
  const orden = Math.round(Number(formData.get("orden")) || 0);
  if (!nombre) return { error: "Ponele un nombre al área." };
  if (clave) {
    await db.update(capacitacionAreas).set({ nombre, icono, orden }).where(eq(capacitacionAreas.clave, clave));
  } else {
    const base =
      nombre
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "area";
    await db
      .insert(capacitacionAreas)
      .values({ clave: `${base}-${Date.now().toString(36)}`, nombre, icono, orden });
  }
  revalidatePath("/capacitacion");
  revalidatePath("/capacitacion/areas");
  return { ok: Date.now() };
}

export async function eliminarArea(clave: string): Promise<{ error?: string }> {
  try {
    await requerirAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No autorizado." };
  }
  await db.delete(capacitacionAreas).where(eq(capacitacionAreas.clave, clave));
  // Se saca el área de los materiales que la tenían.
  await db.execute(
    sql`UPDATE documentos_capacitacion SET areas = areas - ${clave} WHERE areas ? ${clave}`
  );
  revalidatePath("/capacitacion");
  revalidatePath("/capacitacion/areas");
  return {};
}
