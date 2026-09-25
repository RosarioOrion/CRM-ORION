import Link from "next/link";
import type { Metadata } from "next";
import { MarcoSitio } from "@/components/sitio/marco";
import { TarjetaSitio } from "@/components/sitio/tarjeta";
import { NOMBRE_SITIO, buscarPropiedades, opcionesFiltros, type Filtros } from "@/lib/sitio";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}): Promise<Metadata> {
  const f = await searchParams;
  const que =
    f.operacion === "VENTA" ? "en venta" : f.operacion === "ALQUILER" ? "en alquiler" : "en venta y alquiler";
  return {
    title: `${f.tipo ? `${f.tipo}s` : "Propiedades"} ${que}${f.zona ? ` en ${f.zona}` : ""} — ${NOMBRE_SITIO}`,
  };
}

const campo =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-orion-gold";

export default async function Inmuebles({ searchParams }: { searchParams: Promise<Filtros> }) {
  const f = await searchParams;
  const [{ filas, total, pagina, paginas }, opciones] = await Promise.all([
    buscarPropiedades(f),
    opcionesFiltros(),
  ]);

  const linkPagina = (n: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v && k !== "pagina") p.set(k, String(v));
    if (n > 1) p.set("pagina", String(n));
    const qs = p.toString();
    return qs ? `/inmuebles?${qs}` : "/inmuebles";
  };

  const titulo =
    f.operacion === "VENTA"
      ? "Propiedades en venta"
      : f.operacion === "ALQUILER"
        ? "Propiedades en alquiler"
        : "Todas las propiedades";

  return (
    <MarcoSitio>
      <div className="bg-orion-navy">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{titulo}</h1>
          <p className="mt-1 text-sm text-white/70">
            {total} {total === 1 ? "propiedad encontrada" : "propiedades encontradas"}
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-6 lg:grid-cols-[260px_1fr]">
        {/* Filtros */}
        <aside>
          <form
            action="/inmuebles"
            method="get"
            className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-black/5 lg:sticky lg:top-20"
          >
            <p className="text-sm font-bold text-orion-navy">Filtrar</p>
            <select name="operacion" defaultValue={f.operacion ?? ""} className={campo}>
              <option value="">Venta y alquiler</option>
              <option value="VENTA">Venta</option>
              <option value="ALQUILER">Alquiler</option>
            </select>
            <select name="tipo" defaultValue={f.tipo ?? ""} className={campo}>
              <option value="">Todos los tipos</option>
              {opciones.tipos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              name="zona"
              list="zonas"
              defaultValue={f.zona ?? ""}
              placeholder="Barrio o ciudad"
              className={campo}
            />
            <datalist id="zonas">
              {opciones.zonas.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
            <select name="dormitorios" defaultValue={f.dormitorios ?? ""} className={campo}>
              <option value="">Dormitorios</option>
              <option value="1">1 o más</option>
              <option value="2">2 o más</option>
              <option value="3">3 o más</option>
              <option value="4">4 o más</option>
            </select>
            <div>
              <p className="mb-1 text-xs font-semibold text-gray-500">Precio</p>
              <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5">
                <select name="moneda" defaultValue={f.moneda ?? "USD"} className={`${campo} px-2`}>
                  <option value="USD">USD</option>
                  <option value="UYU">$</option>
                </select>
                <input name="precioMin" inputMode="numeric" defaultValue={f.precioMin ?? ""} placeholder="Mín." className={campo} />
                <input name="precioMax" inputMode="numeric" defaultValue={f.precioMax ?? ""} placeholder="Máx." className={campo} />
              </div>
            </div>
            <select name="orden" defaultValue={f.orden ?? ""} className={campo}>
              <option value="">Más recientes</option>
              <option value="precio_asc">Menor precio</option>
              <option value="precio_desc">Mayor precio</option>
            </select>
            <button
              type="submit"
              className="w-full rounded-lg bg-orion-gold py-2.5 text-sm font-bold text-white hover:brightness-110"
            >
              Aplicar filtros
            </button>
            <Link href="/inmuebles" className="block text-center text-xs font-semibold text-gray-500 hover:text-orion-navy">
              Limpiar filtros
            </Link>
          </form>
        </aside>

        {/* Resultados */}
        <section>
          {filas.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-black/5">
              <p className="text-3xl">🔍</p>
              <p className="mt-2 font-semibold text-orion-navy">No encontramos propiedades con esos filtros</p>
              <p className="mt-1 text-sm text-gray-500">Probá con otra zona o sacá algún filtro.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filas.map((p) => (
                <TarjetaSitio key={p.id} p={p} />
              ))}
            </div>
          )}

          {paginas > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2 text-sm">
              {pagina > 1 && (
                <Link href={linkPagina(pagina - 1)} className="rounded-lg bg-white px-3 py-2 ring-1 ring-black/10 hover:bg-gray-50">
                  ← Anterior
                </Link>
              )}
              <span className="px-2 text-gray-500">
                Página {pagina} de {paginas}
              </span>
              {pagina < paginas && (
                <Link href={linkPagina(pagina + 1)} className="rounded-lg bg-white px-3 py-2 ring-1 ring-black/10 hover:bg-gray-50">
                  Siguiente →
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </MarcoSitio>
  );
}
