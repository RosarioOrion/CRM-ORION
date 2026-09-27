import { and, eq, gte, inArray, lt, ne, or } from "drizzle-orm";
import { db } from "@/db";
import {
  actividades,
  contactos,
  pipelineAcciones,
  propiedades,
  seguimientos,
  visitas,
} from "@/db/schema";
import { ahoraUY, TIPO_EVENTO_ICONO, TIPO_EVENTO_LABEL, esTipoEvento } from "@/lib/calendario";
import { limpiarTitulo } from "@/lib/propiedades";
import { estadoSeguimiento, SIN_RESPUESTA_TOPE, type SeguimientoMin } from "@/lib/seguimientos";

// Inicio "Plan del día": qué hacer primero, en este orden (decidido en el
// Mapa único de Orion):
//   1. Contactos que no respondieron al aviso final → decidir si queda frío.
//   2. Seguimientos vencidos o para hoy.
//   3. Lo agendado para hoy (y lo vencido sin cerrar en la Agenda).
//   4. Propiedades activas sin movimiento → confirmar disponibilidad y
//      revisar precio, fotos o condiciones.

/** Días sin ningún movimiento para considerar una propiedad "quieta". */
export const DIAS_PROPIEDAD_QUIETA = 21;

export type ItemPlan = {
  id: string;
  titulo: string;
  detalle: string;
  href: string;
  urgente?: boolean;
};

export type PlanDelDia = {
  avisos: ItemPlan[];
  seguimientos: ItemPlan[];
  hoy: ItemPlan[];
  agendaVencida: number;
  quietas: ItemPlan[];
};

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const fechaCorta = (d: Date) => d.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" });

export async function cargarPlanDelDia(yo: string): Promise<PlanDelDia> {
  const ahora = ahoraUY();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const finHoy = new Date(inicioHoy.getTime() + 24 * 3600 * 1000);

  // --- 1 y 2: seguimientos ---------------------------------------------------
  const avisos: ItemPlan[] = [];
  const segsHoy: (ItemPlan & { orden: number })[] = [];
  try {
    const segs = await db
      .select({
        contactoId: seguimientos.contactoId,
        fecha: seguimientos.fecha,
        respondio: seguimientos.respondio,
        avisoFinal: seguimientos.avisoFinal,
        proximaFecha: seguimientos.proximaFecha,
      })
      .from(seguimientos)
      .where(eq(seguimientos.agenteId, yo));
    const porContacto = new Map<string, SeguimientoMin[]>();
    for (const s of segs) {
      if (!porContacto.has(s.contactoId)) porContacto.set(s.contactoId, []);
      porContacto.get(s.contactoId)!.push(s);
    }
    if (porContacto.size) {
      const cs = await db
        .select({ id: contactos.id, nombre: contactos.nombre, frioDesde: contactos.frioDesde, archivado: contactos.archivado })
        .from(contactos)
        .where(and(inArray(contactos.id, [...porContacto.keys()]), eq(contactos.agenteId, yo)));
      for (const c of cs) {
        if (c.archivado) continue;
        const e = estadoSeguimiento(porContacto.get(c.id)!, c.frioDesde, ahora);
        const href = `/contactos/${c.id}`;
        if (e.tipo === "NO_RESPONDIO_AVISO") {
          avisos.push({
            id: c.id,
            titulo: c.nombre,
            detalle: `No respondió al aviso final del ${fechaCorta(e.avisoEl)}. ¿Queda frío?`,
            href,
            urgente: true,
          });
        } else if ((e.tipo === "AL_DIA" || e.tipo === "SIN_RESPUESTA") && e.proxima && e.proxima < finHoy) {
          const vencido = e.proxima < inicioHoy;
          let detalle = vencido ? `Vencido desde el ${fechaCorta(e.proxima)}` : "Para hoy";
          if (e.tipo === "SIN_RESPUESTA") {
            detalle += ` · ${e.sinRespuesta} de ${SIN_RESPUESTA_TOPE} sin respuesta`;
            if (e.siguienteEsAviso) detalle += " · toca el AVISO FINAL";
          }
          segsHoy.push({ id: c.id, titulo: c.nombre, detalle, href, urgente: vencido, orden: e.proxima.getTime() });
        }
      }
    }
  } catch {
    // tabla de seguimientos todavía no creada
  }

  // --- 3: agenda de hoy ----------------------------------------------------------
  const hoy: (ItemPlan & { orden: number })[] = [];
  const vs = await db
    .select({
      id: visitas.id,
      fecha: visitas.fecha,
      codigo: propiedades.codigo,
      titulo: propiedades.titulo,
      contacto: contactos.nombre,
    })
    .from(visitas)
    .innerJoin(propiedades, eq(visitas.propiedadId, propiedades.id))
    .innerJoin(contactos, eq(visitas.contactoId, contactos.id))
    .where(
      and(
        eq(visitas.agenteId, yo),
        eq(visitas.estado, "PROGRAMADA"),
        gte(visitas.fecha, inicioHoy),
        lt(visitas.fecha, finHoy)
      )
    );
  for (const v of vs) {
    hoy.push({
      id: `v-${v.id}`,
      titulo: `${hhmm(v.fecha)} · 🏠 Visita ${v.codigo}`,
      detalle: `${limpiarTitulo(v.titulo)} · 👤 ${v.contacto}`,
      href: "/agenda",
      orden: v.fecha.getTime(),
    });
  }
  let agendaVencida = 0;
  try {
    const as = await db
      .select({
        id: actividades.id,
        tipo: actividades.tipo,
        titulo: actividades.titulo,
        fecha: actividades.fecha,
        lugar: actividades.lugar,
      })
      .from(actividades)
      .where(
        and(
          or(eq(actividades.agenteId, yo), eq(actividades.tipo, "REUNION_EQUIPO")),
          eq(actividades.estado, "PENDIENTE"),
          gte(actividades.fecha, inicioHoy),
          lt(actividades.fecha, finHoy)
        )
      );
    for (const a of as) {
      const tipo = esTipoEvento(a.tipo) ? a.tipo : "OTRO";
      const conHora = a.fecha.getHours() || a.fecha.getMinutes();
      hoy.push({
        id: `a-${a.id}`,
        titulo: `${conHora ? `${hhmm(a.fecha)} · ` : ""}${TIPO_EVENTO_ICONO[tipo]} ${a.titulo}`,
        detalle: [TIPO_EVENTO_LABEL[tipo], a.lugar ? `📍 ${a.lugar}` : null].filter(Boolean).join(" · "),
        href: "/agenda",
        orden: a.fecha.getTime(),
      });
    }
    const actVenc = await db
      .select({ id: actividades.id })
      .from(actividades)
      .where(
        and(eq(actividades.agenteId, yo), eq(actividades.estado, "PENDIENTE"), lt(actividades.fecha, inicioHoy))
      );
    agendaVencida += actVenc.length;
  } catch {
    // tabla de actividades todavía no creada
  }
  const visVenc = await db
    .select({ id: visitas.id })
    .from(visitas)
    .where(and(eq(visitas.agenteId, yo), eq(visitas.estado, "PROGRAMADA"), lt(visitas.fecha, inicioHoy)));
  agendaVencida += visVenc.length;

  // --- 4: propiedades quietas ------------------------------------------------------
  const limite = new Date(ahora.getTime() - DIAS_PROPIEDAD_QUIETA * 24 * 3600 * 1000);
  const activas = await db
    .select({
      id: propiedades.id,
      codigo: propiedades.codigo,
      titulo: propiedades.titulo,
      inicio: propiedades.fechaInicioPipeline,
    })
    .from(propiedades)
    .where(and(eq(propiedades.agenteId, yo), eq(propiedades.estado, "ACTIVA"), lt(propiedades.fechaInicioPipeline, limite)));
  const quietas: ItemPlan[] = [];
  if (activas.length) {
    const ids = activas.map((p) => p.id);
    const conMovimiento = new Set<string>();
    const acc = await db
      .select({ id: pipelineAcciones.propiedadId })
      .from(pipelineAcciones)
      .where(and(inArray(pipelineAcciones.propiedadId, ids), gte(pipelineAcciones.creadoEn, limite)));
    acc.forEach((r) => conMovimiento.add(r.id));
    const vis = await db
      .select({ id: visitas.propiedadId })
      .from(visitas)
      .where(and(inArray(visitas.propiedadId, ids), gte(visitas.fecha, limite), ne(visitas.estado, "CANCELADA")));
    vis.forEach((r) => conMovimiento.add(r.id));
    try {
      const sg = await db
        .select({ id: seguimientos.propiedadId })
        .from(seguimientos)
        .where(and(inArray(seguimientos.propiedadId, ids), gte(seguimientos.fecha, limite)));
      sg.forEach((r) => r.id && conMovimiento.add(r.id));
    } catch {
      // sin tabla de seguimientos
    }
    for (const p of activas) {
      if (conMovimiento.has(p.id)) continue;
      quietas.push({
        id: p.id,
        titulo: `${p.codigo} — ${limpiarTitulo(p.titulo)}`,
        detalle: `Sin visitas ni seguimiento en ${DIAS_PROPIEDAD_QUIETA}+ días: confirmá disponibilidad con el dueño y revisá precio, fotos o condiciones.`,
        href: `/propiedades/${p.id}`,
      });
    }
  }

  return {
    avisos,
    seguimientos: segsHoy.sort((a, b) => a.orden - b.orden),
    hoy: hoy.sort((a, b) => a.orden - b.orden),
    agendaVencida,
    quietas,
  };
}
