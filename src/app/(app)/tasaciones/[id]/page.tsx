import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { tasaciones, usuarios } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { OPCIONES_ESTADO, OPCIONES_UBICACION, calcularTasacion } from "@/lib/tasaciones";
import { EliminarTasacionBoton } from "../eliminar-tasacion-boton";

function formatoUsd(n: number) {
  return `USD ${Math.round(n).toLocaleString("es-UY")}`;
}

function labelEstado(v: number) {
  return OPCIONES_ESTADO.find((o) => o.valor === v)?.label ?? String(v);
}
function labelUbicacion(v: number) {
  return OPCIONES_UBICACION.find((o) => o.valor === v)?.label ?? String(v);
}

export default async function TasacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sesion = await obtenerSesion();
  if (!sesion) notFound();

  const [tasacion] = await db
    .select({
      id: tasaciones.id,
      tipo: tasaciones.tipo,
      direccion: tasaciones.direccion,
      zona: tasaciones.zona,
      link: tasaciones.link,
      m2: tasaciones.m2,
      estado: tasaciones.estado,
      ubicacion: tasaciones.ubicacion,
      comparables: tasaciones.comparables,
      promedioUsdM2: tasaciones.promedioUsdM2,
      valorEstimado: tasaciones.valorEstimado,
      ajusteManual: tasaciones.ajusteManual,
      notas: tasaciones.notas,
      creadoEn: tasaciones.creadoEn,
      agenteId: tasaciones.agenteId,
      agenteNombre: usuarios.nombre,
    })
    .from(tasaciones)
    .innerJoin(usuarios, eq(tasaciones.agenteId, usuarios.id))
    .where(eq(tasaciones.id, id));

  if (!tasacion) notFound();
  if (tasacion.agenteId !== sesion.userId && !esAdmin(sesion.rol)) notFound();

  const resultado = calcularTasacion(
    tasacion.comparables,
    tasacion.estado,
    tasacion.ubicacion,
    tasacion.m2
  );

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/tasaciones"
        className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold"
      >
        ← Volver a Tasaciones
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-orion-navy dark:text-white capitalize">
            {tasacion.tipo} · {tasacion.direccion || "sin dirección"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tasacion.zona ? `${tasacion.zona} · ` : ""}
            {tasacion.agenteNombre} ·{" "}
            {new Date(tasacion.creadoEn).toLocaleDateString("es-UY", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>
        <EliminarTasacionBoton tasacionId={tasacion.id} />
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3 rounded-xl border border-orion-gold bg-orion-gold/5 p-4 text-center dark:border-orion-gold">
        <div>
          <p className="text-xs text-gray-400">USD/m² promedio</p>
          <p className="text-lg font-bold text-orion-navy dark:text-orion-gold">
            {formatoUsd(resultado.promedioUsdM2Redondeado)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Valor estimado</p>
          <p className="text-lg font-bold text-orion-navy dark:text-orion-gold">
            {formatoUsd(resultado.valorEstimado)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">
            {tasacion.ajusteManual != null ? "Ajuste manual" : "Sin ajuste manual"}
          </p>
          <p className="text-lg font-bold text-orion-navy dark:text-orion-gold">
            {tasacion.ajusteManual != null ? formatoUsd(tasacion.ajusteManual) : "—"}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Datos de la propiedad
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <p><span className="text-gray-400">Tipo: </span>{tasacion.tipo}</p>
          <p><span className="text-gray-400">Superficie: </span>{tasacion.m2} m²</p>
          <p><span className="text-gray-400">Estado: </span>{labelEstado(tasacion.estado)}</p>
          <p><span className="text-gray-400">Ubicación: </span>{labelUbicacion(tasacion.ubicacion)}</p>
          {tasacion.direccion && <p><span className="text-gray-400">Dirección: </span>{tasacion.direccion}</p>}
          {tasacion.zona && <p><span className="text-gray-400">Barrio: </span>{tasacion.zona}</p>}
          {tasacion.link && (
            <p className="col-span-2">
              <a href={tasacion.link} target="_blank" rel="noopener noreferrer" className="text-orion-navy hover:underline dark:text-orion-gold">
                🔗 Ver publicación
              </a>
            </p>
          )}
        </div>
        {tasacion.notas && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
            {tasacion.notas}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-orion-bg text-xs uppercase text-gray-400 dark:bg-gray-900">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">m²</th>
              <th className="px-3 py-2 text-left">Precio</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">Ubic.</th>
              <th className="px-3 py-2 text-left">USD/m² aj.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {tasacion.comparables.map((c, i) => (
              <tr key={i}>
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2">{c.esCierre ? "✅ Cierre" : "📊 Dinámico"}</td>
                <td className="px-3 py-2">{c.m2}</td>
                <td className="px-3 py-2">
                  {formatoUsd(c.precio)}
                  {!c.esCierre && (
                    <span className="ml-1 text-[11px] text-gray-400">(-10%)</span>
                  )}
                  {c.link && (
                    <>
                      {" "}
                      <a
                        href={c.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-orion-navy hover:underline dark:text-orion-gold"
                      >
                        ver
                      </a>
                    </>
                  )}
                </td>
                <td className="px-3 py-2">{c.estado}</td>
                <td className="px-3 py-2">{c.ubicacion}</td>
                <td className="px-3 py-2 font-semibold text-orion-navy dark:text-orion-gold">
                  {formatoUsd(resultado.ajustados[i])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Los comparables dinámicos (publicaciones activas) se reducen un 10% antes del
        cálculo; el USD/m² de cada uno se ajusta ±5% por cada punto de diferencia en
        estado y en ubicación respecto de esta propiedad.
      </p>
    </div>
  );
}
