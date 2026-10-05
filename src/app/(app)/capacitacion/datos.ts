import { desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { documentosCapacitacion, usuarios } from "@/db/schema";
import { esTipoMaterial, type TipoMaterial } from "@/lib/capacitacion";

export type Material = {
  id: string;
  tipo: TipoMaterial;
  titulo: string;
  descripcion: string | null;
  tieneArchivo: boolean;
  archivoPesoBytes: number | null;
  link: string | null;
  paginas: number | null;
  creadoEn: string;
  subidoPorNombre: string;
};

/** Todo el material, sin traer el PDF en sí (pesa; se sirve aparte). */
export async function listarMaterial(): Promise<Material[]> {
  const filas = await db
    .select({
      id: documentosCapacitacion.id,
      tipo: documentosCapacitacion.tipo,
      titulo: documentosCapacitacion.titulo,
      descripcion: documentosCapacitacion.descripcion,
      tieneArchivo: isNotNull(documentosCapacitacion.archivo),
      archivoPesoBytes: documentosCapacitacion.archivoPesoBytes,
      link: documentosCapacitacion.link,
      paginas: documentosCapacitacion.paginas,
      creadoEn: documentosCapacitacion.creadoEn,
      subidoPorNombre: usuarios.nombre,
    })
    .from(documentosCapacitacion)
    .innerJoin(usuarios, eq(documentosCapacitacion.subidoPorId, usuarios.id))
    .orderBy(desc(documentosCapacitacion.creadoEn));

  return filas.map((f) => ({
    ...f,
    tipo: esTipoMaterial(f.tipo) ? f.tipo : "PDF",
    tieneArchivo: Boolean(f.tieneArchivo),
    creadoEn: f.creadoEn.toISOString(),
  }));
}
