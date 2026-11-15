import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tasaciones } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";
import type { ComparablePro, ZonaTipo } from "@/lib/tasacion-pro";
import { NuevaTasacionForm, type TasacionExistente } from "../../nueva-tasacion-form";

// Editar una tasación guardada: mismo formulario, con todo precargado
// (cambiar comparables, sumar nuevos, corregir datos). Las tasaciones viejas
// pasan al método nuevo al guardarse.
export default async function EditarTasacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await obtenerSesion();
  if (!sesion) notFound();
  const [t] = await db.select().from(tasaciones).where(eq(tasaciones.id, id));
  if (!t) notFound();
  if (t.agenteId !== sesion.userId && !esCEO(sesion.rol)) notFound();

  const suj = (t.detalle?.sujeto ?? {}) as Record<string, number | boolean | undefined>;
  const n = (v: unknown) => (typeof v === "number" ? v : undefined);
  const existente: TasacionExistente = {
    id: t.id,
    tipo: t.tipo,
    departamento: t.detalle?.departamento ?? "",
    zona: t.zona ?? "",
    direccion: t.direccion ?? "",
    link: t.link ?? "",
    zonaTipo: (t.detalle?.zonaTipo === "BALNEARIA" ? "BALNEARIA" : "URBANA") as ZonaTipo,
    m2: t.m2,
    m2Semi: n(suj.m2Semi),
    m2Desc: n(suj.m2Desc),
    m2Terreno: n(suj.m2Terreno),
    garajes: n(suj.garajes),
    piscina: !!suj.piscina,
    esquina: !!suj.esquina,
    coneat: n(suj.coneat),
    luz: n(suj.luz),
    ficha: t.detalle?.ficha ?? null,
    estado: t.estado,
    ubicacion: t.ubicacion,
    comparables: t.comparables as ComparablePro[],
    ajusteManual: t.ajusteManual,
    notas: t.notas ?? "",
    renta: t.detalle?.renta ?? null,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/tasaciones/${t.id}`} className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold">
        ← Volver a la tasación
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-orion-navy dark:text-white">Editar tasación</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Cambiá comparables, sumá nuevos o corregí datos: el resultado se recalcula al instante.
        {!t.detalle && " Al guardar, pasa al método nuevo (revisá el tipo y las medidas)."}
      </p>
      <NuevaTasacionForm existente={existente} />
    </div>
  );
}
