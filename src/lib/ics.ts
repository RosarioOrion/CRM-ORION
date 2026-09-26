import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, gte, inArray, ne, or } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  actividades,
  contactos,
  propiedades,
  reservasAlquiler,
  reservasVenta,
  usuarios,
  visitas,
} from "@/db/schema";
import { TIPO_EVENTO_ICONO, TIPO_EVENTO_LABEL, esTipoEvento, ahoraUY } from "@/lib/calendario";
import { limpiarTitulo } from "@/lib/propiedades";
import {
  ZONA_UY,
  aFechaCompacta,
  aFechaHoraCompacta,
  diaSiguiente,
  esTodoElDia,
} from "@/lib/gcal";

// ─── Enlace privado de suscripción ─────────────────────────────────────────
// El enlace lleva el id del usuario + una firma. La firma depende también de
// la contraseña: si el agente cambia su contraseña, el enlace viejo deja de
// funcionar (sirve para "cortar" un enlace que se compartió por error).

const secreto = process.env.AUTH_SECRET || "dev-secret-change-me";

function firmar(usuarioId: string, passwordHash: string) {
  return createHmac("sha256", secreto)
    .update(`ics:${usuarioId}:${passwordHash}`)
    .digest("base64url")
    .slice(0, 32);
}

export async function tokenCalendario(usuarioId: string): Promise<string | null> {
  const [u] = await db
    .select({ passwordHash: usuarios.passwordHash })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId));
  if (!u) return null;
  return `${usuarioId}.${firmar(usuarioId, u.passwordHash)}`;
}

/** Enlace completo de suscripción del usuario (para mostrar en pantalla). */
export async function urlCalendario(usuarioId: string): Promise<string | null> {
  const token = await tokenCalendario(usuarioId);
  if (!token) return null;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/api/calendario/${token}.ics`;
}

/** Devuelve el id del usuario si el token es válido (y la cuenta está activa). */
export async function verificarTokenCalendario(token: string): Promise<string | null> {
  const punto = token.lastIndexOf(".");
  if (punto <= 0) return null;
  const usuarioId = token.slice(0, punto);
  const firma = token.slice(punto + 1);
  const [u] = await db
    .select({ passwordHash: usuarios.passwordHash, activo: usuarios.activo, aprobado: usuarios.aprobado })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId));
  if (!u || !u.activo || !u.aprobado) return null;
  const esperada = Buffer.from(firmar(usuarioId, u.passwordHash));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
  return usuarioId;
}

// ─── Archivo .ics ──────────────────────────────────────────────────────────

type EventoIcs = {
  uid: string;
  titulo: string;
  fecha: Date;
  duracionMin: number | null;
  lugar: string | null;
  descripcion: string | null;
  realizado?: boolean;
};

const escapar = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Las líneas del .ics no pueden pasar de 75 bytes: se cortan y siguen con un espacio. */
function plegar(linea: string): string {
  const partes: string[] = [];
  let actual = "";
  let bytes = 0;
  for (const ch of linea) {
    const b = Buffer.byteLength(ch);
    const limite = partes.length === 0 ? 75 : 74;
    if (bytes + b > limite) {
      partes.push(actual);
      actual = "";
      bytes = 0;
    }
    actual += ch;
    bytes += b;
  }
  partes.push(actual);
  return partes.join("\r\n ");
}

function aUtc(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function armarIcs(nombre: string, eventos: EventoIcs[]): string {
  const ahora = aUtc(new Date());
  const l: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Orion Propiedades//Agenda//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapar(`Orion — ${nombre}`)}`,
    `X-WR-TIMEZONE:${ZONA_UY}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    // Uruguay: UTC-3 todo el año (sin horario de verano desde 2015).
    "BEGIN:VTIMEZONE",
    `TZID:${ZONA_UY}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0300",
    "TZOFFSETTO:-0300",
    "TZNAME:-03",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  for (const e of eventos) {
    l.push("BEGIN:VEVENT", `UID:${e.uid}@orion`, `DTSTAMP:${ahora}`);
    if (esTodoElDia(e.fecha, e.duracionMin)) {
      l.push(
        `DTSTART;VALUE=DATE:${aFechaCompacta(e.fecha)}`,
        `DTEND;VALUE=DATE:${aFechaCompacta(diaSiguiente(e.fecha))}`
      );
    } else {
      const fin = new Date(e.fecha.getTime() + (e.duracionMin || 60) * 60000);
      l.push(
        `DTSTART;TZID=${ZONA_UY}:${aFechaHoraCompacta(e.fecha)}`,
        `DTEND;TZID=${ZONA_UY}:${aFechaHoraCompacta(fin)}`
      );
    }
    l.push(`SUMMARY:${escapar(e.realizado ? `✓ ${e.titulo}` : e.titulo)}`);
    if (e.lugar) l.push(`LOCATION:${escapar(e.lugar)}`);
    if (e.descripcion) l.push(`DESCRIPTION:${escapar(e.descripcion)}`);
    l.push("END:VEVENT");
  }
  l.push("END:VCALENDAR");
  return l.map(plegar).join("\r\n") + "\r\n";
}

/** Arma el calendario .ics con todo lo agendado del usuario. */
export async function calendarioIcs(usuarioId: string, urlAgenda: string): Promise<string> {
  const [u] = await db
    .select({ nombre: usuarios.nombre })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId));

  // Desde 60 días atrás en adelante (para no mandar años de historial).
  const desde = new Date(ahoraUY().getTime() - 60 * 24 * 3600 * 1000);
  const eventos: EventoIcs[] = [];
  const pie = `\n\nVer en Orion: ${urlAgenda}`;

  // Visitas a propiedad
  const vs = await db
    .select({
      id: visitas.id,
      fecha: visitas.fecha,
      duracionMin: visitas.duracionMin,
      estado: visitas.estado,
      notas: visitas.notas,
      codigo: propiedades.codigo,
      titulo: propiedades.titulo,
      direccion: propiedades.direccion,
      zona: propiedades.zona,
      contacto: contactos.nombre,
      telefono: contactos.telefono,
    })
    .from(visitas)
    .innerJoin(propiedades, eq(visitas.propiedadId, propiedades.id))
    .innerJoin(contactos, eq(visitas.contactoId, contactos.id))
    .where(
      and(
        eq(visitas.agenteId, usuarioId),
        ne(visitas.estado, "CANCELADA"),
        gte(visitas.fecha, desde)
      )
    );
  for (const v of vs) {
    eventos.push({
      uid: `v-${v.id}`,
      titulo: `🏠 Visita: ${v.codigo} — ${limpiarTitulo(v.titulo)}`,
      fecha: v.fecha,
      duracionMin: v.duracionMin,
      lugar: [v.direccion, v.zona].filter(Boolean).join(", ") || null,
      descripcion:
        [`Cliente: ${v.contacto}${v.telefono ? ` · ${v.telefono}` : ""}`, v.notas]
          .filter(Boolean)
          .join("\n") + pie,
      realizado: v.estado === "REALIZADA",
    });
  }

  // Actividades (propias + reuniones de equipo de cualquiera)
  try {
    const as = await db
      .select({
        id: actividades.id,
        tipo: actividades.tipo,
        titulo: actividades.titulo,
        fecha: actividades.fecha,
        duracionMin: actividades.duracionMin,
        lugar: actividades.lugar,
        notas: actividades.notas,
        estado: actividades.estado,
        contactoId: actividades.contactoId,
      })
      .from(actividades)
      .where(
        and(
          or(eq(actividades.agenteId, usuarioId), eq(actividades.tipo, "REUNION_EQUIPO")),
          ne(actividades.estado, "CANCELADA"),
          gte(actividades.fecha, desde)
        )
      );

    const idsCont = [...new Set(as.map((a) => a.contactoId).filter(Boolean))] as string[];
    const contPorId = new Map<string, string>();
    if (idsCont.length > 0) {
      const cs = await db
        .select({ id: contactos.id, nombre: contactos.nombre, telefono: contactos.telefono })
        .from(contactos)
        .where(inArray(contactos.id, idsCont));
      for (const c of cs) contPorId.set(c.id, `${c.nombre}${c.telefono ? ` · ${c.telefono}` : ""}`);
    }

    for (const a of as) {
      const tipo = esTipoEvento(a.tipo) ? a.tipo : "OTRO";
      const contacto = a.contactoId ? contPorId.get(a.contactoId) : null;
      eventos.push({
        uid: `a-${a.id}`,
        titulo: `${TIPO_EVENTO_ICONO[tipo]} ${a.titulo}`,
        fecha: a.fecha,
        duracionMin: a.duracionMin,
        lugar: a.lugar,
        descripcion:
          [TIPO_EVENTO_LABEL[tipo], contacto ? `Contacto: ${contacto}` : null, a.notas]
            .filter(Boolean)
            .join("\n") + pie,
        realizado: a.estado === "REALIZADA",
      });
    }
  } catch {
    // tabla `actividades` todavía no migrada
  }

  // Firmas de reservas de venta
  const rv = await db
    .select({
      id: reservasVenta.id,
      nombre: reservasVenta.nombrePropiedad,
      fechaReserva: reservasVenta.fechaReserva,
      fechaBoleto: reservasVenta.fechaBoleto,
      fechaEscritura: reservasVenta.fechaEscritura,
      escribano: reservasVenta.escribanoVendedor,
    })
    .from(reservasVenta)
    .where(and(eq(reservasVenta.agenteId, usuarioId), ne(reservasVenta.estado, "CANCELADA")));
  for (const r of rv) {
    const hitos: [string, string, Date | null][] = [
      ["reserva", "Firma de reserva", r.fechaReserva],
      ["boleto", "Firma de boleto", r.fechaBoleto],
      ["escritura", "Escritura", r.fechaEscritura],
    ];
    for (const [clave, nombre, fecha] of hitos) {
      if (!fecha || fecha < desde) continue;
      eventos.push({
        uid: `rv-${r.id}-${clave}`,
        titulo: `✍️ ${nombre} — ${r.nombre}`,
        fecha,
        duracionMin: null,
        lugar: null,
        descripcion: (r.escribano ? `Escribano: ${r.escribano}` : "Reserva de venta") + pie,
      });
    }
  }

  // Firmas de reservas de alquiler
  const ra = await db
    .select({
      id: reservasAlquiler.id,
      nombre: reservasAlquiler.nombrePropiedad,
      fechaReserva: reservasAlquiler.fechaReserva,
      fechaFirma: reservasAlquiler.fechaFirma,
      inquilino: reservasAlquiler.inquilinoNombre,
    })
    .from(reservasAlquiler)
    .where(and(eq(reservasAlquiler.agenteId, usuarioId), ne(reservasAlquiler.estado, "CANCELADA")));
  for (const r of ra) {
    const hitos: [string, string, Date | null][] = [
      ["reserva", "Firma de reserva (alquiler)", r.fechaReserva],
      ["contrato", "Firma de contrato (alquiler)", r.fechaFirma],
    ];
    for (const [clave, nombre, fecha] of hitos) {
      if (!fecha || fecha < desde) continue;
      eventos.push({
        uid: `ra-${r.id}-${clave}`,
        titulo: `✍️ ${nombre} — ${r.nombre}`,
        fecha,
        duracionMin: null,
        lugar: null,
        descripcion: (r.inquilino ? `Inquilino: ${r.inquilino}` : "Reserva de alquiler") + pie,
      });
    }
  }

  return armarIcs(u?.nombre ?? "Agenda", eventos);
}
