import { db } from "@/db";
import {
  contactos,
  propiedades,
  visitas,
  reservasVenta,
  reservasAlquiler,
  actividades,
} from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { eq, and, count, ne } from "drizzle-orm";
import { limpiarTitulo } from "@/lib/propiedades";
import { aDiaHora, esTipoEvento, type EventoCalendario } from "@/lib/calendario";
import { Calendario } from "./calendario";

async function cargarEventos(agenteId: string): Promise<EventoCalendario[]> {
  const eventos: EventoCalendario[] = [];

  // Visitas (menos las canceladas).
  const filasVisitas = await db
    .select({
      id: visitas.id,
      fecha: visitas.fecha,
      estado: visitas.estado,
      notas: visitas.notas,
      propiedadCodigo: propiedades.codigo,
      propiedadTitulo: propiedades.titulo,
      contactoNombre: contactos.nombre,
    })
    .from(visitas)
    .innerJoin(propiedades, eq(visitas.propiedadId, propiedades.id))
    .innerJoin(contactos, eq(visitas.contactoId, contactos.id))
    .where(and(eq(visitas.agenteId, agenteId), ne(visitas.estado, "CANCELADA")));

  for (const v of filasVisitas) {
    eventos.push({
      id: `v-${v.id}`,
      tipo: "VISITA",
      ...aDiaHora(v.fecha),
      titulo: `${v.propiedadCodigo} — ${limpiarTitulo(v.propiedadTitulo)}`,
      detalle: `👤 ${v.contactoNombre}${v.notas ? ` · ${v.notas}` : ""}`,
      href: "/agenda",
    });
  }

  // Firmas de reservas de venta: reserva, boleto y escritura.
  const filasVenta = await db
    .select({
      id: reservasVenta.id,
      nombre: reservasVenta.nombrePropiedad,
      fechaReserva: reservasVenta.fechaReserva,
      fechaBoleto: reservasVenta.fechaBoleto,
      fechaEscritura: reservasVenta.fechaEscritura,
      escribano: reservasVenta.escribanoVendedor,
    })
    .from(reservasVenta)
    .where(and(eq(reservasVenta.agenteId, agenteId), ne(reservasVenta.estado, "CANCELADA")));

  for (const r of filasVenta) {
    const hitos: [string, Date | null][] = [
      ["Firma de reserva", r.fechaReserva],
      ["Firma de boleto", r.fechaBoleto],
      ["Escritura", r.fechaEscritura],
    ];
    for (const [nombre, fecha] of hitos) {
      if (!fecha) continue;
      eventos.push({
        id: `rv-${r.id}-${nombre}`,
        tipo: "FIRMA",
        ...aDiaHora(fecha),
        titulo: `${nombre} — ${r.nombre}`,
        detalle: r.escribano ? `Escribano: ${r.escribano}` : "Reserva de venta",
        href: "/reservas/ventas",
      });
    }
  }

  // Firmas de reservas de alquiler: reserva y contrato.
  const filasAlquiler = await db
    .select({
      id: reservasAlquiler.id,
      nombre: reservasAlquiler.nombrePropiedad,
      fechaReserva: reservasAlquiler.fechaReserva,
      fechaFirma: reservasAlquiler.fechaFirma,
      inquilino: reservasAlquiler.inquilinoNombre,
    })
    .from(reservasAlquiler)
    .where(and(eq(reservasAlquiler.agenteId, agenteId), ne(reservasAlquiler.estado, "CANCELADA")));

  for (const r of filasAlquiler) {
    const hitos: [string, Date | null][] = [
      ["Firma de reserva (alquiler)", r.fechaReserva],
      ["Firma de contrato (alquiler)", r.fechaFirma],
    ];
    for (const [nombre, fecha] of hitos) {
      if (!fecha) continue;
      eventos.push({
        id: `ra-${r.id}-${nombre}`,
        tipo: "FIRMA",
        ...aDiaHora(fecha),
        titulo: `${nombre} — ${r.nombre}`,
        detalle: r.inquilino ? `Inquilino: ${r.inquilino}` : "Reserva de alquiler",
        href: "/reservas/alquileres",
      });
    }
  }

  // Actividades de la Agenda (reuniones, captaciones, tasaciones, firmas,
  // material gráfico...). Si la tabla aún no existe, se omiten.
  try {
    const filasAct = await db
      .select({
        id: actividades.id,
        tipo: actividades.tipo,
        titulo: actividades.titulo,
        fecha: actividades.fecha,
        lugar: actividades.lugar,
        notas: actividades.notas,
      })
      .from(actividades)
      .where(and(eq(actividades.agenteId, agenteId), ne(actividades.estado, "CANCELADA")));

    for (const a of filasAct) {
      const detalle = [a.lugar ? `📍 ${a.lugar}` : null, a.notas].filter(Boolean).join(" · ");
      eventos.push({
        id: `a-${a.id}`,
        tipo: esTipoEvento(a.tipo) ? a.tipo : "OTRO",
        ...aDiaHora(a.fecha),
        titulo: a.titulo,
        detalle: detalle || null,
        href: "/agenda",
      });
    }
  } catch {
    // tabla `actividades` todavía no migrada
  }

  return eventos;
}

export default async function DashboardPage() {
  const sesion = await obtenerSesion();

  const [{ totalContactos }] = await db
    .select({ totalContactos: count() })
    .from(contactos)
    .where(eq(contactos.agenteId, sesion!.userId));

  const [{ totalPropiedades }] = await db
    .select({ totalPropiedades: count() })
    .from(propiedades)
    .where(
      and(
        eq(propiedades.agenteId, sesion!.userId),
        eq(propiedades.estado, "ACTIVA")
      )
    );

  const eventos = await cargarEventos(sesion!.userId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-orion-navy">
        Hola, {sesion?.nombre?.split(" ")[0]} 👋
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Tocá un día del calendario para ver lo que tenés agendado.
      </p>

      <div className="mt-6">
        <Calendario eventos={eventos} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Mis contactos
          </p>
          <p className="mt-2 text-3xl font-bold text-orion-navy">
            {totalContactos}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Propiedades activas
          </p>
          <p className="mt-2 text-3xl font-bold text-orion-navy">
            {totalPropiedades}
          </p>
        </div>
      </div>

    </div>
  );
}
