import Link from "next/link";
import { db } from "@/db";
import { captaciones, contactos, actividades } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { eq, desc, and } from "drizzle-orm";
import {
  ESTADOS_CAPTACION,
  ESTADO_CAPTACION_LABEL,
  ESTADO_CAPTACION_ICONO,
} from "@/lib/captaciones";
import { ORIGEN_LABEL, type OrigenContacto } from "@/lib/contactos";
import { NuevaCaptacionForm, type CaptacionInicial } from "./nueva-captacion-form";
import { AccionesCaptacion } from "./acciones-captacion";

export default async function CaptacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string }>;
}) {
  const sesion = await obtenerSesion();

  // "🚀 Crear captación" desde una visita de captación de la Agenda:
  // /captaciones?desde=<id de la actividad> → el formulario se abre precargado.
  const { desde } = await searchParams;
  let inicial: CaptacionInicial | undefined;
  if (desde) {
    try {
      const [act] = await db
        .select({
          titulo: actividades.titulo,
          contactoId: actividades.contactoId,
          lugar: actividades.lugar,
          notas: actividades.notas,
          resultado: actividades.resultado,
        })
        .from(actividades)
        .where(and(eq(actividades.id, desde), eq(actividades.agenteId, sesion!.userId)));
      if (act) {
        inicial = {
          titulo: act.titulo,
          contactoId: act.contactoId,
          direccion: act.lugar,
          notas: [act.notas, act.resultado ? `Resultado de la visita: ${act.resultado}` : null]
            .filter(Boolean)
            .join("\n"),
        };
      }
    } catch {
      // sin tabla de actividades: se ignora
    }
  }

  const misContactos = await db
    .select({ id: contactos.id, nombre: contactos.nombre })
    .from(contactos)
    .where(eq(contactos.agenteId, sesion!.userId))
    .orderBy(contactos.nombre);

  const filas = await db
    .select({
      id: captaciones.id,
      titulo: captaciones.titulo,
      operacion: captaciones.operacion,
      tipo: captaciones.tipo,
      zona: captaciones.zona,
      direccion: captaciones.direccion,
      origen: captaciones.origen,
      origenDetalle: captaciones.origenDetalle,
      notas: captaciones.notas,
      estado: captaciones.estado,
      convertidaEnPropiedadId: captaciones.convertidaEnPropiedadId,
      contactoId: contactos.id,
      contactoNombre: contactos.nombre,
    })
    .from(captaciones)
    .innerJoin(contactos, eq(captaciones.contactoId, contactos.id))
    .where(eq(captaciones.agenteId, sesion!.userId))
    .orderBy(desc(captaciones.creadoEn));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-orion-navy dark:text-white">
            Captaciones
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Seguimiento de propietarios en proceso — {filas.length}{" "}
            captación(es)
          </p>
        </div>
      </div>

      <div className="mb-6">
        <NuevaCaptacionForm key={desde ?? "nueva"} contactos={misContactos} inicial={inicial} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ESTADOS_CAPTACION.map((estado) => {
          const items = filas.filter((f) => f.estado === estado);
          return (
            <div key={estado} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-orion-navy px-3 py-2 text-sm font-semibold text-white dark:bg-orion-navy-light">
                <span>{ESTADO_CAPTACION_ICONO[estado]}</span>
                <span>{ESTADO_CAPTACION_LABEL[estado]}</span>
                <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  {items.length}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {items.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-gray-200 bg-white p-4 text-center text-xs text-gray-400 dark:bg-gray-800 dark:border-gray-700">
                    Sin captaciones acá todavía.
                  </p>
                ) : (
                  items.map((f) => (
                    <div
                      key={f.id}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-gray-800 dark:border-gray-700"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            f.operacion === "VENTA"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          }`}
                        >
                          {f.operacion === "VENTA" ? "Venta" : "Alquiler"}
                        </span>
                        <span className="text-xs text-gray-400">
                          {f.tipo}
                        </span>
                      </div>

                      <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {f.titulo}
                      </p>

                      <Link
                        href={`/contactos/${f.contactoId}`}
                        className="mt-0.5 block text-xs font-medium text-orion-navy hover:underline dark:text-orion-gold"
                      >
                        👤 {f.contactoNombre}
                      </Link>

                      {(f.zona || f.direccion) && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {[f.zona, f.direccion].filter(Boolean).join(" — ")}
                        </p>
                      )}

                      <p className="mt-1 text-[11px] text-gray-400">
                        Origen: {ORIGEN_LABEL[f.origen as OrigenContacto] ?? f.origen}
                        {f.origenDetalle ? ` (${f.origenDetalle})` : ""}
                      </p>

                      {f.notas && (
                        <p className="mt-1 text-xs italic text-gray-400">
                          {f.notas}
                        </p>
                      )}

                      <div className="mt-3 flex justify-end">
                        <AccionesCaptacion
                          captacionId={f.id}
                          estado={f.estado}
                          yaConvertida={!!f.convertidaEnPropiedadId}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
