"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { encuestasVisita } from "@/db/schema";
import { validarRespuestas } from "@/lib/encuestas";
import { asegurarTablaEncuestas } from "@/lib/encuestas-db";

// Pública (sin sesión): el token largo y aleatorio del link es la llave.
export async function responderEncuesta(
  token: string,
  datos: unknown
): Promise<{ ok?: true; error?: string }> {
  const respuestas = validarRespuestas(datos);
  if (!respuestas) return { error: "Faltan respuestas: completá las preguntas marcadas." };
  await asegurarTablaEncuestas();
  const actualizadas = await db
    .update(encuestasVisita)
    .set({ respuestas, respondidaEn: new Date() })
    .where(and(eq(encuestasVisita.token, token), isNull(encuestasVisita.respondidaEn)))
    .returning({ id: encuestasVisita.id });
  if (actualizadas.length === 0) return { error: "Esta encuesta ya fue respondida. ¡Gracias!" };
  return { ok: true };
}
