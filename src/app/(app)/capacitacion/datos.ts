import { asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { capacitacionAreas, documentosCapacitacion, usuarios } from "@/db/schema";
import { esTipoMaterial, type TipoMaterial } from "@/lib/capacitacion";
import { materialesConAudio } from "@/lib/capacitacion-audio";

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
  clase: string | null;
  numero: string | null;
  orden: number | null;
  bloque: string | null;
  areas: string[];
  /** Tiene audio grabado (🎙️). */
  tieneAudio: boolean;
};

export type Area = { clave: string; nombre: string; icono: string; orden: number };

/** Áreas por tema, en su orden. */
export async function listarAreas(): Promise<Area[]> {
  try {
    return await db
      .select({ clave: capacitacionAreas.clave, nombre: capacitacionAreas.nombre, icono: capacitacionAreas.icono, orden: capacitacionAreas.orden })
      .from(capacitacionAreas)
      .orderBy(asc(capacitacionAreas.orden), asc(capacitacionAreas.nombre));
  } catch {
    return []; // tabla todavía no creada
  }
}

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
      clase: documentosCapacitacion.clase,
      numero: documentosCapacitacion.numero,
      orden: documentosCapacitacion.orden,
      bloque: documentosCapacitacion.bloque,
      areas: documentosCapacitacion.areas,
    })
    .from(documentosCapacitacion)
    .innerJoin(usuarios, eq(documentosCapacitacion.subidoPorId, usuarios.id))
    // Capítulos 0–57, después anexos A–J, después el resto (lo más nuevo primero).
    .orderBy(sql`coalesce(${documentosCapacitacion.orden}, 5000)`, desc(documentosCapacitacion.creadoEn));

  const conAudio = await materialesConAudio();
  return filas.map((f) => ({
    tieneAudio: conAudio.has(f.id),
    ...f,
    tipo: esTipoMaterial(f.tipo) ? f.tipo : "PDF",
    tieneArchivo: Boolean(f.tieneArchivo),
    areas: f.areas ?? [],
    creadoEn: f.creadoEn.toISOString(),
  }));
}
