"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { documentosCapacitacion } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";
import { esTipoMaterial } from "@/lib/capacitacion";
import { asegurarColumnaTipo } from "./datos";

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
  await db.insert(documentosCapacitacion).values({
    tipo,
    titulo,
    descripcion: descripcion || null,
    archivo: archivoDataUri,
    archivoNombre,
    archivoPesoBytes,
    link: link || null,
    paginas: tipo === "PDF" ? paginas : null,
    subidoPorId: sesion.userId,
  });

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
  revalidatePath("/capacitacion");
  revalidatePath("/capacitacion/subir");
  revalidatePath(`/capacitacion/${id}`);
  return { ok: Date.now() };
}

export async function eliminarDocumentoCapacitacion(documentoId: string) {
  await requerirAdmin();
  await db.delete(documentosCapacitacion).where(eq(documentosCapacitacion.id, documentoId));
  revalidatePath("/capacitacion");
  revalidatePath("/capacitacion/subir");
}
