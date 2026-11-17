import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documentosCapacitacion } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";
import { AUDIO_MAX_BYTES, crearAudio } from "@/lib/capacitacion-audio";

// Empieza la subida de un audio de un capítulo (solo la CEO). Devuelve el id;
// después el navegador manda los pedazos a /audio/[audioId].
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion || !esCEO(sesion.rol)) return Response.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  const [doc] = await db.select({ id: documentosCapacitacion.id }).from(documentosCapacitacion).where(eq(documentosCapacitacion.id, id));
  if (!doc) return Response.json({ error: "No existe ese material." }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { nombre?: string; mime?: string; peso?: number; duracionSeg?: number } | null;
  const peso = Number(body?.peso);
  const mime = String(body?.mime || "");
  if (!mime.startsWith("audio/") && mime !== "video/mp4") return Response.json({ error: "Tiene que ser un archivo de audio." }, { status: 400 });
  if (!(peso > 0)) return Response.json({ error: "El archivo está vacío." }, { status: 400 });
  if (peso > AUDIO_MAX_BYTES)
    return Response.json({ error: `El audio pesa más de ${AUDIO_MAX_BYTES / 1024 / 1024} MB. Dividilo en partes.` }, { status: 400 });

  const audioId = await crearAudio({
    documentoId: id,
    nombre: String(body?.nombre || "audio").slice(0, 150),
    mime: mime === "video/mp4" ? "audio/mp4" : mime,
    peso,
    duracionSeg: Number(body?.duracionSeg) > 0 ? Math.round(Number(body?.duracionSeg)) : null,
  });
  return Response.json({ audioId });
}
