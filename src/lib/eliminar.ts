import { eq, inArray, count, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
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

// Borrado definitivo de propiedades y contactos (por ejemplo, datos de
// prueba). Antes de borrar se cuenta todo lo que depende del registro para
// mostrarlo en la confirmación.
//
// Propiedad:
//   se borra junto con ella → portales, historial de precios, pipeline,
//     visitas y coincidencias avisadas de esa propiedad.
//   se desvincula (queda, sin la propiedad) → actividades de la Agenda,
//     reservas (conservan el nombre en texto) y captaciones convertidas.
// Contacto:
//   no se puede si es dueño de alguna propiedad (hay que borrar o
//     reasignar esa propiedad primero).
//   se borra junto con él → visitas, búsquedas (y sus coincidencias) y
//     captaciones de ese contacto.
//   se desvincula → actividades de la Agenda.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function contar(tabla: any, cond: SQL) {
  const [fila] = await db.select({ n: count() }).from(tabla).where(cond);
  return Number(fila?.n ?? 0);
}

export async function dependenciasPropiedad(propiedadId: string) {
  let actividadesN = 0;
  try {
    actividadesN = await contar(actividades, eq(actividades.propiedadId, propiedadId));
  } catch {
    // tabla aún no migrada
  }
  return {
    visitas: await contar(visitas, eq(visitas.propiedadId, propiedadId)),
    portales: await contar(portalesPublicados, eq(portalesPublicados.propiedadId, propiedadId)),
    pipeline: await contar(pipelineAcciones, eq(pipelineAcciones.propiedadId, propiedadId)),
    coincidencias: await contar(coincidenciasAvisadas, eq(coincidenciasAvisadas.propiedadId, propiedadId)),
    reservas:
      (await contar(reservasVenta, eq(reservasVenta.propiedadId, propiedadId))) +
      (await contar(reservasAlquiler, eq(reservasAlquiler.propiedadId, propiedadId))),
    actividades: actividadesN,
  };
}

export async function borrarPropiedad(propiedadId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(portalesPublicados).where(eq(portalesPublicados.propiedadId, propiedadId));
    await tx.delete(historialPrecios).where(eq(historialPrecios.propiedadId, propiedadId));
    await tx.delete(pipelineAcciones).where(eq(pipelineAcciones.propiedadId, propiedadId));
    await tx.delete(coincidenciasAvisadas).where(eq(coincidenciasAvisadas.propiedadId, propiedadId));
    await tx.delete(visitas).where(eq(visitas.propiedadId, propiedadId));
    await tx
      .update(reservasVenta)
      .set({ propiedadId: null })
      .where(eq(reservasVenta.propiedadId, propiedadId));
    await tx
      .update(reservasAlquiler)
      .set({ propiedadId: null })
      .where(eq(reservasAlquiler.propiedadId, propiedadId));
    await tx
      .update(captaciones)
      .set({ convertidaEnPropiedadId: null })
      .where(eq(captaciones.convertidaEnPropiedadId, propiedadId));
    await tx
      .update(actividades)
      .set({ propiedadId: null })
      .where(eq(actividades.propiedadId, propiedadId));
    await tx.delete(propiedades).where(eq(propiedades.id, propiedadId));
  });
}

export async function dependenciasContacto(contactoId: string) {
  const propias = await db
    .select({ codigo: propiedades.codigo })
    .from(propiedades)
    .where(eq(propiedades.duenoId, contactoId));
  let actividadesN = 0;
  try {
    actividadesN = await contar(actividades, eq(actividades.contactoId, contactoId));
  } catch {
    // tabla aún no migrada
  }
  return {
    propiedadesComoDueno: propias.map((p) => p.codigo),
    visitas: await contar(visitas, eq(visitas.contactoId, contactoId)),
    busquedas: await contar(busquedas, eq(busquedas.contactoId, contactoId)),
    captaciones: await contar(captaciones, eq(captaciones.contactoId, contactoId)),
    actividades: actividadesN,
  };
}

export async function borrarContacto(contactoId: string) {
  await db.transaction(async (tx) => {
    const bs = await tx
      .select({ id: busquedas.id })
      .from(busquedas)
      .where(eq(busquedas.contactoId, contactoId));
    if (bs.length > 0) {
      await tx.delete(coincidenciasAvisadas).where(
        inArray(
          coincidenciasAvisadas.busquedaId,
          bs.map((b) => b.id)
        )
      );
      await tx.delete(busquedas).where(eq(busquedas.contactoId, contactoId));
    }
    await tx.delete(visitas).where(eq(visitas.contactoId, contactoId));
    await tx.delete(captaciones).where(eq(captaciones.contactoId, contactoId));
    await tx
      .update(actividades)
      .set({ contactoId: null })
      .where(eq(actividades.contactoId, contactoId));
    await tx.delete(contactos).where(eq(contactos.id, contactoId));
  });
}
