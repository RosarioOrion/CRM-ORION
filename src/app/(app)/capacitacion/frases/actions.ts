"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { frasesInicio } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";
import { CATEGORIA_FRASE } from "@/lib/frases-semilla";

export type FraseState = { error?: string; ok?: number };

async function soloCeo() {
  const s = await obtenerSesion();
  if (!s || !esCEO(s.rol)) throw new Error("Solo la CEO puede cargar frases.");
}

export async function agregarFrase(_prev: FraseState, formData: FormData): Promise<FraseState> {
  try {
    await soloCeo();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No autorizado." };
  }
  const texto = String(formData.get("texto") || "").trim().slice(0, 300);
  const accion = String(formData.get("accion") || "").trim().slice(0, 200) || null;
  const autor = String(formData.get("autor") || "").trim().slice(0, 100) || null;
  const fuente = String(formData.get("fuente") || "").trim().slice(0, 150) || null;
  const cat = String(formData.get("categoria") || "");
  const categoria = cat in CATEGORIA_FRASE ? cat : null;
  if (texto.length < 5) return { error: "Escribí la frase." };
  await db.insert(frasesInicio).values({ texto, accion, autor, fuente, categoria, origen: "PROPIA" });
  revalidatePath("/capacitacion/frases");
  revalidatePath("/dashboard");
  return { ok: Date.now() };
}

export async function eliminarFrase(id: string) {
  await soloCeo();
  await db.delete(frasesInicio).where(eq(frasesInicio.id, id));
  revalidatePath("/capacitacion/frases");
  revalidatePath("/dashboard");
}
