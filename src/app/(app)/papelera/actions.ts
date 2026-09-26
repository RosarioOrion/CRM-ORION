"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { papelera } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { asegurarTablaPapelera, restaurarDePapelera } from "@/lib/papelera";

export async function restaurar(
  id: string
): Promise<{ ok: boolean; mensaje?: string; error?: string; href?: string }> {
  const sesion = await obtenerSesion();
  if (!sesion) return { ok: false, error: "Sesión expirada, volvé a ingresar." };

  await asegurarTablaPapelera();
  const [item] = await db
    .select({ agenteId: papelera.agenteId, tipo: papelera.tipo })
    .from(papelera)
    .where(eq(papelera.id, id));
  if (!item) return { ok: false, error: "Ya no está en la papelera." };
  // Cada uno restaura lo suyo; Team Leader / Administrador, lo de cualquiera.
  if (item.agenteId !== sesion.userId && !esAdmin(sesion.rol)) {
    return { ok: false, error: "Solo el agente a cargo puede restaurarlo." };
  }

  const r = await restaurarDePapelera(id);
  if (!r.ok) return { ok: false, error: r.error };

  for (const p of ["/papelera", "/contactos", "/propiedades", "/agenda", "/dashboard", "/busquedas", "/captaciones"])
    revalidatePath(p);
  return {
    ok: true,
    mensaje: r.salteadas
      ? `Restaurado. ${r.salteadas} dato(s) vinculados no se pudieron recuperar porque lo que los acompañaba ya no existe.`
      : "Restaurado con todo lo suyo.",
    href: item.tipo === "CONTACTO" ? `/contactos/${id}` : `/propiedades/${id}`,
  };
}
