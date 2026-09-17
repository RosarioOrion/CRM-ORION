import Link from "next/link";
import { db } from "@/db";
import { visitas, propiedades, contactos } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { eq, and, asc } from "drizzle-orm";
import { limpiarTitulo } from "@/lib/propiedades";
import {
  ESTADO_VISITA_LABEL,
  ESTADO_VISITA_COLOR,
  baldeFecha,
  ORDEN_BALDES,
} from "@/lib/visitas";
import { NuevaVisitaForm } from "./nueva-visita-form";
import { AccionesVisita } from "./acciones-visita";

export default async function AgendaPage() {
  const sesion = await obtenerSesion();

  const misPropiedades = await db
    .select({ id: propiedades.id, codigo: propiedades.codigo, titulo: propiedades.titulo })
    .from(propiedades)
    .where(and(eq(propiedades.agenteId, sesion!.userId), eq(propiedades.estado, "ACTIVA")))
    .orderBy(propiedades.codigo);

  const misContactos = await db
    .select({ id: contactos.id, nombre: contactos.nombre })
    .from(contactos)
    .where(eq(contactos.agenteId, sesion!.userId))
    .orderBy(contactos.nombre);

  const filas = await db
    .select({
      id: visitas.id,
      fecha: visitas.fecha,
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
    .where(eq(visitas.agenteId, sesion!.userId))
    .orderBy(asc(visitas.fecha));

  const pendientes = filas.filter((f) => f.estado === "PROGRAMADA");
  const resueltas = filas
    .filter((f) => f.estado !== "PROGRAMADA")
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  const grupos = new Map<string, typeof pendientes>();
  for (const f of pendientes) {
    const balde = baldeFecha(f.fecha);
    if (!grupos.has(balde)) grupos.set(balde, []);
    grupos.get(balde)!.push(f);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-orion-navy dark:text-white">Agenda de visitas</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {pendientes.length} visita(s) programada(s)
        </p>
      </div>

      <div className="mb-6">
        <NuevaVisitaForm propiedades={misPropiedades} contactos={misContactos} />
      </div>

      {pendientes.length === 0 && (
        <p className="mb-8 rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:bg-gray-800 dark:border-gray-700">
          No tenés visitas programadas.
        </p>
      )}

      {ORDEN_BALDES.filter((b) => grupos.has(b)).map((balde) => (
        <div key={balde} className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {balde} — {grupos.get(balde)!.length}
          </h2>
          <div className="flex flex-col gap-3">
            {grupos.get(balde)!.map((v) => (
              <div
                key={v.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-gray-800 dark:border-gray-700"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-orion-navy px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {v.fecha.toLocaleString("es-UY", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${ESTADO_VISITA_COLOR[v.estado]}`}>
                      {ESTADO_VISITA_LABEL[v.estado]}
                    </span>
                  </div>
                  <Link
                    href={`/propiedades/${v.propiedadId}`}
                    className="mt-1 block text-sm font-semibold text-gray-800 hover:underline dark:text-gray-100"
                  >
                    {v.propiedadCodigo} — {limpiarTitulo(v.propiedadTitulo)}
                  </Link>
                  <Link
                    href={`/contactos/${v.contactoId}`}
                    className="mt-0.5 block text-xs font-medium text-orion-navy hover:underline dark:text-orion-gold"
                  >
                    👤 {v.contactoNombre}
                    {v.contactoTelefono ? ` · ${v.contactoTelefono}` : ""}
                  </Link>
                  {v.notas && (
                    <p className="mt-1 text-xs italic text-gray-400">{v.notas}</p>
                  )}
                </div>

                <AccionesVisita visitaId={v.id} estado={v.estado} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {resueltas.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-semibold text-gray-500 hover:text-orion-navy dark:text-gray-400 dark:hover:text-white">
            Historial ({resueltas.length})
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {resueltas.map((v) => (
              <div
                key={v.id}
                className="rounded-lg border border-gray-200 bg-white p-3 text-xs dark:bg-gray-800 dark:border-gray-700"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-gray-400">
                    {v.fecha.toLocaleDateString("es-UY")}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${ESTADO_VISITA_COLOR[v.estado]}`}>
                    {ESTADO_VISITA_LABEL[v.estado]}
                  </span>
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {v.propiedadCodigo}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">— {v.contactoNombre}</span>
                </div>
                {v.resultado && (
                  <p className="mt-1 italic text-gray-500 dark:text-gray-400">
                    &quot;{v.resultado}&quot;
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
