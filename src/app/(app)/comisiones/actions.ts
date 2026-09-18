"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { comisiones } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";

export async function marcarComisionPagada(comisionId: string, pagada: boolean) {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion.rol)) return;

  await db
    .update(comisiones)
    .set({ pagada, fechaPago: pagada ? new Date() : null })
    .where(eq(comisiones.id, comisionId));

  revalidatePath("/comisiones");
}
