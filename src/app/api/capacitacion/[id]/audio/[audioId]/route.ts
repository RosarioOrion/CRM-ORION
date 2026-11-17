import { revalidatePath } from "next/cache";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";
import {
  AUDIO_TROZO_BYTES,
  agregarTrozo,
  borrarAudio,
  infoAudio,
  leerTrozo,
  terminarAudio,
} from "@/lib/capacitacion-audio";

type Ctx = { params: Promise<{ id: string; audioId: string }> };

// Reproducir: responde por pedazos (Range), así se puede adelantar y anda en iPhone.
export async function GET(req: Request, { params }: Ctx) {
  if (!(await obtenerSesion())) return new Response("No autorizado", { status: 401 });
  const { id, audioId } = await params;
  const a = await infoAudio(audioId, id);
  if (!a || !a.completo) return new Response("No encontrado", { status: 404 });

  const total = a.peso;
  const base = {
    "Content-Type": a.mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=86400",
    "Content-Disposition": "inline",
  };
  const rango = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  let inicio = 0;
  let fin = total - 1;
  if (rango) {
    if (rango[1] === "" && rango[2] !== "") {
      inicio = Math.max(0, total - Number(rango[2]));
    } else {
      inicio = Number(rango[1] || 0);
      if (rango[2] !== "") fin = Math.min(total - 1, Number(rango[2]));
    }
    if (inicio >= total || inicio > fin) {
      return new Response(null, { status: 416, headers: { ...base, "Content-Range": `bytes */${total}` } });
    }
  }
  // Sin Range o con rango abierto: se manda de a pedazos de hasta 2 MB.
  fin = Math.min(fin, inicio + 2 * 1024 * 1024 - 1);
  const trozo = await leerTrozo(audioId, inicio, fin - inicio + 1);
  const parcial = rango || fin < total - 1;
  return new Response(new Uint8Array(trozo), {
    status: parcial ? 206 : 200,
    headers: {
      ...base,
      "Content-Length": String(trozo.length),
      ...(parcial ? { "Content-Range": `bytes ${inicio}-${inicio + trozo.length - 1}/${total}` } : {}),
    },
  });
}

async function soloCeo() {
  const s = await obtenerSesion();
  return s && esCEO(s.rol) ? s : null;
}

// Subir un pedazo: ?desde=<bytes ya subidos>; con ?fin=1 se cierra.
export async function PUT(req: Request, { params }: Ctx) {
  if (!(await soloCeo())) return Response.json({ error: "No autorizado." }, { status: 401 });
  const { id, audioId } = await params;
  const url = new URL(req.url);
  if (url.searchParams.get("fin") === "1") {
    const ok = await terminarAudio(audioId);
    if (!ok) return Response.json({ error: "El audio no llegó completo. Probá subirlo de nuevo." }, { status: 400 });
    revalidatePath(`/capacitacion/${id}`);
    revalidatePath("/capacitacion");
    return Response.json({ ok: true });
  }
  const desde = Number(url.searchParams.get("desde"));
  const trozo = Buffer.from(await req.arrayBuffer());
  if (!trozo.length || trozo.length > AUDIO_TROZO_BYTES + 1024)
    return Response.json({ error: "Pedazo inválido." }, { status: 400 });
  const largo = await agregarTrozo(audioId, desde, trozo);
  if (largo === null) return Response.json({ error: "Se cortó la subida. Probá de nuevo." }, { status: 409 });
  return Response.json({ largo });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await soloCeo())) return Response.json({ error: "No autorizado." }, { status: 401 });
  const { id, audioId } = await params;
  await borrarAudio(audioId, id);
  revalidatePath(`/capacitacion/${id}`);
  revalidatePath("/capacitacion");
  return Response.json({ ok: true });
}
