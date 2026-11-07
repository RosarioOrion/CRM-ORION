"use client";

import Link from "next/link";
import { useState } from "react";
import {
  listarSinUbicacion,
  ubicarSinUbicacion,
  type PropiedadSinUbicacion,
  type ResultadoUbicacion,
} from "./ubicaciones-actions";

const TEXTO: Record<string, string> = {
  exacta: "✓ Ubicada por la dirección",
  calle: "✓ Ubicada por la calle (aproximada)",
  esquina: "✓ Ubicada por la esquina (aproximada)",
  barrio: "Solo se encontró el barrio: marcala a mano",
  departamento: "Solo se encontró el departamento: marcala a mano",
};

/** Admin: ubicar en el mapa las propiedades que quedaron sin ubicación. */
export function UbicarPropiedades() {
  const [lista, setLista] = useState<PropiedadSinUbicacion[] | null>(null);
  const [resultados, setResultados] = useState<Record<string, ResultadoUbicacion>>({});
  const [trabajando, setTrabajando] = useState(false);

  async function cargar() {
    setLista(await listarSinUbicacion());
    setResultados({});
  }

  async function ubicarTodas() {
    if (!lista) return;
    setTrabajando(true);
    for (const p of lista) {
      if (resultados[p.id]?.guardada) continue;
      try {
        const r = await ubicarSinUbicacion(p.id);
        setResultados((prev) => ({ ...prev, [p.id]: r }));
      } catch {
        setResultados((prev) => ({ ...prev, [p.id]: { id: p.id, codigo: p.codigo, precision: null, guardada: false } }));
      }
      // OpenStreetMap pide como máximo un pedido por segundo.
      await new Promise((r) => setTimeout(r, 1100));
    }
    setTrabajando(false);
  }

  return (
    <div className="mt-10">
      <h2 className="mb-2 text-lg font-semibold text-orion-navy dark:text-white">📍 Propiedades sin ubicación</h2>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        Las busca en OpenStreetMap por calle, esquina y barrio, y guarda las que encuentra por calle o esquina.
        Después conviene abrir cada una y revisar el marcador.
      </p>
      <button
        type="button"
        onClick={cargar}
        disabled={trabajando}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
      >
        Ver cuáles
      </button>
      {lista && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
          {lista.length === 0 ? (
            <p className="text-gray-400">Todas tienen ubicación. 🎉</p>
          ) : (
            <>
              <button
                type="button"
                onClick={ubicarTodas}
                disabled={trabajando}
                className="mb-3 rounded-lg bg-orion-navy px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {trabajando ? "Ubicando…" : `Ubicar las ${lista.length} automáticamente`}
              </button>
              <ul className="space-y-1">
                {lista.map((p) => {
                  const r = resultados[p.id];
                  return (
                    <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 py-1 last:border-0 dark:border-gray-700">
                      <Link href={`/propiedades/${p.id}?editar=1`} className="font-semibold text-orion-navy hover:underline dark:text-orion-gold">
                        {p.codigo}
                      </Link>
                      <span className="min-w-0 flex-1 truncate text-xs text-gray-500 dark:text-gray-400">
                        {[p.direccion, p.zona, p.departamento].filter(Boolean).join(", ") || "Sin dirección"}
                      </span>
                      {r && (
                        <span className={`text-xs ${r.guardada ? "text-emerald-600" : "text-amber-700 dark:text-amber-300"}`}>
                          {r.precision ? TEXTO[r.precision] : "No se encontró: marcala a mano"}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
