import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documentosCapacitacion } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";

// Sirve el PDF de un documento de capacitación (guardado en la base como
// data URL) para verlo en el navegador. Solo para quien tenga sesión.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await obtenerSesion())) return new Response("No autorizado", { status: 401 });
  const { id } = await params;

  const [fila] = await db
    .select({ archivo: documentosCapacitacion.archivo, nombre: documentosCapacitacion.archivoNombre })
    .from(documentosCapacitacion)
    .where(eq(documentosCapacitacion.id, id));

  const dataUrl = fila?.archivo;
  const coma = dataUrl?.indexOf(",") ?? -1;
  if (!dataUrl || coma < 0) return new Response("No encontrado", { status: 404 });

  const buffer = Buffer.from(dataUrl.slice(coma + 1), "base64");
  const nombre = (fila.nombre || "documento.pdf").replace(/[^\w.\- ]/g, "_");
  // ?descargar=1 lo baja; si no, se abre en el visor del navegador.
  const modo = new URL(req.url).searchParams.has("descargar") ? "attachment" : "inline";
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(buffer.length),
      "Content-Disposition": `${modo}; filename="${nombre}"`,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
