import { db } from "@/db";
import {
  contactos,
  propiedades,
  visitas,
  reservasVenta,
  reservasAlquiler,
  actividades,
  usuarios,
} from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { eq, and, count, ne, inArray, or } from "drizzle-orm";
import { limpiarTitulo } from "@/lib/propiedades";
import { aDiaHora, esTipoEvento, type EventoCalendario } from "@/lib/calendario";
import { Calendario } from "./calendario";
import { SelectorAgente } from "../agenda/selector-agente";

/**
 * Todo lo agendado de los agentes `ids` (normalmente solo el usuario; el
 * Team Leader puede ver a otro agente o a todo el equipo). Las reuniones de
 * equipo se muestran siempre, las haya agendado quien sea.
 */
async function cargarEventos(
  ids: string[],
  yo: string,
  nombres: Map<string, string>
): Promise<EventoCalendario[]> {
  const eventos: EventoCalendario[] = [];
  const quien = (id: string) => (id === yo ? undefined : nombres.get(id) ?? "Otro agente");

  // Visitas (menos las canceladas).
  const filasVisitas = await db
    .select({
      id: visitas.id,
      agenteId: visitas.agenteId,
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
    .where(and(inArray(visitas.agenteId, ids), ne(visitas.estado, "CANCELADA")));

  for (const v of filasVisitas) {
    eventos.push({
      id: `v-${v.id}`,
      tipo: "VISITA",
      ...aDiaHora(v.fecha),
      titulo: `${v.propiedadCodigo} — ${limpiarTitulo(v.propiedadTitulo)}`,
      detalle: `👤 ${v.contactoNombre}${v.notas ? ` · ${v.notas}` : ""}`,
      href: "/agenda",
      agente: quien(v.agenteId),
    });
  }

  // Firmas de reservas de venta: reserva, boleto y escritura.
  const filasVenta = await db
    .select({
      id: reservasVenta.id,
      agenteId: reservasVenta.agenteId,
      nombre: reservasVenta.nombrePropiedad,
      fechaReserva: reservasVenta.fechaReserva,
      fechaBoleto: reservasVenta.fechaBoleto,
      fechaEscritura: reservasVenta.fechaEscritura,
      escribano: reservasVenta.escribanoVendedor,
    })
    .from(reservasVenta)
    .where(and(inArray(reservasVenta.agenteId, ids), ne(reservasVenta.estado, "CANCELADA")));

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
        agente: quien(r.agenteId),
      });
    }
  }

  // Firmas de reservas de alquiler: reserva y contrato.
  const filasAlquiler = await db
    .select({
      id: reservasAlquiler.id,
      agenteId: reservasAlquiler.agenteId,
      nombre: reservasAlquiler.nombrePropiedad,
      fechaReserva: reservasAlquiler.fechaReserva,
      fechaFirma: reservasAlquiler.fechaFirma,
      inquilino: reservasAlquiler.inquilinoNombre,
    })
    .from(reservasAlquiler)
    .where(and(inArray(reservasAlquiler.agenteId, ids), ne(reservasAlquiler.estado, "CANCELADA")));

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
        agente: quien(r.agenteId),
      });
    }
  }

  // Actividades de la Agenda (reuniones, captaciones, tasaciones, firmas,
  // material gráfico...). Si la tabla aún no existe, se omiten.
  try {
    const filasAct = await db
      .select({
        id: actividades.id,
        agenteId: actividades.agenteId,
        tipo: actividades.tipo,
        titulo: actividades.titulo,
        fecha: actividades.fecha,
        lugar: actividades.lugar,
        notas: actividades.notas,
      })
      .from(actividades)
      .where(
        and(
          or(inArray(actividades.agenteId, ids), eq(actividades.tipo, "REUNION_EQUIPO")),
          ne(actividades.estado, "CANCELADA")
        )
      );

    for (const a of filasAct) {
      const detalle = [a.lugar ? `📍 ${a.lugar}` : null, a.notas].filter(Boolean).join(" · ");
      eventos.push({
        id: `a-${a.id}`,
        tipo: esTipoEvento(a.tipo) ? a.tipo : "OTRO",
        ...aDiaHora(a.fecha),
        titulo: a.titulo,
        detalle: detalle || null,
        href: "/agenda",
        agente: quien(a.agenteId),
      });
    }
  } catch {
    // tabla `actividades` todavía no migrada
  }

  return eventos;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ agente?: string }>;
}) {
  const sesion = await obtenerSesion();
  const yo = sesion!.userId;
  const jefe = esAdmin(sesion!.rol);
  const { agente: agenteParam } = await searchParams;

  // Nombres de todo el equipo (para "Organiza: X" y la vista del equipo).
  const equipo = await db
    .select({ id: usuarios.id, nombre: usuarios.nombre, activo: usuarios.activo, aprobado: usuarios.aprobado })
    .from(usuarios)
    .orderBy(usuarios.nombre);
  const nombres = new Map(equipo.map((u) => [u.id, u.nombre]));
  const activos = equipo.filter((u) => u.activo && u.aprobado);

  let ids = [yo];
  let vista = "yo";
  if (jefe && agenteParam === "todos") {
    ids = activos.map((u) => u.id);
    vista = "todos";
  } else if (jefe && agenteParam && activos.some((u) => u.id === agenteParam)) {
    ids = [agenteParam];
    vista = agenteParam;
  }

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

  const eventos = await cargarEventos(ids, yo, nombres);

  return (
    <div>
      <h1 className="text-2xl font-bold text-orion-navy">
        Hola, {sesion?.nombre?.split(" ")[0]} 👋
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Tocá un día del calendario para ver lo que tenés agendado.
      </p>
      {jefe && (
        <div className="mt-3">
          <SelectorAgente
            valor={vista}
            agentes={activos.filter((u) => u.id !== yo).map((u) => ({ id: u.id, nombre: u.nombre }))}
          />
        </div>
      )}

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
