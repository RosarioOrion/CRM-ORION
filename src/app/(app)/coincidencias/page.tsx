import Link from "next/link";
import { db } from "@/db";
import { busquedas, propiedades, contactos, coincidenciasAvisadas } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { eq, and, inArray } from "drizzle-orm";
import { limpiarTitulo, resumenCaracteristicas, OPERACION_LABEL } from "@/lib/propiedades";
import { evaluarMatch, type PropiedadParaMatch, type BusquedaParaMatch } from "@/lib/coincidencias";
import { AccionesCoincidencia } from "./acciones-coincidencia";

function formatearPrecio(precio: number | null, moneda: string) {
  if (precio == null) return "Consultar precio";
  return `${moneda} ${precio.toLocaleString()}`;
}

export default async function CoincidenciasPage() {
  const sesion = await obtenerSesion();

  const misBusquedas = await db
    .select({
      id: busquedas.id,
      operacion: busquedas.operacion,
      tipo: busquedas.tipo,
      zona: busquedas.zona,
      precioMin: busquedas.precioMin,
      precioMax: busquedas.precioMax,
      moneda: busquedas.moneda,
      contactoId: contactos.id,
      contactoNombre: contactos.nombre,
      contactoTelefono: contactos.telefono,
    })
    .from(busquedas)
    .innerJoin(contactos, eq(busquedas.contactoId, contactos.id))
    .where(and(eq(contactos.agenteId, sesion!.userId), eq(busquedas.activa, true)));

  const misPropiedades = await db
    .select({
      id: propiedades.id,
      codigo: propiedades.codigo,
      titulo: propiedades.titulo,
      operacion: propiedades.operacion,
      tipo: propiedades.tipo,
      zona: propiedades.zona,
      precio: propiedades.precio,
      moneda: propiedades.moneda,
      dormitorios: propiedades.dormitorios,
      banos: propiedades.banos,
      m2Cubiertos: propiedades.m2Cubiertos,
      m2Privados: propiedades.m2Privados,
      m2Terreno: propiedades.m2Terreno,
      hectareas: propiedades.hectareas,
    })
    .from(propiedades)
    .where(and(eq(propiedades.agenteId, sesion!.userId), eq(propiedades.estado, "ACTIVA")));

  const busquedaIds = misBusquedas.map((b) => b.id);
  const avisos =
    busquedaIds.length > 0
      ? await db
          .select({
            id: coincidenciasAvisadas.id,
            busquedaId: coincidenciasAvisadas.busquedaId,
            propiedadId: coincidenciasAvisadas.propiedadId,
          })
          .from(coincidenciasAvisadas)
          .where(inArray(coincidenciasAvisadas.busquedaId, busquedaIds))
      : [];

  function avisoDe(busquedaId: string, propiedadId: string) {
    return avisos.find((a) => a.busquedaId === busquedaId && a.propiedadId === propiedadId) ?? null;
  }

  const grupos = misBusquedas
    .map((b) => {
      const busquedaMatch: BusquedaParaMatch = {
        id: b.id,
        operacion: b.operacion,
        tipo: b.tipo,
        zona: b.zona,
        precioMin: b.precioMin,
        precioMax: b.precioMax,
        moneda: b.moneda,
      };
      const matches = misPropiedades
        .map((p) => {
          const propMatch: PropiedadParaMatch = {
            id: p.id,
            codigo: p.codigo,
            titulo: p.titulo,
            operacion: p.operacion,
            tipo: p.tipo,
            zona: p.zona,
            precio: p.precio,
            moneda: p.moneda,
            dormitorios: p.dormitorios,
            banos: p.banos,
          };
          const resultado = evaluarMatch(propMatch, busquedaMatch);
          return { propiedad: p, resultado };
        })
        .filter((m) => m.resultado.matchea)
        // fuera de rango de precio al final, dentro de rango primero
        .sort((a, b2) => {
          const rango = (x: boolean | null) => (x === true ? 0 : x === null ? 1 : 2);
          return rango(a.resultado.precioEnRango) - rango(b2.resultado.precioEnRango);
        });

      return { busqueda: b, matches };
    })
    .filter((g) => g.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length);

  const totalMatches = grupos.reduce((acc, g) => acc + g.matches.length, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-orion-navy dark:text-white">
          Motor de coincidencias
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Cruce automático entre lo que buscan tus contactos y tus propiedades
          activas — {totalMatches} coincidencia(s) en {grupos.length} búsqueda(s)
        </p>
      </div>

      {grupos.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:bg-gray-800 dark:border-gray-700">
          No hay coincidencias todavía. Se cruzan las búsquedas activas con las
          propiedades activas por operación, tipo y zona.
        </p>
      )}

      <div className="flex flex-col gap-5">
        {grupos.map(({ busqueda: b, matches }) => (
          <div
            key={b.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-gray-800 dark:border-gray-700"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 dark:border-gray-700">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/contactos/${b.contactoId}`}
                    className="font-semibold text-orion-navy hover:underline dark:text-orion-gold"
                  >
                    👤 {b.contactoNombre}
                  </Link>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      b.operacion === "VENTA"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    }`}
                  >
                    {OPERACION_LABEL[b.operacion]}
                  </span>
                  {b.contactoTelefono && (
                    <span className="text-xs text-gray-400">{b.contactoTelefono}</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Busca: {b.tipo} en {b.zona}
                  {b.precioMin || b.precioMax
                    ? ` · ${b.moneda} ${b.precioMin?.toLocaleString() ?? "0"} – ${
                        b.precioMax?.toLocaleString() ?? "s/tope"
                      }`
                    : ""}
                </p>
              </div>
              <span className="rounded-full bg-orion-gold/20 px-2 py-0.5 text-xs font-semibold text-orion-navy dark:text-orion-gold">
                {matches.length} propiedad{matches.length === 1 ? "" : "es"}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {matches.map(({ propiedad: p, resultado }) => {
                const aviso = avisoDe(b.id, p.id);
                return (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:bg-gray-900/40 dark:border-gray-700"
                  >
                    <div>
                      <Link
                        href={`/propiedades/${p.id}`}
                        className="text-sm font-semibold text-gray-800 hover:underline dark:text-gray-100"
                      >
                        {p.codigo} — {limpiarTitulo(p.titulo)}
                      </Link>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {formatearPrecio(p.precio, p.moneda)}
                        {" · "}
                        {resumenCaracteristicas(p) || "sin datos de m²/amb."}
                        {" · "}
                        {p.zona}
                      </p>
                      {resultado.precioEnRango === true && (
                        <span className="mt-1 inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          💲 Dentro del rango buscado
                        </span>
                      )}
                      {resultado.precioEnRango === false && (
                        <span className="mt-1 inline-block rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/40 dark:text-red-400">
                          Fuera del rango de precio
                        </span>
                      )}
                      {resultado.precioEnRango === null && (
                        <span className="mt-1 inline-block rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                          Precio sin comparar
                        </span>
                      )}
                    </div>

                    <AccionesCoincidencia
                      busquedaId={b.id}
                      propiedadId={p.id}
                      avisoId={aviso?.id ?? null}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
