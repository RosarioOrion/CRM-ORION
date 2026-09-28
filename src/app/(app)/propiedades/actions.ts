"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { count, eq, sql, and } from "drizzle-orm";
import { db } from "@/db";
import { propiedades, portalesPublicados, historialPrecios } from "@/db/schema";
import { reemplazarPrecio } from "@/lib/precio-texto";
import { obtenerSesion } from "@/lib/auth";
import { dependenciasPropiedad, borrarPropiedad } from "@/lib/eliminar";
import { ESTADOS_PROPIEDAD } from "@/lib/propiedades";

const PropiedadSchema = z.object({
      titulo: z.string().min(3, "Ingresa un titulo"),
      operacion: z.enum(["VENTA", "ALQUILER"]),
      tipo: z.string().min(2, "Elegi el tipo de propiedad"),
      zona: z.string().min(2, "Ingresa la zona"),
      direccion: z.string().optional(),
      departamento: z.string().optional(),
      precio: z.coerce.number().optional(),
      moneda: z.enum(["USD", "UYU"]).default("USD"),
      m2Cubiertos: z.coerce.number().optional(),
      m2Privados: z.coerce.number().optional(),
      m2Terreno: z.coerce.number().optional(),
      hectareas: z.coerce.number().optional(),
      dormitorios: z.coerce.number().optional(),
      banos: z.coerce.number().optional(),
      ambientes: z.coerce.number().optional(),
      cocheras: z.coerce.number().optional(),
      bodegas: z.coerce.number().optional(),
      antiguedad: z.coerce.number().optional(),
      numeroPiso: z.coerce.number().optional(),
      cantidadPisos: z.coerce.number().optional(),
      orientacion: z.string().optional(),
      disposicion: z.string().optional(),
      subtipo: z.string().optional(),
      gastosComunes: z.coerce.number().optional(),
      mascotas: z.coerce.boolean().optional(),
      acceso: z.string().optional(),
      distanciaAsfalto: z.coerce.number().optional(),
      formaTerreno: z.string().optional(),
      estadoEdilicio: z.string().optional(),
      extras: z.array(z.string()).optional(),
      descripcion: z.string().optional(),
      duenoId: z.string().min(1, "Elegi el contacto dueno"),
});

export type PropiedadState = { error?: string; ok?: number };

async function generarCodigo() {
      const [{ total }] = await db.select({ total: count() }).from(propiedades);
      const siguiente = total + 1;
      return `OR${String(siguiente).padStart(3, "0")}`;
}

function leerFormularioPropiedad(formData: FormData) {
  return PropiedadSchema.safeParse({
          titulo: formData.get("titulo"),
          operacion: formData.get("operacion"),
          tipo: formData.get("tipo"),
          zona: formData.get("zona"),
          direccion: formData.get("direccion") || undefined,
          departamento: formData.get("departamento") || undefined,
          precio: formData.get("precio") || undefined,
          moneda: formData.get("moneda") || "USD",
          m2Cubiertos: formData.get("m2Cubiertos") || undefined,
          m2Privados: formData.get("m2Privados") || undefined,
          m2Terreno: formData.get("m2Terreno") || undefined,
          hectareas: formData.get("hectareas") || undefined,
          dormitorios: formData.get("dormitorios") || undefined,
          banos: formData.get("banos") || undefined,
          ambientes: formData.get("ambientes") || undefined,
          cocheras: formData.get("cocheras") || undefined,
          bodegas: formData.get("bodegas") || undefined,
          antiguedad: formData.get("antiguedad") || undefined,
          numeroPiso: formData.get("numeroPiso") || undefined,
          cantidadPisos: formData.get("cantidadPisos") || undefined,
          orientacion: formData.get("orientacion") || undefined,
          disposicion: formData.get("disposicion") || undefined,
          subtipo: formData.get("subtipo") || undefined,
          gastosComunes: formData.get("gastosComunes") || undefined,
          mascotas: formData.get("mascotas") ? true : false,
          acceso: formData.get("acceso") || undefined,
          distanciaAsfalto: formData.get("distanciaAsfalto") || undefined,
          formaTerreno: formData.get("formaTerreno") || undefined,
          estadoEdilicio: formData.get("estadoEdilicio") || undefined,
          extras: formData.getAll("extras"),
          descripcion: formData.get("descripcion") || undefined,
          duenoId: formData.get("duenoId"),
  });
}

export async function crearPropiedad(
      _prevState: PropiedadState,
      formData: FormData
    ): Promise<PropiedadState> {
      const sesion = await obtenerSesion();
      if (!sesion) return { error: "Sesion expirada, volve a ingresar." };

  const parsed = leerFormularioPropiedad(formData);

  if (!parsed.success) {
          return { error: parsed.error.issues[0]?.message ?? "Datos invalidos" };
  }

  const codigo = await generarCodigo();

  await db.insert(propiedades).values({
          codigo,
          titulo: parsed.data.titulo,
          operacion: parsed.data.operacion,
          tipo: parsed.data.tipo,
          zona: parsed.data.zona,
          direccion: parsed.data.direccion ?? null,
          departamento: parsed.data.departamento ?? null,
          precio: parsed.data.precio ?? null,
          moneda: parsed.data.moneda,
          m2Cubiertos: parsed.data.m2Cubiertos ?? null,
          m2Privados: parsed.data.m2Privados ?? null,
          m2Terreno: parsed.data.m2Terreno ?? null,
          hectareas: parsed.data.hectareas ?? null,
          dormitorios: parsed.data.dormitorios ?? null,
          banos: parsed.data.banos ?? null,
          ambientes: parsed.data.ambientes ?? null,
          cocheras: parsed.data.cocheras ?? null,
          bodegas: parsed.data.bodegas ?? null,
          antiguedad: parsed.data.antiguedad ?? null,
          numeroPiso: parsed.data.numeroPiso ?? null,
          cantidadPisos: parsed.data.cantidadPisos ?? null,
          orientacion: parsed.data.orientacion ?? null,
          disposicion: parsed.data.disposicion ?? null,
          subtipo: parsed.data.subtipo ?? null,
          gastosComunes: parsed.data.gastosComunes ?? null,
          mascotas: parsed.data.mascotas ?? false,
          acceso: parsed.data.acceso ?? null,
          distanciaAsfalto: parsed.data.distanciaAsfalto ?? null,
          formaTerreno: parsed.data.formaTerreno ?? null,
          estadoEdilicio: parsed.data.estadoEdilicio ?? null,
          extras: parsed.data.extras ?? [],
          descripcion: parsed.data.descripcion ?? null,
          duenoId: parsed.data.duenoId,
          agenteId: sesion.userId,
  });

  revalidatePath("/propiedades");
      return { ok: Date.now() };
}

const FOTO_MAX_BYTES = 10 * 1024 * 1024;

export type FotosState = { error?: string; ok?: number };

export async function agregarFotos(
      propiedadId: string,
      _prevState: FotosState,
      formData: FormData
    ): Promise<FotosState> {
      try {
        await requerirPropiedadDelAgente(propiedadId);
      } catch (e) {
        return { error: e instanceof Error ? e.message : "No autorizado." };
      }

      const archivos = formData
        .getAll("fotos")
        .filter((f): f is File => f instanceof File && f.size > 0);

      if (archivos.length === 0) {
        return { error: "Elegi al menos una foto." };
      }

      const nuevasFotos: string[] = [];
      for (const archivo of archivos) {
        if (!archivo.type.startsWith("image/")) {
          return { error: `${archivo.name} no es una imagen valida.` };
        }
        if (archivo.size > FOTO_MAX_BYTES) {
          return { error: `${archivo.name} pesa mas de 10MB.` };
        }
        const buffer = Buffer.from(await archivo.arrayBuffer());
        nuevasFotos.push(`data:${archivo.type};base64,${buffer.toString("base64")}`);
      }

      // Concatenamos con una sola sentencia UPDATE atomica (fotos = fotos || nuevas)
      // en vez de leer y despues escribir en dos pasos separados. Con subidas por
      // lotes, dos pedidos pueden llegar a superponerse (uno lento de un intento
      // anterior que sigue en el servidor mientras otro ya termino) y un
      // "leer -> modificar -> guardar" en dos pasos hace que el que termina
      // despues pise y borre lo que guardo el otro. La concatenacion atomica en
      // la base de datos evita ese problema sin importar el orden de llegada.
      const actualizadas = await db
        .update(propiedades)
        .set({
          fotos: sql`${propiedades.fotos} || ${JSON.stringify(nuevasFotos)}::jsonb`,
        })
        .where(eq(propiedades.id, propiedadId))
        .returning({ id: propiedades.id });

      if (actualizadas.length === 0) return { error: "Propiedad no encontrada." };

      revalidatePath(`/propiedades/${propiedadId}`);
      revalidatePath("/propiedades");
      return { ok: Date.now() };
}

export async function eliminarFoto(propiedadId: string, fotoUrl: string) {
      // Solo el agente a cargo puede tocar las fotos de su propiedad.
      try {
        await requerirPropiedadDelAgente(propiedadId);
      } catch {
        return;
      }

      // Misma logica que agregarFotos: se filtra el elemento dentro de la
      // propia sentencia UPDATE (atomica), sin un select previo que pueda
      // quedar desactualizado si hay otro pedido de fotos en simultaneo.
      await db
        .update(propiedades)
        .set({
          fotos: sql`(
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
            FROM jsonb_array_elements_text(${propiedades.fotos}) AS elem
            WHERE elem <> ${fotoUrl}
          )`,
        })
        .where(eq(propiedades.id, propiedadId));

      revalidatePath(`/propiedades/${propiedadId}`);
      revalidatePath("/propiedades");
}

/**
 * Organizar fotos: nuevo orden y fotos a borrar, en un solo guardado.
 * `orden` son las posiciones actuales de las fotos que quedan, en el orden
 * nuevo (la primera es la portada). `total` es cuántas fotos había cuando se
 * abrió el organizador: si cambió en el medio (otra pestaña subió o borró),
 * se pide recargar para no mezclar fotos.
 */
export async function guardarOrdenFotos(
      propiedadId: string,
      orden: number[],
      total: number
): Promise<{ ok: boolean; error?: string }> {
      try {
        await requerirPropiedadDelAgente(propiedadId);
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "No autorizado." };
      }
      const [prop] = await db
        .select({ fotos: propiedades.fotos })
        .from(propiedades)
        .where(eq(propiedades.id, propiedadId));
      if (!prop) return { ok: false, error: "Propiedad no encontrada." };
      if (prop.fotos.length !== total) {
        return { ok: false, error: "Las fotos cambiaron mientras las organizabas. Recargá la página y volvé a intentar." };
      }
      const validos = orden.every((i) => Number.isInteger(i) && i >= 0 && i < total);
      if (!validos || new Set(orden).size !== orden.length) {
        return { ok: false, error: "Orden inválido." };
      }
      await db
        .update(propiedades)
        .set({ fotos: orden.map((i) => prop.fotos[i]) })
        .where(eq(propiedades.id, propiedadId));
      revalidatePath(`/propiedades/${propiedadId}`);
      revalidatePath("/propiedades");
      revalidatePath("/inmuebles");
      revalidatePath("/");
      return { ok: true };
}

export async function actualizarEstado(propiedadId: string, estado: string) {
      // Solo el agente a cargo puede cambiar el estado de su propiedad.
      try {
        await requerirPropiedadDelAgente(propiedadId);
      } catch {
        return;
      }

      if (!ESTADOS_PROPIEDAD.includes(estado as (typeof ESTADOS_PROPIEDAD)[number])) {
        return;
      }

      await db
        .update(propiedades)
        .set({ estado: estado as (typeof ESTADOS_PROPIEDAD)[number] })
        .where(eq(propiedades.id, propiedadId));

      revalidatePath(`/propiedades/${propiedadId}`);
      revalidatePath("/propiedades");
}

const PortalSchema = z.object({
      portal: z.string().min(2, "Elegi el portal"),
      url: z.string().url("Ingresa un link valido (con https://)"),
});

export type PortalState = { error?: string; ok?: number };

// Cualquier usuario puede VER las propiedades de otros agentes (solo lectura),
// pero solo el agente a cargo puede modificarlas. Esto aplica a todos los
// roles, incluidos Team Leader y Administrador.
async function requerirPropiedadDelAgente(propiedadId: string) {
      const sesion = await obtenerSesion();
      if (!sesion) throw new Error("Sesion expirada, volve a ingresar.");

      const [propiedad] = await db
        .select({ id: propiedades.id, agenteId: propiedades.agenteId })
        .from(propiedades)
        .where(eq(propiedades.id, propiedadId));

      if (!propiedad || propiedad.agenteId !== sesion.userId) {
        throw new Error("Propiedad no encontrada.");
      }
      return sesion;
}

export async function agregarPortalPublicado(
      propiedadId: string,
      _prevState: PortalState,
      formData: FormData
    ): Promise<PortalState> {
      let sesion;
      try {
        sesion = await requerirPropiedadDelAgente(propiedadId);
      } catch (e) {
        return { error: e instanceof Error ? e.message : "No autorizado." };
      }

      const parsed = PortalSchema.safeParse({
        portal: formData.get("portal"),
        url: formData.get("url"),
      });
      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Datos invalidos" };
      }

      await db.insert(portalesPublicados).values({
        propiedadId,
        portal: parsed.data.portal,
        url: parsed.data.url,
        agenteId: sesion.userId,
      });

      revalidatePath(`/propiedades/${propiedadId}`);
      return { ok: Date.now() };
}

export async function eliminarPortalPublicado(portalId: string, propiedadId: string) {
      const sesion = await obtenerSesion();
      if (!sesion) return;

      await db
        .delete(portalesPublicados)
        .where(
          and(eq(portalesPublicados.id, portalId), eq(portalesPublicados.agenteId, sesion.userId))
        );

      revalidatePath(`/propiedades/${propiedadId}`);
}

const DescripcionSchema = z.object({
      descripcion: z.string().min(1, "Escribi algo antes de guardar."),
});

export type DescripcionState = { error?: string; ok?: number };

export async function actualizarDescripcion(
      propiedadId: string,
      _prevState: DescripcionState,
      formData: FormData
    ): Promise<DescripcionState> {
      try {
        await requerirPropiedadDelAgente(propiedadId);
      } catch (e) {
        return { error: e instanceof Error ? e.message : "No autorizado." };
      }

      const parsed = DescripcionSchema.safeParse({
        descripcion: formData.get("descripcion"),
      });
      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Datos invalidos" };
      }

      await db
        .update(propiedades)
        .set({ descripcion: parsed.data.descripcion })
        .where(eq(propiedades.id, propiedadId));

      revalidatePath(`/propiedades/${propiedadId}`);
      return { ok: Date.now() };
}

// ---------------------------------------------------------------------------
// Eliminar propiedad (va a la Papelera 30 días). Solo el agente a cargo.

/** Qué se va a borrar o desvincular junto con la propiedad (para confirmar). */
export async function resumenEliminarPropiedad(propiedadId: string) {
      await requerirPropiedadDelAgente(propiedadId);
      return dependenciasPropiedad(propiedadId);
}

export async function eliminarPropiedad(
      propiedadId: string
): Promise<{ ok: boolean; error?: string }> {
      let quien: string;
      try {
        quien = (await requerirPropiedadDelAgente(propiedadId)).userId;
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "No autorizado." };
      }
      try {
        await borrarPropiedad(propiedadId, quien);
      } catch (e) {
        return {
          ok: false,
          error: `No se pudo eliminar: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
      revalidatePath("/propiedades");
      revalidatePath("/agenda");
      revalidatePath("/dashboard");
      revalidatePath("/papelera");
      return { ok: true };
}

/** Mostrar u ocultar la propiedad en la página web pública. */
export async function cambiarPublicadaWeb(propiedadId: string, publicada: boolean) {
      await requerirPropiedadDelAgente(propiedadId);
      await db
        .update(propiedades)
        .set({ publicadaWeb: publicada })
        .where(eq(propiedades.id, propiedadId));
      revalidatePath(`/propiedades/${propiedadId}`);
      revalidatePath("/inmuebles");
      revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Editar propiedad (solo el agente a cargo).
// Si cambia el precio: queda registrado en el historial de precios (igual que
// "Ajustar precio" del Pipeline) y, si se pide, se actualiza el precio escrito
// en el título y la descripción.

export type EditarPropiedadState = {
      error?: string;
      ok?: number;
      /** Resumen de lo que cambió con el precio (para mostrar después de guardar). */
      aviso?: string;
      /** Portales donde está publicada: hay que actualizar el precio a mano ahí. */
      portales?: { portal: string; url: string }[];
};

export async function editarPropiedad(
      _prev: EditarPropiedadState,
      formData: FormData
): Promise<EditarPropiedadState> {
      const propiedadId = String(formData.get("propiedadId") ?? "");
      let sesion;
      try {
        sesion = await requerirPropiedadDelAgente(propiedadId);
      } catch (e) {
        return { error: e instanceof Error ? e.message : "No autorizado." };
      }

      const parsed = leerFormularioPropiedad(formData);
      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Datos invalidos" };
      }
      const datos = parsed.data;

      const [actual] = await db.select().from(propiedades).where(eq(propiedades.id, propiedadId));
      if (!actual) return { error: "Propiedad no encontrada." };

      let titulo = datos.titulo;
      let descripcion = datos.descripcion ?? null;
      const precioNuevo = datos.precio ?? null;
      const cambioPrecio =
        precioNuevo !== actual.precio || (precioNuevo !== null && datos.moneda !== actual.moneda);

      let aviso: string | undefined;
      if (cambioPrecio && actual.precio && precioNuevo && formData.get("actualizarTextos") === "1") {
        const ant = { precio: actual.precio, moneda: actual.moneda };
        const nue = { precio: precioNuevo, moneda: datos.moneda };
        const t = reemplazarPrecio(titulo, ant, nue);
        const dsc = descripcion ? reemplazarPrecio(descripcion, ant, nue) : { texto: null, cambios: 0 };
        titulo = t.texto;
        descripcion = dsc.texto;
        const partes = [t.cambios && "el título", dsc.cambios && "la descripción"].filter(Boolean);
        aviso = partes.length
          ? `Precio actualizado también en ${partes.join(" y ")}.`
          : "No encontré el precio anterior escrito en el título ni en la descripción.";
      }

      // Fotos (orden y borrados) desde el organizador del modo edición.
      let fotosNuevas: string[] | undefined;
      const ordenStr = formData.get("ordenFotos");
      if (typeof ordenStr === "string" && ordenStr) {
        let orden: unknown;
        try {
          orden = JSON.parse(ordenStr);
        } catch {
          orden = null;
        }
        const total = Number(formData.get("totalFotos"));
        if (total !== actual.fotos.length) {
          return { error: "Las fotos cambiaron mientras editabas (¿subiste o borraste en otra pestaña?). Recargá la página y volvé a intentar." };
        }
        const valido =
          Array.isArray(orden) &&
          orden.every((i) => Number.isInteger(i) && i >= 0 && i < total) &&
          new Set(orden).size === orden.length;
        if (!valido) return { error: "Orden de fotos inválido." };
        const ord = orden as number[];
        const igual = ord.length === total && ord.every((v, k) => v === k);
        if (!igual) fotosNuevas = ord.map((k) => actual.fotos[k]);
      }

      await db.transaction(async (tx) => {
        if (cambioPrecio) {
          await tx.insert(historialPrecios).values({
            propiedadId,
            precioAnterior: actual.precio ?? null,
            monedaAnterior: actual.moneda ?? null,
            precioNuevo: precioNuevo ?? 0,
            monedaNueva: datos.moneda,
            agenteId: sesion.userId,
          });
        }
        await tx
          .update(propiedades)
          .set({
            titulo,
            operacion: datos.operacion,
            tipo: datos.tipo,
            zona: datos.zona,
            direccion: datos.direccion ?? null,
            departamento: datos.departamento ?? null,
            precio: precioNuevo,
            moneda: datos.moneda,
            m2Cubiertos: datos.m2Cubiertos ?? null,
            m2Privados: datos.m2Privados ?? null,
            m2Terreno: datos.m2Terreno ?? null,
            hectareas: datos.hectareas ?? null,
            dormitorios: datos.dormitorios ?? null,
            banos: datos.banos ?? null,
            ambientes: datos.ambientes ?? null,
            cocheras: datos.cocheras ?? null,
            bodegas: datos.bodegas ?? null,
            antiguedad: datos.antiguedad ?? null,
            numeroPiso: datos.numeroPiso ?? null,
            cantidadPisos: datos.cantidadPisos ?? null,
            orientacion: datos.orientacion ?? null,
            disposicion: datos.disposicion ?? null,
            subtipo: datos.subtipo ?? null,
            gastosComunes: datos.gastosComunes ?? null,
            mascotas: datos.mascotas ?? false,
            acceso: datos.acceso ?? null,
            distanciaAsfalto: datos.distanciaAsfalto ?? null,
            formaTerreno: datos.formaTerreno ?? null,
            estadoEdilicio: datos.estadoEdilicio ?? null,
            extras: datos.extras ?? [],
            descripcion,
            duenoId: datos.duenoId,
            ...(fotosNuevas ? { fotos: fotosNuevas } : {}),
          })
          .where(eq(propiedades.id, propiedadId));
      });

      let portales: { portal: string; url: string }[] | undefined;
      if (cambioPrecio) {
        portales = await db
          .select({ portal: portalesPublicados.portal, url: portalesPublicados.url })
          .from(portalesPublicados)
          .where(eq(portalesPublicados.propiedadId, propiedadId));
      }

      revalidatePath(`/propiedades/${propiedadId}`);
      revalidatePath("/propiedades");
      revalidatePath("/pipeline");
      revalidatePath("/inmuebles");
      revalidatePath("/");
      return { ok: Date.now(), aviso, portales };
}
