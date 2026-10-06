import { db } from "@/db";
import { propiedades, usuarios } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { and, eq, getTableColumns } from "drizzle-orm";
import { MINIMO_PROPIEDADES_ACTIVAS } from "@/lib/pipeline";
import { armarTarjetasPipeline } from "@/lib/pipeline-datos";
import { TarjetaPipeline } from "./tarjeta-pipeline";
import { SelectorAgente } from "./selector-agente";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ agente?: string }>;
}) {
  const sesion = await obtenerSesion();
  const admin = esAdmin(sesion!.rol);
  const params = await searchParams;

  const agentes = admin
    ? await db
        .select({ id: usuarios.id, nombre: usuarios.nombre, rol: usuarios.rol })
        .from(usuarios)
        .where(eq(usuarios.activo, true))
        .orderBy(usuarios.nombre)
    : [];

  const agenteObjetivoId =
    admin && params.agente && agentes.some((a) => a.id === params.agente)
      ? params.agente
      : sesion!.userId;
  const soloLectura = agenteObjetivoId !== sesion!.userId;
  const agenteObjetivo = agentes.find((a) => a.id === agenteObjetivoId);

  // Todas las columnas menos las fotos (pesan mucho y acá no se usan).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fotos, ...columnasSinFotos } = getTableColumns(propiedades);
  const props = await db
    .select(columnasSinFotos)
    .from(propiedades)
    .where(and(eq(propiedades.agenteId, agenteObjetivoId), eq(propiedades.estado, "ACTIVA")))
    .orderBy(propiedades.fechaInicioPipeline);

  const tarjetas = await armarTarjetasPipeline(props, soloLectura);

  // Más urgente primero: seguimiento atrasado o que toca hoy, después sin
  // frecuencia elegida, después por días sin contacto.
  const prioridad = (t: (typeof tarjetas)[number]) =>
    t.seguimiento?.estado === "ATRASADO" ? 0 : t.seguimiento?.estado === "HOY" ? 1 : !t.frecuencia ? 2 : 3;
  tarjetas.sort(
    (a, b) =>
      prioridad(a) - prioridad(b) || (b.diasSinContacto ?? 999) - (a.diasSinContacto ?? 999)
  );

  const ventas = tarjetas.filter((t) => t.operacion === "VENTA");
  const alquileres = tarjetas.filter((t) => t.operacion === "ALQUILER");

  const totalActivas = tarjetas.length;
  const estancadas = tarjetas.filter((t) => t.estancada).length;
  const cumpleMinimo = totalActivas >= MINIMO_PROPIEDADES_ACTIVAS;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-orion-navy dark:text-white">Pipeline</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Cadencia de 14 semanas (venta) y 7 semanas (alquiler) — {tarjetas.length}{" "}
          propiedad(es) activa(s) en seguimiento
          {soloLectura && agenteObjetivo ? ` de ${agenteObjetivo.nombre}` : ""}
        </p>
      </div>

      {admin && agentes.length > 0 && (
        <SelectorAgente
          agentes={agentes}
          seleccionado={agenteObjetivoId}
          propioId={sesion!.userId}
        />
      )}

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-bold text-orion-navy dark:text-white">{totalActivas}</p>
            <p className="text-xs uppercase tracking-wide text-gray-400">Propiedades activas</p>
            <p className="text-xs text-gray-400">Mínimo objetivo: {MINIMO_PROPIEDADES_ACTIVAS} propiedades</p>
          </div>
          {totalActivas === 0 ? (
            <div className="max-w-sm rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
              <p className="font-semibold">⚠️ Sin pipeline cargado</p>
              <p>Sin pipeline, no hay foco. Cargá tus propiedades activas.</p>
            </div>
          ) : cumpleMinimo ? (
            <div className="max-w-sm rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
              <p className="font-semibold">✅ Pipeline sólido</p>
              <p>Así se construye una buena semana 💪 — {totalActivas} propiedades activas.</p>
            </div>
          ) : (
            <div className="max-w-sm rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              <p className="font-semibold">⚠️ Por debajo del mínimo</p>
              <p>
                Te faltan {MINIMO_PROPIEDADES_ACTIVAS - totalActivas} propiedad(es) para llegar al
                objetivo de {MINIMO_PROPIEDADES_ACTIVAS}.
              </p>
            </div>
          )}
          {estancadas > 0 && (
            <div className="max-w-sm rounded-lg bg-orange-50 p-3 text-xs text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
              <p className="font-semibold">🧹 Propiedades juntando polvo</p>
              <p>
                Propiedades estancadas no construyen cartera, solo aparentan. Decidí qué hacés con
                cada una — {estancadas} propiedad(es) estancada(s).
              </p>
            </div>
          )}
        </div>
      </div>

      {tarjetas.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:bg-gray-800 dark:border-gray-700">
          No {soloLectura ? "tiene" : "tenés"} propiedades activas para hacer seguimiento todavía.
        </p>
      )}

      {ventas.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Venta — {ventas.length}
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {ventas.map((t) => (
              <TarjetaPipeline key={t.propiedadId} {...t} />
            ))}
          </div>
        </div>
      )}

      {alquileres.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Alquiler — {alquileres.length}
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {alquileres.map((t) => (
              <TarjetaPipeline key={t.propiedadId} {...t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
