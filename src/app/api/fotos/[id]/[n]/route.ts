import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { propiedades } from "@/db/schema";
import { fotoPublica } from "@/lib/sitio";
import { obtenerSesion } from "@/lib/auth";

// Sirve las fotos de las propiedades como imágenes normales (en la base
// están guardadas como data URL).
// - Propiedades publicadas en la web: para cualquiera.
// - Cualquier propiedad: para quien tenga sesión en Orion (la ficha interna).
// El orden de las fotos se puede cambiar, así que el caché es corto; la
// ficha interna agrega ?v=<huella> para que siempre muestre la versión nueva.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; n: string }> }
) {
  const { id, n } = await params;
  const indice = Number(n);
  if (!Number.isInteger(indice) || indice < 0 || indice > 200) {
    return new Response("No encontrada", { status: 404 });
  }

  let dataUrl = await fotoPublica(id, indice);
  let privada = false;
  if (!dataUrl && (await obtenerSesion())) {
    const [fila] = await db
      .select({ foto: sql<string | null>`${propiedades.fotos} ->> ${sql.raw(String(indice))}` })
      .from(propiedades)
      .where(eq(propiedades.id, id));
    dataUrl = fila?.foto ?? null;
    privada = true;
  }

  const coma = dataUrl?.indexOf(",") ?? -1;
  const m = dataUrl && coma > 0 ? dataUrl.slice(0, coma).match(/^data:([^;]+);base64$/) : null;
  if (!dataUrl || !m) return new Response("No encontrada", { status: 404 });

  const buffer = Buffer.from(dataUrl.slice(coma + 1), "base64");
  return new Response(buffer, {
    headers: {
      "Content-Type": m[1],
      "Content-Length": String(buffer.length),
      "Cache-Control": privada
        ? "private, max-age=86400"
        : "public, max-age=600, stale-while-revalidate=3600",
    },
  });
}
