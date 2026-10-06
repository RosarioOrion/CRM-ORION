"use server";

import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { configuracionEmpresa, plantillasWhatsapp, usuarios } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { NOMBRE_SITIO } from "@/lib/sitio";
import { PLANTILLAS_INICIALES, type Plantilla } from "@/lib/plantillas-whatsapp";

// La tabla se creó después: si todavía no existe (no se corrió Admin →
// Migrar), se crea acá con los mensajes iniciales. Solo la primera vez: si
// después el team leader borra mensajes, no se vuelven a cargar.
let tablaLista: Promise<void> | null = null;
function asegurarTabla(): Promise<void> {
  tablaLista ??= db
    .transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('plantillas_whatsapp'))`);
      const [fila] = await tx.execute<{ existe: string | null }>(
        sql`SELECT to_regclass('public.plantillas_whatsapp')::text AS existe`
      );
      if (fila?.existe) return;
      await tx.execute(sql`
        CREATE TABLE IF NOT EXISTS plantillas_whatsapp (
          id text PRIMARY KEY,
          titulo text NOT NULL,
          emoji text,
          texto text NOT NULL,
          orden integer NOT NULL DEFAULT 0,
          creado_en timestamp NOT NULL DEFAULT now()
        )
      `);
      await tx
        .insert(plantillasWhatsapp)
        .values(PLANTILLAS_INICIALES.map((p, i) => ({ ...p, orden: i })));
    })
    .catch((e) => {
      tablaLista = null; // reintenta en el próximo pedido
      throw e;
    });
  return tablaLista;
}

export async function listarPlantillas(): Promise<Plantilla[]> {
  await asegurarTabla();
  return db
    .select({
      id: plantillasWhatsapp.id,
      titulo: plantillasWhatsapp.titulo,
      emoji: plantillasWhatsapp.emoji,
      texto: plantillasWhatsapp.texto,
    })
    .from(plantillasWhatsapp)
    .orderBy(asc(plantillasWhatsapp.orden), asc(plantillasWhatsapp.creadoEn));
}

/** Lo que necesita el botón WhatsApp: los mensajes y los datos de quien envía. */
export async function datosParaWhatsApp(): Promise<{
  plantillas: Plantilla[];
  agente: string;
  inmobiliaria: string;
}> {
  const sesion = await obtenerSesion();
  if (!sesion) return { plantillas: [], agente: "", inmobiliaria: "" };
  const [plantillas, [yo], [config]] = await Promise.all([
    listarPlantillas(),
    db.select({ nombre: usuarios.nombre }).from(usuarios).where(eq(usuarios.id, sesion.userId)),
    db.select({ nombre: configuracionEmpresa.nombreEmpresa }).from(configuracionEmpresa).limit(1),
  ]);
  return {
    plantillas,
    agente: yo?.nombre ?? "",
    inmobiliaria: config?.nombre || NOMBRE_SITIO,
  };
}

async function requerirAdmin() {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion.rol)) throw new Error("No autorizado.");
}

export type PlantillaState = { error?: string; ok?: number };

/** Crear (sin id) o editar (con id) un mensaje. */
export async function guardarPlantilla(
  id: string | null,
  _prev: PlantillaState,
  formData: FormData
): Promise<PlantillaState> {
  try {
    await requerirAdmin();
  } catch {
    return { error: "Solo el team leader puede editar los mensajes." };
  }
  await asegurarTabla();
  const titulo = String(formData.get("titulo") || "").trim();
  const emoji = String(formData.get("emoji") || "").trim().slice(0, 8) || null;
  const texto = String(formData.get("texto") || "").trim();
  if (!titulo) return { error: "Poné un nombre al mensaje (ej. Captación)." };
  if (!texto) return { error: "Escribí el texto del mensaje." };

  if (id) {
    await db.update(plantillasWhatsapp).set({ titulo, emoji, texto }).where(eq(plantillasWhatsapp.id, id));
  } else {
    const [{ maximo }] = await db
      .select({ maximo: sql<number>`coalesce(max(${plantillasWhatsapp.orden}), -1)`.mapWith(Number) })
      .from(plantillasWhatsapp);
    await db.insert(plantillasWhatsapp).values({ titulo, emoji, texto, orden: maximo + 1 });
  }
  revalidatePath("/mensajes");
  return { ok: Date.now() };
}

export async function eliminarPlantilla(id: string) {
  await requerirAdmin();
  await db.delete(plantillasWhatsapp).where(eq(plantillasWhatsapp.id, id));
  revalidatePath("/mensajes");
}

/** Sube o baja un mensaje en la lista (el orden es el del menú de WhatsApp). */
export async function moverPlantilla(id: string, direccion: -1 | 1) {
  await requerirAdmin();
  const lista = await listarPlantillas();
  const i = lista.findIndex((p) => p.id === id);
  const j = i + direccion;
  if (i < 0 || j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  await db.transaction(async (tx) => {
    for (const [orden, p] of lista.entries()) {
      await tx.update(plantillasWhatsapp).set({ orden }).where(eq(plantillasWhatsapp.id, p.id));
    }
  });
  revalidatePath("/mensajes");
}
