import { and, eq, inArray, lt, sql, getTableColumns, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  papelera,
  propiedades,
  contactos,
  portalesPublicados,
  historialPrecios,
  pipelineAcciones,
  visitas,
  busquedas,
  coincidenciasAvisadas,
  captaciones,
  reservasVenta,
  reservasAlquiler,
  actividades,
} from "@/db/schema";

// Papelera: lo que se elimina queda guardado 30 días y se puede restaurar.
//
// Al eliminar se guarda una "foto" del registro y de todo lo que depende de
// él (visitas, búsquedas, portales, pipeline...) y recién después se borra
// como antes. Restaurar vuelve a insertar esas filas y a vincular lo que se
// había desvinculado (reservas, actividades de la Agenda...).
// Así el resto de Orion no necesita saber que existe la papelera.

export const DIAS_PAPELERA = 30;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Filas = Record<string, unknown>[];

export type FotoContacto = {
  contacto: Record<string, unknown>;
  busquedas: Filas;
  coincidencias: Filas;
  visitas: Filas;
  captaciones: Filas;
  actividadesIds: string[];
};

export type FotoPropiedad = {
  propiedad: Record<string, unknown>;
  portales: Filas;
  historialPrecios: Filas;
  pipeline: Filas;
  coincidencias: Filas;
  visitas: Filas;
  reservasVentaIds: string[];
  reservasAlquilerIds: string[];
  captacionesIds: string[];
  actividadesIds: string[];
};

// La tabla se crea sola la primera vez (no hace falta tocar "Migración").
let tablaLista: Promise<unknown> | null = null;
export function asegurarTablaPapelera() {
  tablaLista ??= db
    .execute(
      sql`CREATE TABLE IF NOT EXISTS papelera (
        id text PRIMARY KEY,
        tipo text NOT NULL,
        titulo text NOT NULL,
        agente_id text NOT NULL,
        eliminado_por text,
        datos jsonb NOT NULL,
        eliminado_en timestamp NOT NULL DEFAULT now()
      )`
    )
    .catch((e) => {
      tablaLista = null;
      throw e;
    });
  return tablaLista;
}

/** Borra definitivamente lo que lleva más de 30 días en la papelera. */
export async function vaciarVencidos() {
  await asegurarTablaPapelera();
  const limite = new Date(Date.now() - DIAS_PAPELERA * 24 * 3600 * 1000);
  await db.delete(papelera).where(lt(papelera.eliminadoEn, limite));
}

// --- Guardar ---------------------------------------------------------------

async function filas(tx: Tx, tabla: PgTable, cond: SQL): Promise<Filas> {
  return (await tx.select().from(tabla).where(cond)) as Filas;
}

async function ids(tx: Tx, tabla: PgTable & { id: unknown }, cond: SQL): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = await tx.select({ id: (tabla as any).id }).from(tabla).where(cond);
  return r.map((x) => x.id as string);
}

export async function guardarContactoEnPapelera(tx: Tx, contactoId: string, eliminadoPor: string) {
  const [contacto] = await tx.select().from(contactos).where(eq(contactos.id, contactoId));
  if (!contacto) return;
  const bs = await filas(tx, busquedas, eq(busquedas.contactoId, contactoId));
  const foto: FotoContacto = {
    contacto,
    busquedas: bs,
    coincidencias: bs.length
      ? await filas(
          tx,
          coincidenciasAvisadas,
          inArray(
            coincidenciasAvisadas.busquedaId,
            bs.map((b) => b.id as string)
          )
        )
      : [],
    visitas: await filas(tx, visitas, eq(visitas.contactoId, contactoId)),
    captaciones: await filas(tx, captaciones, eq(captaciones.contactoId, contactoId)),
    actividadesIds: await ids(tx, actividades, eq(actividades.contactoId, contactoId)).catch(() => []),
  };
  await tx.insert(papelera).values({
    id: contactoId,
    tipo: "CONTACTO",
    titulo: contacto.nombre,
    agenteId: contacto.agenteId,
    eliminadoPor,
    datos: foto,
  }).onConflictDoUpdate({ target: papelera.id, set: { datos: foto, eliminadoEn: new Date() } });
}

export async function guardarPropiedadEnPapelera(tx: Tx, propiedadId: string, eliminadoPor: string) {
  const [propiedad] = await tx.select().from(propiedades).where(eq(propiedades.id, propiedadId));
  if (!propiedad) return;
  const foto: FotoPropiedad = {
    propiedad,
    portales: await filas(tx, portalesPublicados, eq(portalesPublicados.propiedadId, propiedadId)),
    historialPrecios: await filas(tx, historialPrecios, eq(historialPrecios.propiedadId, propiedadId)),
    pipeline: await filas(tx, pipelineAcciones, eq(pipelineAcciones.propiedadId, propiedadId)),
    coincidencias: await filas(tx, coincidenciasAvisadas, eq(coincidenciasAvisadas.propiedadId, propiedadId)),
    visitas: await filas(tx, visitas, eq(visitas.propiedadId, propiedadId)),
    reservasVentaIds: await ids(tx, reservasVenta, eq(reservasVenta.propiedadId, propiedadId)),
    reservasAlquilerIds: await ids(tx, reservasAlquiler, eq(reservasAlquiler.propiedadId, propiedadId)),
    captacionesIds: await ids(tx, captaciones, eq(captaciones.convertidaEnPropiedadId, propiedadId)),
    actividadesIds: await ids(tx, actividades, eq(actividades.propiedadId, propiedadId)).catch(() => []),
  };
  await tx.insert(papelera).values({
    id: propiedadId,
    tipo: "PROPIEDAD",
    titulo: `${propiedad.codigo} — ${propiedad.titulo}`,
    agenteId: propiedad.agenteId,
    eliminadoPor,
    datos: foto,
  }).onConflictDoUpdate({ target: papelera.id, set: { datos: foto, eliminadoEn: new Date() } });
}

// --- Restaurar -------------------------------------------------------------

/** Las fechas vuelven del JSON como texto: se convierten de nuevo a Date. */
function revivir(tabla: PgTable, fila: Record<string, unknown>) {
  const cols = getTableColumns(tabla);
  const out: Record<string, unknown> = { ...fila };
  for (const [k, col] of Object.entries(cols)) {
    const v = out[k];
    if (col.dataType === "date" && typeof v === "string") out[k] = new Date(v);
  }
  return out;
}

/**
 * Inserta filas dependientes una por una. Si alguna ya no se puede
 * restaurar (por ejemplo, una visita cuyo contacto se eliminó después),
 * se saltea y se cuenta, sin frenar el resto.
 */
async function insertarVarias(tx: Tx, tabla: PgTable, lista: Filas): Promise<number> {
  let salteadas = 0;
  for (const f of lista) {
    try {
      await tx.transaction(async (sp) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await sp.insert(tabla).values(revivir(tabla, f) as any).onConflictDoNothing();
      });
    } catch {
      salteadas++;
    }
  }
  return salteadas;
}

export async function restaurarDePapelera(
  id: string
): Promise<{ ok: boolean; error?: string; salteadas?: number; tipo?: string }> {
  await asegurarTablaPapelera();
  const [item] = await db.select().from(papelera).where(eq(papelera.id, id));
  if (!item) return { ok: false, error: "Ya no está en la papelera." };

  try {
    let salteadas = 0;
    await db.transaction(async (tx) => {
      if (item.tipo === "CONTACTO") {
        const f = item.datos as FotoContacto;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await tx.insert(contactos).values(revivir(contactos, f.contacto) as any);
        salteadas += await insertarVarias(tx, busquedas, f.busquedas);
        salteadas += await insertarVarias(tx, coincidenciasAvisadas, f.coincidencias);
        salteadas += await insertarVarias(tx, visitas, f.visitas);
        salteadas += await insertarVarias(tx, captaciones, f.captaciones);
        if (f.actividadesIds.length)
          await tx
            .update(actividades)
            .set({ contactoId: id })
            .where(inArray(actividades.id, f.actividadesIds));
      } else {
        const f = item.datos as FotoPropiedad;
        const codigo = f.propiedad.codigo as string;
        const [ocupado] = await tx
          .select({ id: propiedades.id })
          .from(propiedades)
          .where(eq(propiedades.codigo, codigo));
        if (ocupado) throw new Error(`Ya existe otra propiedad con el código ${codigo}.`);
        const duenoId = f.propiedad.duenoId as string | null;
        const prop = { ...f.propiedad };
        if (duenoId) {
          const [d] = await tx.select({ id: contactos.id }).from(contactos).where(eq(contactos.id, duenoId));
          if (!d) prop.duenoId = null;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await tx.insert(propiedades).values(revivir(propiedades, prop) as any);
        salteadas += await insertarVarias(tx, portalesPublicados, f.portales);
        salteadas += await insertarVarias(tx, historialPrecios, f.historialPrecios);
        salteadas += await insertarVarias(tx, pipelineAcciones, f.pipeline);
        salteadas += await insertarVarias(tx, visitas, f.visitas);
        salteadas += await insertarVarias(tx, coincidenciasAvisadas, f.coincidencias);
        const relinks: [PgTable, string[], Record<string, string>][] = [
          [reservasVenta, f.reservasVentaIds, { propiedadId: id }],
          [reservasAlquiler, f.reservasAlquilerIds, { propiedadId: id }],
          [captaciones, f.captacionesIds, { convertidaEnPropiedadId: id }],
          [actividades, f.actividadesIds, { propiedadId: id }],
        ];
        for (const [tabla, lista, set] of relinks) {
          if (!lista.length) continue;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const t = tabla as any;
          await tx.update(tabla).set(set).where(inArray(t.id, lista));
        }
      }
      await tx.delete(papelera).where(eq(papelera.id, id));
    });
    return { ok: true, salteadas, tipo: item.tipo };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function eliminarDefinitivo(id: string) {
  await asegurarTablaPapelera();
  await db.delete(papelera).where(eq(papelera.id, id));
}

export async function listarPapelera(agenteIds: string[] | "todos") {
  await asegurarTablaPapelera();
  await vaciarVencidos();
  const q = db
    .select({
      id: papelera.id,
      tipo: papelera.tipo,
      titulo: papelera.titulo,
      agenteId: papelera.agenteId,
      eliminadoEn: papelera.eliminadoEn,
    })
    .from(papelera);
  const filasP =
    agenteIds === "todos"
      ? await q.orderBy(sql`${papelera.eliminadoEn} desc`)
      : await q
          .where(and(inArray(papelera.agenteId, agenteIds.length ? agenteIds : ["-"])))
          .orderBy(sql`${papelera.eliminadoEn} desc`);
  return filasP;
}
