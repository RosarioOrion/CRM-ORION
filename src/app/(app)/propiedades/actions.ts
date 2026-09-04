"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { propiedades } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";

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

export async function crearPropiedad(
      _prevState: PropiedadState,
      formData: FormData
    ): Promise<PropiedadState> {
      const sesion = await obtenerSesion();
      if (!sesion) return { error: "Sesion expirada, volve a ingresar." };

  const parsed = PropiedadSchema.safeParse({
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
