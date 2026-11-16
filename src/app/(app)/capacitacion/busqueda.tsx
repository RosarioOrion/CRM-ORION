import Link from "next/link";
import { buscarEnManual } from "@/lib/capacitacion-texto";
import { nombreMaterial } from "@/lib/manual-indice";
import type { Material } from "./datos";

// Buscador dentro de los PDF del manual: resultados por capítulo, con la
// página y un fragmento con la palabra resaltada. Al tocar, abre el visor en
// esa página.

export function CajaBusqueda({ q }: { q: string }) {
  return (
    <form action="/capacitacion" method="GET" className="mb-5 flex gap-2">
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder="🔎 Buscar dentro del manual: colchón, IVA, garantía ANDA, llamada en frío…"
        className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      />
      <button type="submit" className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white">
        Buscar
      </button>
    </form>
  );
}

export async function ResultadosBusqueda({ q, material }: { q: string; material: Material[] }) {
  const resultados = await buscarEnManual(q);
  const porId = new Map(material.map((m) => [m.id, m]));
  // Agrupados por material, en el orden del manual.
  const grupos = new Map<string, typeof resultados>();
  for (const r of resultados) {
    if (!porId.has(r.documentoId)) continue;
    grupos.set(r.documentoId, [...(grupos.get(r.documentoId) ?? []), r]);
  }
  const orden = [...grupos.keys()].sort(
    (a, b) => (porId.get(a)!.orden ?? 5000) - (porId.get(b)!.orden ?? 5000)
  );
  const total = [...grupos.values()].reduce((n, g) => n + g.length, 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {total === 0 ? (
            <>No se encontró “{q}” en el manual.</>
          ) : (
            <>
              “<strong>{q}</strong>” aparece en <strong>{total}</strong> página(s) de <strong>{orden.length}</strong> material(es).
            </>
          )}
        </p>
        <Link href="/capacitacion" className="text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold">
          ✕ Limpiar búsqueda
        </Link>
      </div>
      {total === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">
          Probá con otra palabra o con menos palabras. La búsqueda ignora mayúsculas y tildes. Solo se busca dentro de los
          PDF subidos a Orion (no en los que son un link).
        </p>
      )}
      <div className="flex flex-col gap-3">
        {orden.map((id) => {
          const m = porId.get(id)!;
          const hits = grupos.get(id)!;
          return (
            <div key={id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <Link href={`/capacitacion/${id}`} className="font-semibold text-orion-navy hover:underline dark:text-white">
                {nombreMaterial(m.clase, m.numero, m.titulo)}
              </Link>
              <span className="ml-2 text-xs text-gray-400">{hits.length} página(s)</span>
              <ul className="mt-2 flex flex-col gap-1.5">
                {hits.map((h) => (
                  <li key={h.pagina}>
                    <Link
                      href={`/capacitacion/${id}?pagina=${h.pagina}&q=${encodeURIComponent(q)}`}
                      className="flex gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/40"
                    >
                      <span className="w-14 shrink-0 font-semibold text-orion-gold">Pág. {h.pagina}</span>
                      <span className="text-gray-600 dark:text-gray-300">
                        {h.antes}
                        <mark className="rounded bg-orion-gold/40 px-0.5 text-gray-900 dark:text-white">{h.coincide}</mark>
                        {h.despues}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
