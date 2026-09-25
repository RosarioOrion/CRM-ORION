import { fotoPublica } from "@/lib/sitio";

// Sirve las fotos de las propiedades publicadas en la web como imágenes
// normales (en la base están guardadas como data URL), con caché.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; n: string }> }
) {
  const { id, n } = await params;
  const indice = Number(n);
  if (!Number.isInteger(indice) || indice < 0 || indice > 200) {
    return new Response("No encontrada", { status: 404 });
  }

  const dataUrl = await fotoPublica(id, indice);
  const coma = dataUrl?.indexOf(",") ?? -1;
  const m = dataUrl && coma > 0 ? dataUrl.slice(0, coma).match(/^data:([^;]+);base64$/) : null;
  if (!dataUrl || !m) return new Response("No encontrada", { status: 404 });

  const buffer = Buffer.from(dataUrl.slice(coma + 1), "base64");
  return new Response(buffer, {
    headers: {
      "Content-Type": m[1],
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
