import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documentosCapacitacion } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";
import { asegurarColumnaTipo, listarAreas } from "../../datos";
import type { Clase } from "@/lib/manual-indice";
import { EditarDocumentoForm } from "./editar-form";
import { AudiosCapitulo } from "./audios";
import { listarAudios } from "@/lib/capacitacion-audio";

// Editar un material de Capacitación (solo la CEO, igual que subir).
export default async function EditarMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion || !esCEO(sesion.rol)) redirect("/capacitacion");
  const { id } = await params;
  await asegurarColumnaTipo();
  const [d] = await db
    .select({
      tipo: documentosCapacitacion.tipo,
      titulo: documentosCapacitacion.titulo,
      descripcion: documentosCapacitacion.descripcion,
      link: documentosCapacitacion.link,
      paginas: documentosCapacitacion.paginas,
      archivoNombre: documentosCapacitacion.archivoNombre,
      clase: documentosCapacitacion.clase,
      numero: documentosCapacitacion.numero,
      bloque: documentosCapacitacion.bloque,
      areas: documentosCapacitacion.areas,
    })
    .from(documentosCapacitacion)
    .where(eq(documentosCapacitacion.id, id));
  if (!d) notFound();
  const [areas, audios] = await Promise.all([listarAreas(), listarAudios(id)]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/capacitacion/subir" className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold">
        ← Volver a Subir material
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-orion-navy dark:text-white">Editar material</h1>
      <EditarDocumentoForm
        d={{
          id,
          tipo: d.tipo === "VIDEO" ? "VIDEO" : "PDF",
          titulo: d.titulo,
          descripcion: d.descripcion ?? "",
          link: d.link ?? "",
          paginas: d.paginas,
          archivoNombre: d.archivoNombre,
          indice: {
            clase: (d.clase === "CAPITULO" || d.clase === "ANEXO" ? d.clase : "OTRO") as Clase,
            numero: d.numero,
            bloque: d.bloque,
            areas: d.areas ?? [],
          },
        }}
        areas={areas}
      />
      <AudiosCapitulo documentoId={id} audios={audios} />
    </div>
  );
}
