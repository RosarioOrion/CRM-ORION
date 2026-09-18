"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { kaizenTareas, kaizenCompletados } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { lunesDeSemana, type DiaKaizen } from "@/lib/kaizen";

async function requerirAdmin() {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion.rol)) {
    throw new Error("No autorizado.");
  }
  return sesion;
}

export async function alternarTareaKaizen(tareaId: string, marcar: boolean) {
  const sesion = await obtenerSesion();
  if (!sesion) return;
  const semana = lunesDeSemana(new Date());

  if (marcar) {
    await db
      .insert(kaizenCompletados)
      .values({ tareaId, agenteId: sesion.userId, semanaInicio: semana })
      .onConflictDoNothing();
  } else {
    await db
      .delete(kaizenCompletados)
      .where(
        and(
          eq(kaizenCompletados.tareaId, tareaId),
          eq(kaizenCompletados.agenteId, sesion.userId),
          eq(kaizenCompletados.semanaInicio, semana)
        )
      );
  }
  revalidatePath("/kaizen");
}

export async function crearTareaKaizen(dia: DiaKaizen, texto: string) {
  await requerirAdmin();
  const limpio = texto.trim();
  if (!limpio) return;

  const [ultima] = await db
    .select({ orden: kaizenTareas.orden })
    .from(kaizenTareas)
    .where(and(eq(kaizenTareas.dia, dia), eq(kaizenTareas.activa, true)))
    .orderBy(desc(kaizenTareas.orden))
    .limit(1);

  await db.insert(kaizenTareas).values({
    dia,
    orden: (ultima?.orden ?? 0) + 1,
    texto: limpio,
  });
  revalidatePath("/kaizen");
}

export async function editarTareaKaizen(tareaId: string, texto: string) {
  await requerirAdmin();
  const limpio = texto.trim();
  if (!limpio) return;
  await db.update(kaizenTareas).set({ texto: limpio }).where(eq(kaizenTareas.id, tareaId));
  revalidatePath("/kaizen");
}

export async function eliminarTareaKaizen(tareaId: string) {
  await requerirAdmin();
  await db.update(kaizenTareas).set({ activa: false }).where(eq(kaizenTareas.id, tareaId));
  revalidatePath("/kaizen");
}
