import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { propiedades } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { ESTADOS_PUBLICOS } from "@/lib/sitio";
import { esFormato, generarFotoMarca } from "@/lib/foto-marca";

// Foto branded de una propiedad en uno de los tres formatos.
// - Propiedades publicadas en la web: para cualquiera (así el link se puede
//   compartir).
// - Cualquier propiedad: para quien tenga sesión en Orion.
// ?descargar=1 la baja como archivo en vez de abrirla.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; formato: string }> }
) {
  const { id, formato } = await params;
  if (!esFormato(formato)) return new Response("No encontrada", { status: 404 });

  const [p] = await db
    .select({
      codigo: propiedades.codigo,
      operacion: propiedades.operacion,
      tipo: propiedades.tipo,
      precio: propiedades.precio,
      moneda: propiedades.moneda,
      dormitorios: propiedades.dormitorios,
      banos: propiedades.banos,
      m2Cubiertos: propiedades.m2Cubiertos,
      m2Privados: propiedades.m2Privados,
      m2Terreno: propiedades.m2Terreno,
      hectareas: propiedades.hectareas,
      zona: propiedades.zona,
      departamento: propiedades.departamento,
      estado: propiedades.estado,
      publica: sql<boolean>`${and(
        eq(propiedades.publicadaWeb, true),
        inArray(propiedades.estado, [...ESTADOS_PUBLICOS])
      )}`,
      foto: sql<string | null>`${propiedades.fotos} ->> 0`,
    })
    .from(propiedades)
    .where(eq(propiedades.id, id));

  if (!p) return new Response("No encontrada", { status: 404 });
  const privada = !p.publica;
  if (privada && !(await obtenerSesion())) {
    return new Response("No encontrada", { status: 404 });
  }

  const imagen = await generarFotoMarca(p, p.foto, formato, new URL(req.url).origin);
  const png = await imagen.arrayBuffer();

  const headers: Record<string, string> = {
    "Content-Type": "image/png",
    // Corto: si cambian el precio, la imagen tiene que salir nueva enseguida.
    "Cache-Control": privada ? "private, max-age=60" : "public, max-age=60, stale-while-revalidate=300",
  };
  if (new URL(req.url).searchParams.has("descargar")) {
    headers["Content-Disposition"] = `attachment; filename="orion-${p.codigo}-${formato}.png"`;
  }
  return new Response(png, { headers });
}
