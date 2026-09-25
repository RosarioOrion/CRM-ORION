import { and, eq, gt, lte, ne, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  visitas,
  actividades,
  propiedades,
  contactos,
  pushEnviados,
  pushSuscripciones,
} from "@/db/schema";
import { ahoraUY, TIPO_EVENTO_ICONO, TIPO_EVENTO_LABEL, esTipoEvento } from "@/lib/calendario";
import { limpiarTitulo } from "@/lib/propiedades";
import { enviarAUsuarios } from "@/lib/push";

/** Con cuánta anticipación se avisa. */
export const MINUTOS_ANTES = 60;

const hhmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/**
 * Busca lo que empieza dentro de la próxima hora y todavía no se avisó, y
 * manda el recordatorio al celular de quien corresponda. Se ejecuta cada
 * minuto desde src/instrumentation.ts.
 */
export async function revisarRecordatorios() {
  // Si nadie activó los recordatorios, no hay nada que hacer.
  const [haySubs] = await db.select({ id: pushSuscripciones.id }).from(pushSuscripciones).limit(1);
  if (!haySubs) return;

  const ahora = ahoraUY();
  const hasta = new Date(ahora.getTime() + MINUTOS_ANTES * 60000);

  type Pendiente = {
    clave: string;
    destinatarios: string[] | "todos";
    fecha: Date;
    title: string;
    body: string;
  };
  const pendientes: Pendiente[] = [];

  const vs = await db
    .select({
      id: visitas.id,
      agenteId: visitas.agenteId,
      fecha: visitas.fecha,
      propiedadCodigo: propiedades.codigo,
      propiedadTitulo: propiedades.titulo,
      contactoNombre: contactos.nombre,
    })
    .from(visitas)
    .innerJoin(propiedades, eq(visitas.propiedadId, propiedades.id))
    .innerJoin(contactos, eq(visitas.contactoId, contactos.id))
    .where(and(eq(visitas.estado, "PROGRAMADA"), gt(visitas.fecha, ahora), lte(visitas.fecha, hasta)));

  for (const v of vs) {
    pendientes.push({
      clave: `v:${v.id}:${v.fecha.getTime()}`,
      destinatarios: [v.agenteId],
      fecha: v.fecha,
      title: `🏠 Visita a las ${hhmm(v.fecha)}`,
      body: `${v.propiedadCodigo} — ${limpiarTitulo(v.propiedadTitulo)} · 👤 ${v.contactoNombre}`,
    });
  }

  const as = await db
    .select({
      id: actividades.id,
      agenteId: actividades.agenteId,
      tipo: actividades.tipo,
      titulo: actividades.titulo,
      fecha: actividades.fecha,
      lugar: actividades.lugar,
    })
    .from(actividades)
    .where(
      and(
        ne(actividades.estado, "CANCELADA"),
        ne(actividades.estado, "REALIZADA"),
        gt(actividades.fecha, ahora),
        lte(actividades.fecha, hasta)
      )
    );

  for (const a of as) {
    const tipo = esTipoEvento(a.tipo) ? a.tipo : "OTRO";
    pendientes.push({
      clave: `a:${a.id}:${a.fecha.getTime()}`,
      destinatarios: tipo === "REUNION_EQUIPO" ? "todos" : [a.agenteId],
      fecha: a.fecha,
      title: `${TIPO_EVENTO_ICONO[tipo]} ${TIPO_EVENTO_LABEL[tipo]} a las ${hhmm(a.fecha)}`,
      body: `${a.titulo}${a.lugar ? ` · 📍 ${a.lugar}` : ""}`,
    });
  }

  if (pendientes.length === 0) return;

  // Descartar los que ya se avisaron. La clave incluye la fecha, así si se
  // reprograma una actividad se vuelve a avisar para el nuevo horario.
  const ya = await db
    .select({ clave: pushEnviados.clave })
    .from(pushEnviados)
    .where(inArray(pushEnviados.clave, pendientes.map((p) => p.clave)));
  const yaEnviadas = new Set(ya.map((y) => y.clave));

  let todos: string[] | null = null;
  for (const p of pendientes) {
    if (yaEnviadas.has(p.clave)) continue;

    // Se marca antes de enviar: si algo falla, preferimos no repetir avisos.
    const insertadas = await db
      .insert(pushEnviados)
      .values({ clave: p.clave })
      .onConflictDoNothing()
      .returning({ clave: pushEnviados.clave });
    if (insertadas.length === 0) continue;

    let ids: string[];
    if (p.destinatarios === "todos") {
      if (!todos) {
        const filas = await db
          .selectDistinct({ id: pushSuscripciones.usuarioId })
          .from(pushSuscripciones);
        todos = filas.map((f) => f.id);
      }
      ids = todos;
    } else {
      ids = p.destinatarios;
    }

    const minutos = Math.max(1, Math.round((p.fecha.getTime() - ahora.getTime()) / 60000));
    await enviarAUsuarios(ids, {
      title: p.title,
      body: `En ${minutos} min — ${p.body}`,
      url: "/agenda",
      tag: p.clave,
    });
  }
}

let iniciado = false;

/** Arranca el chequeo cada minuto (una sola vez por servidor). */
export function iniciarRecordatorios() {
  if (iniciado) return;
  iniciado = true;
  const tick = () =>
    revisarRecordatorios().catch((e) => {
      // Si las tablas todavía no existen (falta la migración), no hacer ruido.
      const msg = e instanceof Error ? e.message : String(e);
      if (!/does not exist/.test(msg)) console.error("[recordatorios]", msg);
    });
  setTimeout(tick, 15_000);
  setInterval(tick, 60_000);
}
