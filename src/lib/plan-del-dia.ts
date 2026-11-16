import { and, eq, gte, inArray, lt, ne, or } from "drizzle-orm";
import { db } from "@/db";
import {
  actividades,
  captaciones,
  contactos,
  pipelineAcciones,
  propiedades,
  seguimientos,
  visitas,
} from "@/db/schema";
import { ahoraUY, TIPO_EVENTO_ICONO, TIPO_EVENTO_LABEL, esTipoEvento } from "@/lib/calendario";
import { limpiarTitulo } from "@/lib/propiedades";
import { estadoSeguimiento, numeroWhatsApp, SIN_RESPUESTA_TOPE, type SeguimientoMin } from "@/lib/seguimientos";
import { mensajeSeguimientoSemanal, versionesSeguimientoSemanal } from "@/lib/seguimiento-lunes";
import { datosParaWhatsApp, listarPlantillas } from "@/app/(app)/mensajes/actions";
import {
  calcularPlazo,
  CICLOS,
  ETAPA_LABEL,
  ETAPAS_CONTACTO,
  faltaTexto,
  horasRestantes,
  type Etapa,
} from "@/lib/captacion-flujo";
import { hoyUY, mesAnterior, mesLabel, mesSiguiente } from "@/lib/finanzas";
import { filaMes, movimientosDelMes } from "@/lib/finanzas-datos";
import { vincularTasacionesSolas } from "@/lib/captacion-tasacion";

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

/** Lo que necesita la tarjeta de un seguimiento para resolverlo ahí mismo. */
export type AccionSeguimiento = {
  contactoId: string;
  whatsapp: string | null;
  /** Mensaje sugerido ("Qué decir"): la versión del Seguimiento semanal que le toca. */
  mensaje: string;
  avisoFinal: boolean;
  version: string | null;
  /** Propiedades activas de las que es dueño (vacío si es comprador, inquilino…). */
  propiedades: { id: string; codigo: string; titulo: string; precio: number | null; moneda: string }[];
};

export type ItemSeguimiento = ItemPlan & { accion: AccionSeguimiento };

export type PlanDelDia = {
  avisos: ItemPlan[];
  seguimientos: ItemSeguimiento[];
  hoy: ItemPlan[];
  agendaVencida: number;
  quietas: ItemPlan[];
  /** Captaciones con algo para hacer hoy (contactar, seguimiento S8/S12, tasación). */
  captaciones: ItemPlan[];
  /** Recordatorio del Money Day (último día del mes, o si quedó sin cerrar). Sin montos. */
  moneyDay: ItemPlan | null;
};

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const fechaCorta = (d: Date) => d.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" });

export async function cargarPlanDelDia(yo: string): Promise<PlanDelDia> {
  const ahora = ahoraUY();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const finHoy = new Date(inicioHoy.getTime() + 24 * 3600 * 1000);

  // --- 1 y 2: seguimientos ---------------------------------------------------
  const avisos: ItemPlan[] = [];
  const segsHoy: (ItemSeguimiento & { orden: number })[] = [];
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
        .select({
          id: contactos.id,
          nombre: contactos.nombre,
          telefono: contactos.telefono,
          frioDesde: contactos.frioDesde,
          archivado: contactos.archivado,
        })
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
          segsHoy.push({
            id: c.id,
            titulo: c.nombre,
            detalle,
            href,
            urgente: vencido,
            orden: e.proxima.getTime(),
            accion: {
              contactoId: c.id,
              whatsapp: numeroWhatsApp(c.telefono),
              mensaje: "",
              avisoFinal: false,
              version: null,
              propiedades: [],
            },
          });
        }
      }
    }
    await completarAcciones(yo, segsHoy, porContacto, ahora);
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
    captaciones: await captacionesDelDia(yo, finHoy),
    moneyDay: await recordatorioMoneyDay(yo),
    seguimientos: segsHoy.sort((a, b) => a.orden - b.orden),
    hoy: hoy.sort((a, b) => a.orden - b.orden),
    agendaVencida,
    quietas,
  };
}

/**
 * Para cada seguimiento del día: sus propiedades activas, las visitas desde
 * el último contacto y el mensaje sugerido (misma lógica que el
 * "Seguimiento del lunes" del Pipeline, incluido el aviso final).
 */
async function completarAcciones(
  yo: string,
  items: ItemSeguimiento[],
  historial: Map<string, SeguimientoMin[]>,
  ahora: Date
) {
  if (items.length === 0) return;
  const ids = items.map((i) => i.accion.contactoId);
  const [props, plantillas, datos, cs] = await Promise.all([
    db
      .select({
        id: propiedades.id,
        codigo: propiedades.codigo,
        titulo: propiedades.titulo,
        precio: propiedades.precio,
        moneda: propiedades.moneda,
        duenoId: propiedades.duenoId,
      })
      .from(propiedades)
      .where(and(eq(propiedades.agenteId, yo), eq(propiedades.estado, "ACTIVA"), inArray(propiedades.duenoId, ids))),
    listarPlantillas(),
    datosParaWhatsApp(),
    db
      .select({ id: contactos.id, nombre: contactos.nombre, frioDesde: contactos.frioDesde })
      .from(contactos)
      .where(inArray(contactos.id, ids)),
  ]);
  const vis = props.length
    ? await db
        .select({ propiedadId: visitas.propiedadId, fecha: visitas.fecha })
        .from(visitas)
        .where(and(inArray(visitas.propiedadId, props.map((p) => p.id)), ne(visitas.estado, "CANCELADA")))
    : [];
  const versiones = versionesSeguimientoSemanal(plantillas);
  const hoy0 = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();

  for (const it of items) {
    const c = cs.find((x) => x.id === it.accion.contactoId);
    if (!c) continue;
    const segs = historial.get(c.id) ?? [];
    const suyas = props.filter((p) => p.duenoId === c.id);
    const ultimo = Math.max(0, ...segs.map((s) => s.fecha.getTime()));
    const visitasDesde = vis.filter(
      (v) => suyas.some((p) => p.id === v.propiedadId) && v.fecha.getTime() >= ultimo && v.fecha.getTime() < hoy0
    ).length;
    const titulos = suyas.map((p) => ({ codigo: p.codigo, titulo: limpiarTitulo(p.titulo) }));
    const m = mensajeSeguimientoSemanal({
      nombre: c.nombre,
      agente: datos.agente,
      inmobiliaria: datos.inmobiliaria,
      propiedades: titulos,
      visitas: visitasDesde,
      estado: estadoSeguimiento(segs, c.frioDesde, ahora),
      fechasPrevias: segs.map((s) => s.fecha),
      versiones,
      ahora,
    });
    it.accion = {
      ...it.accion,
      ...m,
      propiedades: suyas.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        titulo: limpiarTitulo(p.titulo),
        precio: p.precio,
        moneda: p.moneda,
      })),
    };
  }
}

/**
 * Captaciones que piden algo hoy: primer contacto y sus seguimientos (48 hs),
 * S8/S12 cuando llega la fecha del seguimiento, el fin de un S8 y lo que está
 * en Tasando. Las más urgentes (menos de 12 hs para borrarse) primero.
 */
async function captacionesDelDia(yo: string, finHoy: Date): Promise<ItemPlan[]> {
  let filas;
  try {
    await vincularTasacionesSolas(yo).catch(() => 0);
    filas = await db
      .select({
        id: captaciones.id,
        titulo: captaciones.titulo,
        etapa: captaciones.etapa,
        etapaDesde: captaciones.etapaDesde,
        intentoEn: captaciones.intentoEn,
        seguimientosHechos: captaciones.seguimientosHechos,
        ultimoSeguimiento: captaciones.ultimoSeguimiento,
        plazoExtendido: captaciones.plazoExtendido,
        tasacionId: captaciones.tasacionId,
        convertida: captaciones.convertidaEnPropiedadId,
        contacto: contactos.nombre,
      })
      .from(captaciones)
      .innerJoin(contactos, eq(captaciones.contactoId, contactos.id))
      .where(eq(captaciones.agenteId, yo));
  } catch {
    return []; // columnas nuevas todavía no migradas
  }
  const ahora = new Date();
  const items: (ItemPlan & { horas: number })[] = [];
  for (const c of filas) {
    if (c.convertida) continue;
    const etapa = c.etapa as Etapa;
    const plazo = calcularPlazo(c);
    if (!plazo.vence) continue;
    const horas = horasRestantes(plazo.vence, ahora);
    const borra = `se borra ${faltaTexto(plazo.vence, ahora)}`;
    let detalle: string | null = null;
    if (ETAPAS_CONTACTO.includes(etapa)) {
      detalle = plazo.contactado
        ? `${ETAPA_LABEL[etapa]}: marcá qué pasó · ${borra}`
        : `${ETAPA_LABEL[etapa]}: llamalo o escribile · ${borra}`;
    } else if (etapa === "S8" || etapa === "S12") {
      if (plazo.cicloTerminado) detalle = `Terminó el S8: pasalo a S12 · ${borra}`;
      else if (plazo.proximo && plazo.proximo < finHoy)
        detalle = `${ETAPA_LABEL[etapa]}: toca el seguimiento ${c.seguimientosHechos + 1} de ${CICLOS[etapa].total} · ${borra}`;
    } else if (etapa === "TASANDO") {
      detalle = `${
        c.tasacionId
          ? "Tasación hecha: marcá en la tarjeta si la entregaste y si autorizó"
          : "Hacé la tasación (o vinculá una ya hecha en la tarjeta)"
      } · ${borra}`;
    }
    if (!detalle) continue;
    items.push({
      id: `cap-${c.id}`,
      titulo: `🚀 ${c.titulo} · ${c.contacto}`,
      detalle,
      href: `/captaciones#cap-${c.id}`,
      urgente: horas < 12,
      horas,
    });
  }
  items.sort((a, b) => a.horas - b.horas);
  return items.map((it) => ({ id: it.id, titulo: it.titulo, detalle: it.detalle, href: it.href, urgente: it.urgente }));
}

/**
 * Money Day: el último día del mes recuerda cerrar el mes; los primeros 7
 * días, si el mes anterior tuvo movimientos y no se cerró, avisa que quedó
 * pendiente. Solo dice que toca, nunca muestra montos (Mis finanzas es privado).
 */
async function recordatorioMoneyDay(yo: string): Promise<ItemPlan | null> {
  try {
    const hoy = hoyUY();
    if (hoy.ultimoDia) {
      const f = await filaMes(yo, hoy.mes);
      if (f?.cerradoEn) return null;
      return {
        id: "money-day",
        titulo: "💵 Hoy es tu Money Day",
        detalle: `Cerrá ${mesLabel(hoy.mes)} y planeá ${mesLabel(mesSiguiente(hoy.mes))} (10 minutos).`,
        href: "/finanzas/money-day",
      };
    }
    if (hoy.dia <= 7) {
      const ant = mesAnterior(hoy.mes);
      const [f, movs] = await Promise.all([filaMes(yo, ant), movimientosDelMes(yo, ant)]);
      if (f?.cerradoEn || movs.length === 0) return null;
      return {
        id: "money-day",
        titulo: "💵 Te quedó pendiente el Money Day",
        detalle: `Cerrá ${mesLabel(ant)} y planeá ${mesLabel(hoy.mes)}.`,
        href: "/finanzas/money-day",
      };
    }
  } catch {
    // tablas de finanzas todavía no creadas
  }
  return null;
}
