"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { documentosCapacitacion } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";

async function requerirAdmin() {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion.rol)) {
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

  const titulo = String(formData.get("titulo") || "").trim();
  const descripcion = String(formData.get("descripcion") || "").trim();
  const link = String(formData.get("link") || "").trim();
  const paginasRaw = String(formData.get("paginas") || "").trim();
  const paginas = paginasRaw ? Math.max(0, Math.round(Number(paginasRaw))) : null;
  const archivo = formData.get("archivo");

  if (!titulo) return { error: "Ingresá un título." };

  let archivoDataUri: string | null = null;
  let archivoNombre: string | null = null;
  let archivoPesoBytes: number | null = null;

  if (archivo instanceof File && archivo.size > 0) {
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

  await db.insert(documentosCapacitacion).values({
    titulo,
    descripcion: descripcion || null,
    archivo: archivoDataUri,
    archivoNombre,
    archivoPesoBytes,
    link: link || null,
    paginas,
    subidoPorId: sesion.userId,
  });

  revalidatePath("/capacitacion");
  return { ok: Date.now() };
}

export async function eliminarDocumentoCapacitacion(documentoId: string) {
  await requerirAdmin();
  await db.delete(documentosCapacitacion).where(eq(documentosCapacitacion.id, documentoId));
  revalidatePath("/capacitacion");
}
