import { db } from "@/db";
import { propiedades, pipelineAcciones, historialPrecios } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { and, eq, desc, inArray } from "drizzle-orm";
import { limpiarTitulo } from "@/lib/propiedades";
import {
  diasEnMercado,
  semanaActual,
  esSemanaFinal,
  accionesDeLaSemana,
  DURACION_CICLO,
} from "@/lib/pipeline";
import type { CategoriaPipeline } from "@/lib/pipeline";
import { TarjetaPipeline } from "./tarjeta-pipeline";

export default async function PipelinePage() {
  const sesion = await obtenerSesion();

  const props = await db
    .select()
    .from(propiedades)
    .where(and(eq(propiedades.agenteId, sesion!.userId), eq(propiedades.estado, "ACTIVA")))
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
      acciones: accionesSemana,
      hechasEstaSemana,
      diasSinContacto,
      ultimoAjustePrecio: ultimoAjuste
        ? { fecha: ultimoAjuste.creadoEn.toISOString(), precioAnterior: ultimoAjuste.precioAnterior }
        : null,
      fechaInicioPipeline: p.fechaInicioPipeline.toISOString(),
    };
  });

  // Más urgente primero: sin contacto nunca, o hace más días.
  tarjetas.sort((a, b) => (b.diasSinContacto ?? 999) - (a.diasSinContacto ?? 999));

  const ventas = tarjetas.filter((t) => t.operacion === "VENTA");
  const alquileres = tarjetas.filter((t) => t.operacion === "ALQUILER");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-orion-navy dark:text-white">Pipeline</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Cadencia de 14 semanas (venta) y 7 semanas (alquiler) — {tarjetas.length}{" "}
          propiedad(es) activa(s) en seguimiento
        </p>
      </div>

      {tarjetas.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:bg-gray-800 dark:border-gray-700">
          No tenés propiedades activas para hacer seguimiento todavía.
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
