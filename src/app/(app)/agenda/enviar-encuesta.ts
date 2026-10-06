"use client";

import { mensajeEncuesta } from "@/lib/encuestas";
import { prepararEncuesta } from "./encuesta-actions";

/**
 * Abre WhatsApp con el mensaje y el link de la encuesta. La pestaña se abre
 * antes de esperar al servidor para que el navegador no la bloquee.
 */
export async function enviarEncuestaPorWhatsApp(visitaId: string): Promise<string | null> {
  const pestana = window.open("about:blank", "_blank");
  const r = await prepararEncuesta(visitaId);
  if ("error" in r) {
    pestana?.close();
    return r.error;
  }
  const link = `${window.location.origin}/encuesta/${r.token}`;
  const texto = mensajeEncuesta({ nombre: r.contactoNombre, propiedad: r.propiedadTitulo, link });
  const url = `https://wa.me/${r.whatsapp}?text=${encodeURIComponent(texto)}`;
  if (pestana) pestana.location.href = url;
  else window.location.href = url;
  return null;
}
