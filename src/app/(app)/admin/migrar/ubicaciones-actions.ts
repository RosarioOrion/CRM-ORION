"use server";

import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { propiedades } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { esGuardable, ubicarPropiedad, type Precision } from "@/lib/geocodificar";

// Propiedades disponibles que quedaron sin ubicación en el mapa: se buscan
// con la misma búsqueda del formulario (calle, esquina, barrio) y se guarda
// la que sea de calle o esquina. Las que solo se ubican por barrio quedan
// para marcar a mano.

export type PropiedadSinUbicacion = {
  id: string;
  codigo: string;
  titulo: string;
  direccion: string | null;
  zona: string;
  departamento: string | null;
};

export type ResultadoUbicacion = { id: string; codigo: string; precision: Precision | null; guardada: boolean };

async function requerirAdmin() {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion.rol)) throw new Error("No autorizado.");
}

export async function listarSinUbicacion(): Promise<PropiedadSinUbicacion[]> {
  await requerirAdmin();
  return db
    .select({
      id: propiedades.id,
      codigo: propiedades.codigo,
      titulo: propiedades.titulo,
      direccion: propiedades.direccion,
      zona: propiedades.zona,
      departamento: propiedades.departamento,
    })
    .from(propiedades)
    .where(
      and(
        inArray(propiedades.estado, ["ACTIVA", "RESERVADA", "PAUSADA"]),
        or(isNull(propiedades.lat), isNull(propiedades.lng))
      )
    )
    .orderBy(propiedades.codigo);
}

/** Ubica una propiedad (de a una, para respetar el límite de 1 pedido por segundo de OpenStreetMap). */
export async function ubicarSinUbicacion(id: string): Promise<ResultadoUbicacion> {
  await requerirAdmin();
  const [p] = await db.select().from(propiedades).where(eq(propiedades.id, id));
  if (!p) throw new Error("Propiedad no encontrada.");
  const r = await ubicarPropiedad(p.direccion ?? "", p.zona, p.departamento ?? "", {
    "User-Agent": "OrionCRM/1.0 (ubicacion de propiedades)",
  });
  const guardada = !!r && esGuardable(r.precision);
  if (r && guardada) {
    await db.update(propiedades).set({ lat: r.punto[0], lng: r.punto[1] }).where(eq(propiedades.id, id));
    revalidatePath(`/propiedades/${id}`);
  }
  return { id, codigo: p.codigo, precision: r?.precision ?? null, guardada };
}
