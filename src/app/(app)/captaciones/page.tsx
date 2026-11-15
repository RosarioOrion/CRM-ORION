import Link from "next/link";
import { db } from "@/db";
import { captaciones, contactos, actividades } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { eq, desc, and } from "drizzle-orm";
import {
  calcularPlazo,
  COLUMNAS,
  ETAPA_LABEL,
  esEtapa,
  faltaTexto,
  horasRestantes,
  TITULO_CAPTACION,
  type Etapa,
} from "@/lib/captacion-flujo";
import { vencerCaptaciones } from "@/lib/captacion-borrar";
import { datosParaWhatsApp } from "../mensajes/actions";
import { NuevaCaptacionForm, type CaptacionInicial } from "./nueva-captacion-form";
import { FlujoCaptacion } from "./flujo-captacion";
import { VerificarCaptacion } from "./verificar-captacion";

export default async function CaptacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; nuevo?: string }>;
}) {
  const sesion = await obtenerSesion();

  // "🚀 Crear captación" desde una visita de captación de la Agenda:
  // /captaciones?desde=<id de la actividad> → el formulario se abre precargado.
  const { desde, nuevo } = await searchParams;
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

  // Lo vencido se borra antes de mostrar (además del chequeo cada 15 min).
  await vencerCaptaciones().catch(() => {});

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
      link: captaciones.link,
      estado: captaciones.estado,
      etapa: captaciones.etapa,
      etapaDesde: captaciones.etapaDesde,
      intentoEn: captaciones.intentoEn,
      seguimientosHechos: captaciones.seguimientosHechos,
      ultimoSeguimiento: captaciones.ultimoSeguimiento,
      tasacionId: captaciones.tasacionId,
      historial: captaciones.historial,
      convertidaEnPropiedadId: captaciones.convertidaEnPropiedadId,
      contactoId: contactos.id,
      contactoNombre: contactos.nombre,
      telefono: contactos.telefono,
    })
    .from(captaciones)
    .innerJoin(contactos, eq(captaciones.contactoId, contactos.id))
    .where(eq(captaciones.agenteId, sesion!.userId))
    .orderBy(desc(captaciones.creadoEn));

  const wa = await datosParaWhatsApp();
  const plantillas = wa.plantillas.filter((p) => TITULO_CAPTACION.test(p.titulo));
  const tarjetas = filas.map((f) => ({
    ...f,
    etapa: (esEtapa(f.etapa) ? f.etapa : "LLAMANDO") as Etapa,
    plazo: calcularPlazo(f),
  }));

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

      <div className="mb-4">
        <VerificarCaptacion key={nuevo ?? ""} />
      </div>

      {/* Desde una visita de captación de la Agenda: el formulario de antes, precargado. */}
      {inicial && (
        <div className="mb-6">
          <NuevaCaptacionForm key={desde} contactos={misContactos} inicial={inicial} />
        </div>
      )}

      <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        ⏳ Cada captación tiene plazo: 48 hs para llamar o escribir (y para cada seguimiento). En S8 / S12 hay que hacer
        cada seguimiento a tiempo. Lo que vence se borra y queda 30 días en la Papelera.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNAS.map((col) => {
          const items = tarjetas.filter((f) => col.etapas.includes(f.etapa));
          return (
            <div key={col.clave} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-orion-navy px-3 py-2 text-sm font-semibold text-white dark:bg-orion-navy-light">
                <span>{col.icono}</span>
                <span>{col.label}</span>
                <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-xs">{items.length}</span>
              </div>

              <div className="flex flex-col gap-3">
                {items.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-gray-200 bg-white p-4 text-center text-xs text-gray-400 dark:bg-gray-800 dark:border-gray-700">
                    Sin captaciones acá.
                  </p>
                ) : (
                  items.map((f) => {
                    const urgente = f.plazo.vence ? horasRestantes(f.plazo.vence) < 12 : false;
                    return (
                      <div
                        key={f.id}
                        className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-800 ${
                          urgente ? "border-red-300 dark:border-red-800" : "border-gray-200 dark:border-gray-700"
                        }`}
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
                          <span className="rounded bg-orion-navy/10 px-1.5 py-0.5 text-[10px] font-semibold text-orion-navy dark:bg-white/10 dark:text-gray-200">
                            {ETAPA_LABEL[f.etapa]}
                          </span>
                          <span className="text-xs text-gray-400">{f.tipo}</span>
                        </div>

                        <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{f.titulo}</p>

                        <Link
                          href={`/contactos/${f.contactoId}`}
                          className="mt-0.5 block text-xs font-medium text-orion-navy hover:underline dark:text-orion-gold"
                        >
                          👤 {f.contactoNombre}
                          {f.telefono ? ` · ${f.telefono}` : ""}
                        </Link>

                        {f.link && (
                          <a
                            href={f.link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block truncate text-xs text-orion-navy underline dark:text-orion-gold"
                          >
                            🔗 Ver publicación
                          </a>
                        )}

                        {(f.zona || f.direccion) && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {[f.zona, f.direccion].filter(Boolean).join(" — ")}
                          </p>
                        )}

                        {f.plazo.vence && (
                          <p
                            className={`mt-2 text-xs font-semibold ${
                              urgente ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
                            }`}
                          >
                            ⏳ {f.plazo.proximo ? `Próximo seguimiento ${faltaTexto(f.plazo.proximo)} · ` : ""}
                            se borra {faltaTexto(f.plazo.vence)} si no se marca
                          </p>
                        )}

                        {f.historial.length > 0 && (
                          <ul className="mt-2 space-y-0.5 border-l-2 border-gray-100 pl-2 text-[11px] text-gray-500 dark:border-gray-700 dark:text-gray-400">
                            {f.historial.slice(-3).map((h, i) => (
                              <li key={i}>
                                {new Date(h.fecha).toLocaleDateString("es-UY", {
                                  timeZone: "America/Montevideo",
                                  day: "2-digit",
                                  month: "2-digit",
                                })}{" "}
                                · {h.texto}
                              </li>
                            ))}
                          </ul>
                        )}

                        {f.notas && <p className="mt-1 text-xs italic text-gray-400">{f.notas}</p>}

                        <div className="mt-3">
                          <FlujoCaptacion
                            d={{
                              id: f.id,
                              etapa: f.etapa,
                              operacion: f.operacion,
                              titulo: f.titulo,
                              contactoNombre: f.contactoNombre,
                              telefono: f.telefono,
                              contactado: f.plazo.contactado,
                              cicloTerminado: f.plazo.cicloTerminado,
                              hechos: f.seguimientosHechos,
                              tasacionId: f.tasacionId,
                              convertida: !!f.convertidaEnPropiedadId,
                            }}
                            plantillas={plantillas}
                            agente={wa.agente}
                            inmobiliaria={wa.inmobiliaria}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
