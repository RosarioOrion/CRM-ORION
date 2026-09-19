import { db } from "@/db";
import { documentosCapacitacion, usuarios } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { NuevoDocumentoForm } from "./nuevo-documento-form";
import { BuscadorDocumentos } from "./buscador-documentos";

export default async function CapacitacionPage() {
  const sesion = await obtenerSesion();
  if (!sesion) return null;
  const admin = esAdmin(sesion.rol);

  const filas = await db
    .select({
      id: documentosCapacitacion.id,
      titulo: documentosCapacitacion.titulo,
      descripcion: documentosCapacitacion.descripcion,
      archivo: documentosCapacitacion.archivo,
      archivoNombre: documentosCapacitacion.archivoNombre,
      archivoPesoBytes: documentosCapacitacion.archivoPesoBytes,
      link: documentosCapacitacion.link,
      paginas: documentosCapacitacion.paginas,
      creadoEn: documentosCapacitacion.creadoEn,
      subidoPorNombre: usuarios.nombre,
    })
    .from(documentosCapacitacion)
    .innerJoin(usuarios, eq(documentosCapacitacion.subidoPorId, usuarios.id))
    .orderBy(desc(documentosCapacitacion.creadoEn));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-orion-navy dark:text-white">
        Capacitación
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Biblioteca de documentos de entrenamiento del equipo.
      </p>

      {admin && (
        <div className="mb-6">
          <NuevoDocumentoForm />
        </div>
      )}

      <BuscadorDocumentos
        admin={admin}
        documentos={filas.map((f) => ({
          id: f.id,
          titulo: f.titulo,
          descripcion: f.descripcion,
          archivo: f.archivo,
          archivoNombre: f.archivoNombre,
          archivoPesoBytes: f.archivoPesoBytes,
          link: f.link,
          paginas: f.paginas,
          creadoEn: f.creadoEn.toISOString(),
          subidoPorNombre: f.subidoPorNombre,
        }))}
      />
    </div>
  );
}
