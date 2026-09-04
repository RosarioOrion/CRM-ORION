import Link from "next/link";
import { db } from "@/db";
import { propiedades, contactos } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { eq, desc, and, ilike, or } from "drizzle-orm";
import { NuevaPropiedadForm } from "./nueva-propiedad-form";
import {
  ESTADO_LABEL,
  ESTADO_COLOR,
  ESTADOS_PROPIEDAD,
  limpiarTitulo,
} from "@/lib/propiedades";

const TABS: { estado: string; label: string }[] = [
  { estado: "ACTIVA", label: "Activas" },
  { estado: "PAUSADA", label: "Suspendidas" },
  { estado: "CERRADA", label: "Dadas de baja" },
  { estado: "VENDIDA", label: "Vendidas" },
  { estado: "ALQUILADA", label: "Alquiladas" },
  { estado: "todas", label: "Todas" },
];

export default async function PropiedadesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const params = await searchParams;
  const estadoParam = params.estado ?? "ACTIVA";
  const estadoActivo = ESTADOS_PROPIEDAD.includes(
    estadoParam as (typeof ESTADOS_PROPIEDAD)[number]
  )
    ? estadoParam
    : "todas";
  const q = params.q?.trim() ?? "";

  const sesion = await obtenerSesion();

  const condiciones = [eq(propiedades.agenteId, sesion!.userId)];
  if (estadoActivo !== "todas") {
    condiciones.push(
      eq(propiedades.estado, estadoActivo as (typeof ESTADOS_PROPIEDAD)[number])
    );
  }
  if (q) {
    condiciones.push(
      or(
        ilike(propiedades.codigo, `%${q}%`),
        ilike(propiedades.titulo, `%${q}%`)
      )!
    );
  }

  const [misPropiedades, misContactos] = await Promise.all([
    db
      .select()
      .from(propiedades)
      .where(and(...condiciones))
      .orderBy(desc(propiedades.creadoEn)),
    db
      .select({ id: contactos.id, nombre: contactos.nombre })
      .from(contactos)
      .where(eq(contactos.agenteId, sesion!.userId)),
  ]);

  function hrefTab(estado: string) {
    const sp = new URLSearchParams();
    sp.set("estado", estado);
    if (q) sp.set("q", q);
    return `/propiedades?${sp.toString()}`;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-orion-navy dark:text-white">
          Propiedades
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {misPropiedades.length} propiedad(es)
        </p>
      </div>

      <div className="mb-6">
        <NuevaPropiedadForm contactos={misContactos} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Link
            key={t.estado}
            href={hrefTab(t.estado)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              estadoActivo === t.estado
                ? "bg-orion-navy text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-orion-navy dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
            }`}
          >
            {t.label}
          </Link>
        ))}

        <form
          action="/propiedades"
          method="GET"
          className="ml-auto flex items-center gap-2"
        >
          <input type="hidden" name="estado" value={estadoActivo} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por código o título..."
            className="w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-orion-navy dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="submit"
            className="rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-orion-navy-light"
          >
            Buscar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {misPropiedades.length === 0 ? (
          <p className="col-span-full rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:bg-gray-800 dark:border-gray-700">
            No hay propiedades para este filtro.
          </p>
        ) : (
          misPropiedades.map((p) => (
            <Link
              key={p.id}
              href={`/propiedades/${p.id}`}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-orion-navy hover:shadow-md dark:bg-gray-800 dark:border-gray-700"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded bg-orion-navy px-2 py-0.5 text-xs font-bold text-white">
                  {p.codigo}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${ESTADO_COLOR[p.estado]}`}
                >
                  {ESTADO_LABEL[p.estado]}
                </span>
              </div>
              <p className="font-semibold text-gray-800 dark:text-gray-100">
                {limpiarTitulo(p.titulo)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {p.zona}
                {p.departamento ? ` — ${p.departamento}` : ""}
              </p>
              {(p.dormitorios ||
                p.banos ||
                p.m2Cubiertos ||
                p.m2Terreno ||
                p.hectareas ||
                p.cocheras ||
                p.ambientes) && (
                <p className="mt-1 text-xs text-gray-400">
                  {[
                    p.dormitorios ? `${p.dormitorios} dorm` : null,
                    p.banos ? `${p.banos} baños` : null,
                    p.ambientes ? `${p.ambientes} amb` : null,
                    p.cocheras ? `${p.cocheras} coch` : null,
                    p.m2Cubiertos ? `${p.m2Cubiertos} m²` : null,
                    p.m2Terreno ? `${p.m2Terreno} m² terreno` : null,
                    p.hectareas ? `${p.hectareas} ha` : null,
                ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">
                  {p.operacion === "VENTA" ? "Venta" : "Alquiler"} · {p.tipo}
                </span>
                {p.precio && (
                  <span className="font-bold text-orion-navy dark:text-orion-gold">
                    {p.moneda} {p.precio.toLocaleString("es-UY")}
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
