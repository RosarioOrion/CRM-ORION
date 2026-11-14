"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { novedades } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";

async function requerirAdmin() {
  const sesion = await obtenerSesion();
  if (!sesion || !esCEO(sesion.rol)) {
    throw new Error("No autorizado.");
  }
  return sesion;
}

export type NovedadState = { error?: string; ok?: number };

export async function crearNovedad(
  _prevState: NovedadState,
  formData: FormData
): Promise<NovedadState> {
  let sesion;
  try {
    sesion = await requerirAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No autorizado." };
  }

  const titulo = String(formData.get("titulo") || "").trim();
  const cuerpo = String(formData.get("cuerpo") || "").trim();
  const destacada = formData.get("destacada") === "on";

  if (!titulo) return { error: "Ingresá un título" };
  if (!cuerpo) return { error: "Ingresá el contenido de la novedad" };

  await db.insert(novedades).values({
    titulo,
    cuerpo,
    destacada,
    autorId: sesion.userId,
  });

  revalidatePath("/novedades");
  return { ok: Date.now() };
}

export async function eliminarNovedad(novedadId: string) {
  await requerirAdmin();
  await db.delete(novedades).where(eq(novedades.id, novedadId));
  revalidatePath("/novedades");
}
