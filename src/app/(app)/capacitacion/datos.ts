import { desc, eq, isNotNull, sql } from "drizzle-orm";
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

// La columna "tipo" (PDF / clase grabada) se agregó después. Si todavía no
// se corrió Admin → Migrar, la crea acá (una vez por servidor) para que
// Capacitación no se caiga. Primero solo consulta, así no bloquea la tabla.
let columnaTipo: Promise<void> | null = null;
export function asegurarColumnaTipo(): Promise<void> {
  columnaTipo ??= (async () => {
    const existe = await db.execute(sql`
      SELECT 1 FROM information_schema.columns
       WHERE table_name = 'documentos_capacitacion' AND column_name = 'tipo'
    `);
    if (existe.length === 0) {
      await db.execute(
        sql`ALTER TABLE documentos_capacitacion ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'PDF'`
      );
    }
  })().catch((e) => {
    columnaTipo = null; // reintenta en el próximo pedido
    throw e;
  });
  return columnaTipo;
}

/** Todo el material, sin traer el PDF en sí (pesa; se sirve aparte). */
export async function listarMaterial(): Promise<Material[]> {
  await asegurarColumnaTipo();
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
