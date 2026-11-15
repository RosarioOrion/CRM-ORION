import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  busquedas,
  captaciones,
  contactos,
  propiedades,
  registroActividad,
  reservasAlquiler,
  reservasVenta,
  tasaciones,
} from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";

// Registro de actividad: cada acción importante deja una línea con quién la
// hizo, qué hizo y sobre qué (contacto, propiedad, etc.). El nombre de lo
// que se tocó se guarda en el momento, así se sigue leyendo aunque después
// se elimine. Nunca corta la acción: si falla, solo se avisa en el log.

export type Entidad =
  | "contacto"
  | "propiedad"
  | "captacion"
  | "busqueda"
  | "tasacion"
  | "reserva_venta"
  | "reserva_alquiler"
  | "comision";

export const ENLACE_ENTIDAD: Partial<Record<Entidad, (id: string) => string>> = {
  contacto: (id) => `/contactos/${id}`,
  propiedad: (id) => `/propiedades/${id}`,
  captacion: () => `/captaciones`,
  busqueda: () => `/busquedas`,
  tasacion: (id) => `/tasaciones/${id}`,
  reserva_venta: () => `/reservas/ventas`,
  reserva_alquiler: () => `/reservas/alquileres`,
  comision: () => `/comisiones`,
};

async function nombreDe(entidad: Entidad, id: string): Promise<string | null> {
  switch (entidad) {
    case "contacto": {
      const [r] = await db.select({ n: contactos.nombre }).from(contactos).where(eq(contactos.id, id));
      return r?.n ?? null;
    }
    case "propiedad": {
      const [r] = await db.select({ n: propiedades.titulo }).from(propiedades).where(eq(propiedades.id, id));
      return r?.n ?? null;
    }
    case "captacion": {
      const [r] = await db.select({ n: captaciones.titulo }).from(captaciones).where(eq(captaciones.id, id));
      return r?.n ?? null;
    }
    case "busqueda": {
      const [r] = await db
        .select({ t: busquedas.tipo, z: busquedas.zona, c: contactos.nombre })
        .from(busquedas)
        .leftJoin(contactos, eq(busquedas.contactoId, contactos.id))
        .where(eq(busquedas.id, id));
      return r ? [r.c, [r.t, r.z].filter(Boolean).join(" en ")].filter(Boolean).join(" · ") : null;
    }
    case "tasacion": {
      const [r] = await db
        .select({ t: tasaciones.tipo, d: tasaciones.direccion, z: tasaciones.zona })
        .from(tasaciones)
        .where(eq(tasaciones.id, id));
      return r ? [r.t, r.d ?? r.z].filter(Boolean).join(" · ") : null;
    }
    case "reserva_venta": {
      const [r] = await db
        .select({ n: reservasVenta.nombrePropiedad })
        .from(reservasVenta)
        .where(eq(reservasVenta.id, id));
      return r?.n ?? null;
    }
    case "reserva_alquiler": {
      const [r] = await db
        .select({ n: reservasAlquiler.nombrePropiedad })
        .from(reservasAlquiler)
        .where(eq(reservasAlquiler.id, id));
      return r?.n ?? null;
    }
    default:
      return null;
  }
}

/**
 * Anota una acción del usuario de la sesión. `detalle` es texto libre
 * (ej. "Estado: Reservada"); si hay entidad e id, se le antepone su nombre.
 */
export async function registrar(
  accion: string,
  opciones: { entidad?: Entidad; id?: string | null; detalle?: string | null; usuarioId?: string } = {}
): Promise<void> {
  try {
    const sesion = opciones.usuarioId ? null : await obtenerSesion();
    const usuarioId = opciones.usuarioId ?? sesion?.userId;
    if (!usuarioId) return;
    const { entidad, id } = opciones;
    const nombre = entidad && id ? await nombreDe(entidad, id) : null;
    const detalle = [nombre, opciones.detalle?.trim()].filter(Boolean).join(" · ") || null;
    await db.insert(registroActividad).values({
      usuarioId,
      suplantadoPor: sesion?.suplantadoPor ?? null,
      accion,
      entidad: entidad ?? null,
      entidadId: id ?? null,
      detalle,
    });
  } catch (e) {
    console.error("[registro-actividad]", e instanceof Error ? e.message : e);
  }
}
