import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { captaciones } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { NuevaTasacionForm, type TasacionInicial } from "../nueva-tasacion-form";

export default async function NuevaTasacionPage({
  searchParams,
}: {
  searchParams: Promise<{ captacion?: string }>;
}) {
  // Desde una captación en "Tasando": datos precargados y, al guardar, vuelve a Captaciones.
  const { captacion } = await searchParams;
  let inicial: TasacionInicial | undefined;
  if (captacion) {
    const sesion = await obtenerSesion();
    const [c] = sesion
      ? await db
          .select({ id: captaciones.id, tipo: captaciones.tipo, direccion: captaciones.direccion, zona: captaciones.zona, link: captaciones.link })
          .from(captaciones)
          .where(and(eq(captaciones.id, captacion), eq(captaciones.agenteId, sesion.userId)))
      : [];
    if (c) inicial = { captacionId: c.id, tipo: c.tipo, direccion: c.direccion, zona: c.zona, link: c.link };
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={inicial ? "/captaciones" : "/tasaciones"}
        className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold"
      >
        {inicial ? "← Volver a Captaciones" : "← Volver a Tasaciones"}
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-orion-navy dark:text-white">
        Nueva tasación
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Método Comparativo de Mercado.{inicial && " Al guardarla queda vinculada a la captación."}
      </p>
      <NuevaTasacionForm inicial={inicial} />
    </div>
  );
}
