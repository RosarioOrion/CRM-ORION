import Link from "next/link";
import { db } from "@/db";
import { busquedas, contactos, propiedades } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { eq, and, or, ilike, desc, count } from "drizzle-orm";
import { NuevaBusquedaForm } from "./nueva-busqueda-form";
import { AccionesBusqueda } from "./acciones-busqueda";

const TABS = [
  { key: "activas", label: "Activas" },
  { key: "todas", label: "Todas" },
  { key: "venta", label: "Venta" },
  { key: "alquiler", label: "Alquiler" },
];

function formatearPrecio(min: number | null, max: number | null) {
  if (min && max) return `USD ${min.toLocaleString()} – ${max.toLocaleString()}`;
  if (min) return `Desde USD ${min.toLocaleString()}`;
  if (max) return `Hasta USD ${max.toLocaleString()}`;
  return "Sin rango definido";
}

export default async function BusquedasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const tabParam = params.tab ?? "activas";
  const tabActivo = TABS.some((t) => t.key === tabParam) ? tabParam : "activas";

  const sesion = await obtenerSesion();

  const misContactos = await db
    .select({ id: contactos.id, nombre: contactos.nombre })
    .from(contactos)
    .where(eq(contactos.agenteId, sesion!.userId))
    .orderBy(contactos.nombre);

  const condiciones = [eq(contactos.agenteId, sesion!.userId)];
  if (tabActivo === "activas") {
    condiciones.push(eq(busquedas.activa, true));
  } else if (tabActivo === "venta") {
    condiciones.push(eq(busquedas.operacion, "VENTA"));
  } else if (tabActivo === "alquiler") {
    condiciones.push(eq(busquedas.operacion, "ALQUILER"));
  }
  if (q) {
    condiciones.push(
      or(ilike(busquedas.zona, `%${q}%`), ilike(busquedas.tipo, `%${q}%`))!
    );
  }

  const filas = await db
    .select({
      id: busquedas.id,
      operacion: busquedas.operacion,
      tipo: busquedas.tipo,
      zona: busquedas.zona,
      precioMin: busquedas.precioMin,
      precioMax: busquedas.precioMax,
      activa: busquedas.activa,
      vence: busquedas.vence,
      contactoId: contactos.id,
      contactoNombre: contactos.nombre,
    })
    .from(busquedas)
    .innerJoin(contactos, eq(busquedas.contactoId, contactos.id))
    .where(and(...condiciones))
    .orderBy(desc(busquedas.creadoEn));

  // Para cada búsqueda activa, cuenta cuántas propiedades activas del agente
  // matchean operación + tipo + zona (matching simple, sin filtrar por precio
  // todavía porque las propiedades pueden estar en USD o UYU).
  const conteos = await Promise.all(
    filas.map(async (f) => {
      const [{ total }] = await db
        .select({ total: count() })
        .from(propiedades)
        .where(
          and(
            eq(propiedades.agenteId, sesion!.userId),
            eq(propiedades.estado, "ACTIVA"),
            eq(propiedades.operacion, f.operacion),
            ilike(propiedades.tipo, f.tipo),
            ilike(propiedades.zona, `%${f.zona}%`)
          )
        );
      return total;
    })
  );

  function hrefTab(tab: string) {
    const sp = new URLSearchParams();
    sp.set("tab", tab);
    if (q) sp.set("q", q);
    return `/busquedas?${sp.toString()}`;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-orion-navy dark:text-white">
            Búsquedas
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Lo que están buscando tus contactos — {filas.length} búsqueda(s)
          </p>
        </div>

        <form action="/busquedas" method="GET" className="flex items-center gap-2">
          <input type="hidden" name="tab" value={tabActivo} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por zona o tipo..."
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

      <div className="mb-6">
        <NuevaBusquedaForm contactos={misContactos} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={hrefTab(t.key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              tabActivo === t.key
                ? "bg-orion-navy text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-orion-navy dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filas.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:bg-gray-800 dark:border-gray-700">
            {q
              ? "No hay búsquedas que coincidan con lo que buscaste."
              : "Todavía no cargaste ninguna búsqueda para este filtro."}
          </p>
        ) : (
          filas.map((f, i) => (
            <div
              key={f.id}
              className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-gray-800 dark:border-gray-700 ${
                f.activa ? "" : "opacity-60"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/contactos/${f.contactoId}`}
                      className="font-semibold text-orion-navy hover:underline dark:text-orion-gold"
                    >
                      {f.contactoNombre}
                    </Link>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        f.operacion === "VENTA"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      }`}
                    >
                      {f.operacion === "VENTA" ? "Venta" : "Alquiler"}
                    </span>
                    {!f.activa && (
                      <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        Inactiva
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                    {f.tipo} en {f.zona}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {formatearPrecio(f.precioMin, f.precioMax)}
                    {f.vence
                      ? ` · vence ${new Date(f.vence).toLocaleDateString("es-UY")}`
                      : ""}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <AccionesBusqueda busquedaId={f.id} activa={f.activa} />
                  {conteos[i] > 0 ? (
                    <span className="rounded-full bg-orion-gold/20 px-2 py-0.5 text-xs font-semibold text-orion-navy dark:text-orion-gold">
                      {conteos[i]} propiedad{conteos[i] === 1 ? "" : "es"} que matchea{conteos[i] === 1 ? "" : "n"}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Sin match todavía</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
