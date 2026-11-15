import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { captaciones, contactos, seguimientos } from "@/db/schema";
import { borrarContacto, dependenciasContacto } from "@/lib/eliminar";
import { asegurarTablaPapelera, guardarCaptacionEnPapelera } from "@/lib/papelera";
import { registrar } from "@/lib/registro-actividad";
import { calcularPlazo, estadoDeEtapa, type Etapa } from "@/lib/captacion-flujo";

// Borrado de captaciones (vencidas o a mano): van a la Papelera. Si el
// propietario se cargó para esta captación y no tiene nada más (otra
// captación, propiedad, búsqueda, visita, seguimiento…), se borra con ella,
// así el número queda libre para otro agente.

const MARGEN_CONTACTO_NUEVO = 2 * 3600 * 1000;

export async function borrarCaptacion(captacionId: string, eliminadoPor: string, motivo: string) {
  await asegurarTablaPapelera();
  const [cap] = await db.select().from(captaciones).where(eq(captaciones.id, captacionId));
  if (!cap) return;
  const [contacto] = await db
    .select({ id: contactos.id, agenteId: contactos.agenteId, creadoEn: contactos.creadoEn })
    .from(contactos)
    .where(eq(contactos.id, cap.contactoId));

  let conContacto = false;
  if (
    contacto &&
    contacto.agenteId === cap.agenteId &&
    contacto.creadoEn.getTime() >= cap.creadoEn.getTime() - MARGEN_CONTACTO_NUEVO
  ) {
    const dep = await dependenciasContacto(contacto.id);
    const [seg] = await db
      .select({ id: seguimientos.id })
      .from(seguimientos)
      .where(eq(seguimientos.contactoId, contacto.id))
      .limit(1);
    conContacto =
      dep.propiedadesComoDueno.length === 0 &&
      dep.visitas === 0 &&
      dep.busquedas === 0 &&
      dep.captaciones === 1 &&
      dep.actividades === 0 &&
      !seg;
  }

  if (conContacto) {
    // La foto del contacto incluye la captación.
    await borrarContacto(cap.contactoId, eliminadoPor);
  } else {
    await db.transaction(async (tx) => {
      await guardarCaptacionEnPapelera(tx, captacionId, eliminadoPor);
      await tx.delete(captaciones).where(eq(captaciones.id, captacionId));
    });
  }
  await registrar(motivo, { usuarioId: cap.agenteId, detalle: cap.titulo });
}

const ultimoAviso = { t: 0 };

/**
 * Revisa los plazos: lo vencido se borra (a la Papelera). Si en Llamando o
 * 1er seguimiento hubo llamada/WhatsApp pero no se marcó qué pasó, se toma
 * como "no respondió" y pasa solo al siguiente seguimiento.
 */
export async function vencerCaptaciones() {
  // Como mucho una vez por minuto (se llama también al abrir Captaciones).
  if (Date.now() - ultimoAviso.t < 60_000) return;
  ultimoAviso.t = Date.now();

  const ahora = new Date();
  const filas = await db
    .select()
    .from(captaciones)
    .where(
      and(
        isNull(captaciones.convertidaEnPropiedadId),
        inArray(captaciones.etapa, ["LLAMANDO", "SEGUIMIENTO_1", "SEGUIMIENTO_2", "S8", "S12", "TASANDO"])
      )
    );

  for (const c of filas) {
    const plazo = calcularPlazo(c);
    if (!plazo.vence || plazo.vence > ahora) continue;
    try {
      const siguiente: Etapa | null =
        c.etapa === "LLAMANDO" ? "SEGUIMIENTO_1" : c.etapa === "SEGUIMIENTO_1" ? "SEGUIMIENTO_2" : null;
      if (siguiente && plazo.contactado) {
        await db
          .update(captaciones)
          .set({
            etapa: siguiente,
            estado: estadoDeEtapa(siguiente),
            etapaDesde: ahora,
            intentoEn: null,
            intentoCanal: null,
            historial: [
              ...(c.historial ?? []),
              { fecha: ahora.toISOString(), texto: "Sin respuesta marcada: pasó sola al siguiente seguimiento" },
            ],
          })
          .where(eq(captaciones.id, c.id));
        continue;
      }
      await borrarCaptacion(c.id, c.agenteId, "Captación vencida: se borró (Papelera)");
    } catch (e) {
      console.error("[captaciones] vencer", c.id, e instanceof Error ? e.message : e);
    }
  }
}
