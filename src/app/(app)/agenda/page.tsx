import Link from "next/link";
import { db } from "@/db";
import { visitas, propiedades, contactos, actividades } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { eq, and, asc } from "drizzle-orm";
import { limpiarTitulo } from "@/lib/propiedades";
import {
  ESTADO_VISITA_LABEL,
  ESTADO_VISITA_COLOR,
  baldeFecha,
  type EstadoVisita,
} from "@/lib/visitas";
import {
  TIPO_EVENTO_LABEL,
  TIPO_EVENTO_ICONO,
  TIPO_EVENTO_ETIQUETA,
  ESTADO_ACTIVIDAD_LABEL,
  esTipoEvento,
  ahoraUY,
  aInputFechaHora,
  textoDuracion,
  DURACION_POR_DEFECTO,
  type TipoEvento,
  type EstadoActividad,
} from "@/lib/calendario";
import { AgendarForm } from "./agendar-form";
import { AccionesVisita } from "./acciones-visita";
import { AccionesActividad } from "./acciones-actividad";
import { TarjetaEditable } from "./tarjeta-editable";

const ORDEN_BALDES = ["Vencidas", "Hoy", "Mañana", "Esta semana", "Más adelante"];

// Un ítem de la agenda: o una visita a propiedad (tabla `visitas`) o una
// actividad (tabla `actividades`). Se muestran juntos, ordenados por fecha.
type Item =
  | {
      clase: "visita";
      id: string;
      tipo: TipoEvento;
      fecha: Date;
      duracionMin: number | null;
      estado: EstadoVisita;
      pendiente: boolean;
      notas: string | null;
      resultado: string | null;
      propiedadId: string;
      propiedadTexto: string;
      contactoId: string;
      contactoTexto: string;
      lugar: null;
    }
  | {
      clase: "actividad";
      id: string;
      tipo: TipoEvento;
      titulo: string;
      fecha: Date;
      duracionMin: number | null;
      estado: EstadoActividad;
      pendiente: boolean;
      notas: string | null;
      resultado: string | null;
      propiedadId: string | null;
      propiedadTexto: string | null;
      contactoId: string | null;
      contactoTexto: string | null;
      lugar: string | null;
    };

const COLOR_ESTADO_ACTIVIDAD: Record<EstadoActividad, string> = {
  PENDIENTE: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  REALIZADA: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  CANCELADA: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const sesion = await obtenerSesion();
  const agenteId = sesion!.userId;
  const ahora = ahoraUY();

  // "+ Agendar este día" desde el calendario de Inicio → /agenda?fecha=YYYY-MM-DD
  const { fecha: fechaParam } = await searchParams;
  const fechaInicial =
    fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam) ? `${fechaParam}T09:00` : undefined;

  const misPropiedades = await db
    .select({ id: propiedades.id, codigo: propiedades.codigo, titulo: propiedades.titulo })
    .from(propiedades)
    .where(and(eq(propiedades.agenteId, agenteId), eq(propiedades.estado, "ACTIVA")))
    .orderBy(propiedades.codigo);

  const misContactos = await db
    .select({ id: contactos.id, nombre: contactos.nombre })
    .from(contactos)
    .where(eq(contactos.agenteId, agenteId))
    .orderBy(contactos.nombre);

  const filasVisitas = await db
    .select({
      id: visitas.id,
      fecha: visitas.fecha,
      duracionMin: visitas.duracionMin,
      estado: visitas.estado,
      notas: visitas.notas,
      resultado: visitas.resultado,
      propiedadId: propiedades.id,
      propiedadCodigo: propiedades.codigo,
      propiedadTitulo: propiedades.titulo,
      contactoId: contactos.id,
      contactoNombre: contactos.nombre,
      contactoTelefono: contactos.telefono,
    })
    .from(visitas)
    .innerJoin(propiedades, eq(visitas.propiedadId, propiedades.id))
    .innerJoin(contactos, eq(visitas.contactoId, contactos.id))
    .where(eq(visitas.agenteId, agenteId))
    .orderBy(asc(visitas.fecha));

  // Si la tabla `actividades` todavía no existe (falta correr la migración),
  // la Agenda sigue funcionando solo con visitas.
  let filasActividades: {
    id: string;
    tipo: string;
    titulo: string;
    fecha: Date;
    duracionMin: number | null;
    lugar: string | null;
    notas: string | null;
    resultado: string | null;
    estado: string;
    propiedadId: string | null;
    contactoId: string | null;
  }[] = [];
  let faltaMigracion = false;
  try {
    filasActividades = await db
      .select({
        id: actividades.id,
        tipo: actividades.tipo,
        titulo: actividades.titulo,
        fecha: actividades.fecha,
        duracionMin: actividades.duracionMin,
        lugar: actividades.lugar,
        notas: actividades.notas,
        resultado: actividades.resultado,
        estado: actividades.estado,
        propiedadId: actividades.propiedadId,
        contactoId: actividades.contactoId,
      })
      .from(actividades)
      .where(eq(actividades.agenteId, agenteId))
      .orderBy(asc(actividades.fecha));
  } catch {
    faltaMigracion = true;
  }

  // Nombres de propiedades/contactos vinculados a actividades.
  const propPorId = new Map<string, string>();
  const contPorId = new Map<string, string>();
  if (filasActividades.some((a) => a.propiedadId)) {
    const ps = await db
      .select({ id: propiedades.id, codigo: propiedades.codigo, titulo: propiedades.titulo })
      .from(propiedades)
      .where(eq(propiedades.agenteId, agenteId));
    for (const p of ps) propPorId.set(p.id, `${p.codigo} — ${limpiarTitulo(p.titulo)}`);
  }
  if (filasActividades.some((a) => a.contactoId)) {
    const cs = await db
      .select({ id: contactos.id, nombre: contactos.nombre, telefono: contactos.telefono })
      .from(contactos)
      .where(eq(contactos.agenteId, agenteId));
    for (const c of cs) contPorId.set(c.id, `${c.nombre}${c.telefono ? ` · ${c.telefono}` : ""}`);
  }

  const items: Item[] = [
    ...filasVisitas.map(
      (v): Item => ({
        clase: "visita",
        id: v.id,
        tipo: "VISITA",
        fecha: v.fecha,
        duracionMin: v.duracionMin,
        estado: v.estado,
        pendiente: v.estado === "PROGRAMADA",
        notas: v.notas,
        resultado: v.resultado,
        propiedadId: v.propiedadId,
        propiedadTexto: `${v.propiedadCodigo} — ${limpiarTitulo(v.propiedadTitulo)}`,
        contactoId: v.contactoId,
        contactoTexto: `${v.contactoNombre}${v.contactoTelefono ? ` · ${v.contactoTelefono}` : ""}`,
        lugar: null,
      })
    ),
    ...filasActividades.map(
      (a): Item => ({
        clase: "actividad",
        id: a.id,
        tipo: esTipoEvento(a.tipo) ? a.tipo : "OTRO",
        titulo: a.titulo,
        fecha: a.fecha,
        duracionMin: a.duracionMin,
        estado: (a.estado as EstadoActividad) ?? "PENDIENTE",
        pendiente: a.estado === "PENDIENTE",
        notas: a.notas,
        resultado: a.resultado,
        propiedadId: a.propiedadId,
        propiedadTexto: a.propiedadId ? propPorId.get(a.propiedadId) ?? null : null,
        contactoId: a.contactoId,
        contactoTexto: a.contactoId ? contPorId.get(a.contactoId) ?? null : null,
        lugar: a.lugar,
      })
    ),
  ];

  const pendientes = items
    .filter((i) => i.pendiente)
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  const resueltas = items
    .filter((i) => !i.pendiente)
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  const finDe = (i: Item) =>
    i.fecha.getTime() + (i.duracionMin ?? DURACION_POR_DEFECTO) * 60000;
  const nombreDe = (i: Item) =>
    i.clase === "actividad" ? i.titulo : i.propiedadTexto ?? TIPO_EVENTO_LABEL[i.tipo];

  // Vencida: estaba pendiente y ya terminó (según la hora de Uruguay).
  const vencidas = new Set(
    pendientes.filter((i) => finDe(i) < ahora.getTime()).map((i) => `${i.clase}-${i.id}`)
  );

  // Superposiciones entre pendientes (si no tiene duración se asume 1 hora).
  const superpuestas = new Map<string, string[]>();
  for (let a = 0; a < pendientes.length; a++) {
    for (let b = a + 1; b < pendientes.length; b++) {
      const x = pendientes[a];
      const y = pendientes[b];
      if (y.fecha.getTime() >= finDe(x)) break; // ordenadas por fecha
      const kx = `${x.clase}-${x.id}`;
      const ky = `${y.clase}-${y.id}`;
      superpuestas.set(kx, [...(superpuestas.get(kx) ?? []), nombreDe(y)]);
      superpuestas.set(ky, [...(superpuestas.get(ky) ?? []), nombreDe(x)]);
    }
  }

  const grupos = new Map<string, Item[]>();
  for (const f of pendientes) {
    const balde = vencidas.has(`${f.clase}-${f.id}`)
      ? "Vencidas"
      : baldeFecha(f.fecha, ahora) === "Pasadas"
        ? "Hoy"
        : baldeFecha(f.fecha, ahora);
    if (!grupos.has(balde)) grupos.set(balde, []);
    grupos.get(balde)!.push(f);
  }

  // Para editar: la lista de propiedades/contactos tiene que incluir los que
  // ya están vinculados aunque la propiedad ya no esté activa.
  const propiedadesEdicion = [...misPropiedades];
  for (const it of items) {
    if (it.propiedadId && !propiedadesEdicion.some((p) => p.id === it.propiedadId)) {
      propiedadesEdicion.push({
        id: it.propiedadId,
        codigo: "",
        titulo: it.propiedadTexto ?? "(propiedad)",
      });
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-orion-navy dark:text-white">Agenda</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {pendientes.length} actividad(es) pendiente(s) — visitas, reuniones,
          captaciones, tasaciones, firmas y más.
        </p>
      </div>

      {faltaMigracion && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          Para agendar reuniones, captaciones y demás, falta ejecutar la
          migración de la base de datos.
        </p>
      )}

      <div className="mb-6">
        <AgendarForm
          key={fechaInicial ?? "normal"}
          propiedades={misPropiedades}
          contactos={misContactos}
          fechaInicial={fechaInicial}
        />
      </div>

      {pendientes.length === 0 && (
        <p className="mb-8 rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:bg-gray-800 dark:border-gray-700">
          No tenés nada agendado.
        </p>
      )}

      {ORDEN_BALDES.filter((b) => grupos.has(b)).map((balde) => (
        <div key={balde} className="mb-6">
          <h2
            className={`mb-3 text-sm font-semibold uppercase tracking-wide ${
              balde === "Vencidas" ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {balde === "Vencidas" ? "⚠️ Vencidas — ¿se hicieron?" : balde} — {grupos.get(balde)!.length}
          </h2>
          <div className="flex flex-col gap-3">
            {grupos.get(balde)!.map((it) => {
              const clave = `${it.clase}-${it.id}`;
              const choques = superpuestas.get(clave);
              const duracion = textoDuracion(it.duracionMin);
              return (
                <TarjetaEditable
                  key={clave}
                  clase={it.clase}
                  resaltada={vencidas.has(clave)}
                  propiedades={propiedadesEdicion}
                  contactos={misContactos}
                  valoresVisita={
                    it.clase === "visita"
                      ? {
                          id: it.id,
                          propiedadId: it.propiedadId,
                          contactoId: it.contactoId,
                          fecha: aInputFechaHora(it.fecha),
                          duracionMin: it.duracionMin,
                          notas: it.notas,
                        }
                      : undefined
                  }
                  valoresActividad={
                    it.clase === "actividad"
                      ? {
                          id: it.id,
                          tipo: it.tipo === "VISITA" ? "OTRO" : it.tipo,
                          titulo: it.titulo,
                          fecha: aInputFechaHora(it.fecha),
                          duracionMin: it.duracionMin,
                          lugar: it.lugar,
                          propiedadId: it.propiedadId,
                          contactoId: it.contactoId,
                          notas: it.notas,
                        }
                      : undefined
                  }
                  acciones={
                    it.clase === "visita" ? (
                      <AccionesVisita visitaId={it.id} estado={it.estado} />
                    ) : (
                      <AccionesActividad actividadId={it.id} estado={it.estado} />
                    )
                  }
                  contenido={
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-orion-navy px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {it.fecha.toLocaleString("es-UY", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {duracion && (
                          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                            ⏱ {duracion}
                          </span>
                        )}
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${TIPO_EVENTO_ETIQUETA[it.tipo]}`}>
                          {TIPO_EVENTO_ICONO[it.tipo]} {TIPO_EVENTO_LABEL[it.tipo]}
                        </span>
                      </div>

                      {it.clase === "actividad" && (
                        <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {it.titulo}
                        </p>
                      )}
                      {it.lugar && (
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">📍 {it.lugar}</p>
                      )}
                      {it.propiedadId && it.propiedadTexto && (
                        <Link
                          href={`/propiedades/${it.propiedadId}`}
                          className={
                            it.clase === "visita"
                              ? "mt-1 block text-sm font-semibold text-gray-800 hover:underline dark:text-gray-100"
                              : "mt-0.5 block text-xs text-gray-600 hover:underline dark:text-gray-300"
                          }
                        >
                          {it.clase === "actividad" ? "🏢 " : ""}
                          {it.propiedadTexto}
                        </Link>
                      )}
                      {it.contactoId && it.contactoTexto && (
                        <Link
                          href={`/contactos/${it.contactoId}`}
                          className="mt-0.5 block text-xs font-medium text-orion-navy hover:underline dark:text-orion-gold"
                        >
                          👤 {it.contactoTexto}
                        </Link>
                      )}
                      {it.notas && <p className="mt-1 text-xs italic text-gray-400">{it.notas}</p>}
                      {choques && (
                        <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                          ⚠️ Se superpone con: {choques.join(", ")}
                        </p>
                      )}
                    </>
                  }
                />
              );
            })}
          </div>
        </div>
      ))}

      {resueltas.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-semibold text-gray-500 hover:text-orion-navy dark:text-gray-400 dark:hover:text-white">
            Historial ({resueltas.length})
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {resueltas.map((it) => (
              <div
                key={`${it.clase}-${it.id}`}
                className="rounded-lg border border-gray-200 bg-white p-3 text-xs dark:bg-gray-800 dark:border-gray-700"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-gray-400">{it.fecha.toLocaleDateString("es-UY")}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${TIPO_EVENTO_ETIQUETA[it.tipo]}`}>
                    {TIPO_EVENTO_LABEL[it.tipo]}
                  </span>
                  {it.clase === "visita" ? (
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${ESTADO_VISITA_COLOR[it.estado]}`}>
                      {ESTADO_VISITA_LABEL[it.estado]}
                    </span>
                  ) : (
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${COLOR_ESTADO_ACTIVIDAD[it.estado] ?? ""}`}>
                      {ESTADO_ACTIVIDAD_LABEL[it.estado] ?? it.estado}
                    </span>
                  )}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {it.clase === "actividad" ? it.titulo : it.propiedadTexto}
                  </span>
                  {it.contactoTexto && (
                    <span className="text-gray-500 dark:text-gray-400">— {it.contactoTexto}</span>
                  )}
                </div>
                {it.resultado && (
                  <p className="mt-1 italic text-gray-500 dark:text-gray-400">
                    &quot;{it.resultado}&quot;
                  </p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
