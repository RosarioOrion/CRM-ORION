"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { captaciones, tasaciones } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { registrar } from "@/lib/registro-actividad";
import { borrarCaptacion } from "@/lib/captacion-borrar";
import {
  calcularPlazo,
  CICLOS,
  DIAS_EXTRA_TASANDO,
  ETAPA_LABEL,
  ETAPAS_CONTACTO,
  estadoDeEtapa,
  MOTIVOS_S12,
  USO_TASACION,
  type Etapa,
  type MotivoS12,
  type UsoTasacion,
} from "@/lib/captacion-flujo";

// Acciones del circuito de captación (ver src/lib/captacion-flujo.ts).

type Resultado = { ok?: boolean; borrada?: boolean; error?: string };
type Captacion = typeof captaciones.$inferSelect;

async function miCaptacion(id: string): Promise<{ yo: string; c: Captacion } | { error: string }> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };
  const [c] = await db
    .select()
    .from(captaciones)
    .where(and(eq(captaciones.id, id), eq(captaciones.agenteId, sesion.userId)));
  if (!c) return { error: "Esta captación ya no está (puede haber vencido)." };
  if (c.convertidaEnPropiedadId) return { error: "Esta captación ya es una propiedad." };
  return { yo: sesion.userId, c };
}

const paso = (c: Captacion, texto: string) => [
  ...(c.historial ?? []),
  { fecha: new Date().toISOString(), texto },
];

async function moverA(c: Captacion, etapa: Etapa, texto: string, extra: Partial<Captacion> = {}) {
  await db
    .update(captaciones)
    .set({
      etapa,
      estado: estadoDeEtapa(etapa),
      etapaDesde: new Date(),
      intentoEn: null,
      intentoCanal: null,
      ...(etapa === "S8" || etapa === "S12" ? { seguimientosHechos: 0, ultimoSeguimiento: null } : {}),
      ...extra,
      historial: paso(c, texto),
    })
    .where(eq(captaciones.id, c.id));
  await registrar(`Captación → ${ETAPA_LABEL[etapa]}`, { entidad: "captacion", id: c.id, detalle: texto });
}

function listo(): Resultado {
  revalidatePath("/captaciones");
  return { ok: true };
}

/** 📞 Llamar / 💬 WhatsApp: deja anotado el intento de contacto. */
export async function registrarIntento(id: string, canal: "LLAMADA" | "WHATSAPP"): Promise<Resultado> {
  const r = await miCaptacion(id);
  if ("error" in r) return r;
  const { c } = r;
  if (![...ETAPAS_CONTACTO, "S8", "S12"].includes(c.etapa as Etapa)) return { error: "En esta etapa no corresponde." };
  const texto = canal === "LLAMADA" ? "📞 Llamó al propietario" : "💬 Le escribió por WhatsApp";
  await db
    .update(captaciones)
    .set({ intentoEn: new Date(), intentoCanal: canal, historial: paso(c, texto) })
    .where(eq(captaciones.id, id));
  await registrar(texto.replace(/^\S+ /, "Captación: "), { entidad: "captacion", id });
  return listo();
}

/** Primer contacto (Llamando / 1er / 2do seguimiento): qué pasó. */
export async function resultadoContacto(
  id: string,
  resultado: "NO_RESPONDIO" | "POR_AHORA_NO" | "S12" | "AUTORIZO",
  motivo?: MotivoS12
): Promise<Resultado> {
  const r = await miCaptacion(id);
  if ("error" in r) return r;
  const { c, yo } = r;
  const etapa = c.etapa as Etapa;
  const enContacto = ETAPAS_CONTACTO.includes(etapa);
  const enCiclo = etapa === "S8" || etapa === "S12";
  if (!enContacto && !(enCiclo && (resultado === "AUTORIZO" || resultado === "S12")))
    return { error: "En esta etapa no corresponde." };
  if (enContacto && !calcularPlazo(c).contactado)
    return { error: "Primero llamalo o escribile por WhatsApp (botones de arriba)." };

  if (resultado === "NO_RESPONDIO") {
    if (etapa === "LLAMANDO") await moverA(c, "SEGUIMIENTO_1", "No respondió → 1er seguimiento (48 hs)");
    else if (etapa === "SEGUIMIENTO_1") await moverA(c, "SEGUIMIENTO_2", "No respondió → 2do seguimiento (48 hs)");
    else {
      await borrarCaptacion(c.id, yo, "Captación sin respuesta tras 2 seguimientos: se borró (Papelera)");
      revalidatePath("/captaciones");
      return { ok: true, borrada: true };
    }
    return listo();
  }
  if (resultado === "POR_AHORA_NO") {
    if (etapa === "S8") return { error: "Ya está en S8." };
    await moverA(c, "S8", "Respondió: por ahora no → S8 (semanal x 8 semanas)");
    return listo();
  }
  if (resultado === "S12") {
    const m = motivo && motivo in MOTIVOS_S12 ? MOTIVOS_S12[motivo] : MOTIVOS_S12.OTRO;
    await moverA(c, "S12", `${m} → S12 (mensual x 12 meses)`);
    return listo();
  }
  // Autorizó: alquiler va directo a publicar; venta, a tasar.
  if (c.operacion === "ALQUILER") await moverA(c, "PARA_PUBLICAR", "¡Autorizó! Alquiler → Para publicar");
  else await moverA(c, "TASANDO", "¡Autorizó! Venta → Tasando");
  return listo();
}

/** S8 / S12: seguimiento hecho y sigue sin autorizar (o no respondió). */
export async function marcarSeguimientoCiclo(id: string, respondio: boolean): Promise<Resultado> {
  const r = await miCaptacion(id);
  if ("error" in r) return r;
  const { c, yo } = r;
  if (c.etapa !== "S8" && c.etapa !== "S12") return { error: "No está en S8 ni S12." };
  const ciclo = CICLOS[c.etapa];
  const plazo = calcularPlazo(c);
  if (plazo.cicloTerminado) return { error: `Ya hizo los ${ciclo.total} seguimientos.` };
  if (!plazo.contactado) return { error: "Primero llamalo o escribile por WhatsApp (botones de arriba)." };
  const hechos = c.seguimientosHechos + 1;
  const texto = `Seguimiento ${hechos}/${ciclo.total} hecho · ${respondio ? "sigue sin autorizar" : "no respondió"}`;

  if (c.etapa === "S12" && hechos >= ciclo.total) {
    await borrarCaptacion(c.id, yo, "Captación: terminó S12 sin autorización, se borró (Papelera)");
    revalidatePath("/captaciones");
    return { ok: true, borrada: true };
  }
  await db
    .update(captaciones)
    .set({ seguimientosHechos: hechos, ultimoSeguimiento: new Date(), intentoEn: null, intentoCanal: null, historial: paso(c, texto) })
    .where(eq(captaciones.id, id));
  await registrar(`Captación: ${texto}`, { entidad: "captacion", id });
  return listo();
}

/** Terminó S8 sin autorización: pasa a S12. */
export async function pasarAS12(id: string): Promise<Resultado> {
  const r = await miCaptacion(id);
  if ("error" in r) return r;
  if (r.c.etapa !== "S8") return { error: "No está en S8." };
  await moverA(r.c, "S12", "Terminó S8 sin autorización → S12 (mensual x 12 meses)");
  return listo();
}

/** Tasando: cómo se usó la tasación y si autorizó. */
export async function resultadoTasacion(
  id: string,
  uso: UsoTasacion,
  autorizo: boolean
): Promise<Resultado> {
  const r = await miCaptacion(id);
  if ("error" in r) return r;
  const { c } = r;
  if (c.etapa !== "TASANDO") return { error: "No está en Tasando." };
  if (!c.tasacionId) return { error: "Primero hacé la tasación." };
  if (!(uso in USO_TASACION)) return { error: "Elegí cómo se usó la tasación." };
  if (autorizo) await moverA(c, "PARA_PUBLICAR", `Tasación: ${USO_TASACION[uso]} → Para publicar`, { tasacionUso: uso });
  else await moverA(c, "S12", `${MOTIVOS_S12.NO_ACEPTO_TASACION} → S12 (mensual x 12 meses)`, { tasacionUso: uso });
  return listo();
}

/** Tasando: pedir 3 días más (una sola vez). */
export async function pedirMasTiempoTasacion(id: string): Promise<Resultado> {
  const r = await miCaptacion(id);
  if ("error" in r) return r;
  const { c } = r;
  if (c.etapa !== "TASANDO") return { error: "No está en Tasando." };
  if (c.plazoExtendido) return { error: "Ya se pidieron los días extra." };
  await db
    .update(captaciones)
    .set({ plazoExtendido: true, historial: paso(c, `⏱ Pidió ${DIAS_EXTRA_TASANDO} días más para la tasación`) })
    .where(eq(captaciones.id, id));
  await registrar("Captación: pidió más tiempo para tasar", { entidad: "captacion", id });
  return listo();
}

/** Tasando: vincular una tasación que ya estaba hecha en Tasaciones. */
export async function vincularTasacionExistente(captacionId: string, tasacionId: string): Promise<Resultado> {
  const r = await miCaptacion(captacionId);
  if ("error" in r) return r;
  if (r.c.etapa !== "TASANDO") return { error: "No está en Tasando." };
  await vincular(captacionId, tasacionId, "📐 Vinculó una tasación ya hecha");
  return listo();
}

/** Desde "Nueva tasación": deja la tasación vinculada a la captación. */
export async function vincularTasacion(captacionId: string, tasacionId: string) {
  await vincular(captacionId, tasacionId, "📐 Tasación hecha");
}

async function vincular(captacionId: string, tasacionId: string, texto: string) {
  const r = await miCaptacion(captacionId);
  if ("error" in r) return;
  const [t] = await db
    .select({ id: tasaciones.id })
    .from(tasaciones)
    .where(and(eq(tasaciones.id, tasacionId), eq(tasaciones.agenteId, r.yo)));
  if (!t) return;
  await db
    .update(captaciones)
    .set({ tasacionId, historial: paso(r.c, texto) })
    .where(eq(captaciones.id, captacionId));
  revalidatePath("/captaciones");
}
