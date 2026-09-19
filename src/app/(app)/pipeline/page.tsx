import { db } from "@/db";
import { propiedades, pipelineAcciones, historialPrecios, usuarios } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { and, eq, desc, inArray } from "drizzle-orm";
import { limpiarTitulo } from "@/lib/propiedades";
import {
  diasEnMercado,
  semanaActual,
  esSemanaFinal,
  accionesDeLaSemana,
  estaVencido,
  DURACION_CICLO,
  MINIMO_PROPIEDADES_ACTIVAS,
  UMBRAL_REVISAR_PRECIO_DIAS,
  UMBRAL_ESTANCADA_DIAS,
} from "@/lib/pipeline";
import type { CategoriaPipeline } from "@/lib/pipeline";
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

  const props = await db
    .select()
    .from(propiedades)
    .where(and(eq(propiedades.agenteId, agenteObjetivoId), eq(propiedades.estado, "ACTIVA")))
    .orderBy(propiedades.fechaInicioPipeline);

  const ids = props.map((p) => p.id);

  const acciones = ids.length
    ? await db
        .select()
        .from(pipelineAcciones)
        .where(inArray(pipelineAcciones.propiedadId, ids))
        .orderBy(desc(pipelineAcciones.creadoEn))
    : [];

  const ajustes = ids.length
    ? await db
        .select()
        .from(historialPrecios)
        .where(inArray(historialPrecios.propiedadId, ids))
        .orderBy(desc(historialPrecios.creadoEn))
    : [];

  const ahora = new Date();

  const tarjetas = props.map((p) => {
    const dias = diasEnMercado(p.fechaInicioPipeline, ahora);
    const semana = semanaActual(dias, p.operacion);
    const esFinal = esSemanaFinal(semana, p.operacion);
    const vencido = estaVencido(dias, p.operacion);
    const accionesSemana = accionesDeLaSemana(p.operacion, semana);

    const accionesDeEsta = acciones.filter(
      (a) => a.propiedadId === p.id && a.semana === semana
    );
    const hechasEstaSemana = accionesDeEsta.map((a) => a.categoria as CategoriaPipeline);

    const ultimaAccion = acciones.find((a) => a.propiedadId === p.id);
    const diasSinContacto = ultimaAccion
      ? diasEnMercado(ultimaAccion.creadoEn, ahora)
      : null;

    const ultimoAjuste = ajustes.find((a) => a.propiedadId === p.id);
    const diasSinAjuste = ultimoAjuste
      ? diasEnMercado(ultimoAjuste.creadoEn, ahora)
      : dias;
    const revisarPrecio = diasSinAjuste >= UMBRAL_REVISAR_PRECIO_DIAS;

    const estancada = diasSinContacto === null || diasSinContacto >= UMBRAL_ESTANCADA_DIAS;

    return {
      propiedadId: p.id,
      codigo: p.codigo,
      titulo: limpiarTitulo(p.titulo),
      operacion: p.operacion,
      precio: p.precio,
      moneda: p.moneda,
      dias,
      semana,
      totalSemanas: DURACION_CICLO[p.operacion],
      esFinal,
      vencido,
      revisarPrecio,
      estancada,
      acciones: accionesSemana,
      hechasEstaSemana,
      diasSinContacto,
      ultimoAjustePrecio: ultimoAjuste
        ? { fecha: ultimoAjuste.creadoEn.toISOString(), precioAnterior: ultimoAjuste.precioAnterior }
        : null,
      fechaInicioPipeline: p.fechaInicioPipeline.toISOString(),
      soloLectura,
    };
  });

  // Más urgente primero: sin contacto nunca, o hace más días.
  tarjetas.sort((a, b) => (b.diasSinContacto ?? 999) - (a.diasSinContacto ?? 999));

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
