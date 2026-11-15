import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documentosCapacitacion } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";
import { asegurarColumnaTipo } from "../../datos";
import { EditarDocumentoForm } from "./editar-form";

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
    })
    .from(documentosCapacitacion)
    .where(eq(documentosCapacitacion.id, id));
  if (!d) notFound();

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
        }}
      />
    </div>
  );
}
