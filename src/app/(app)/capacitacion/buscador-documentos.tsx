"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fechaCorta, pesoLegible, TIPO_MATERIAL_LABEL } from "@/lib/capacitacion";
import type { Material } from "./datos";

const FILTROS = [
  { key: "todo", label: "Todo" },
  { key: "PDF", label: "📄 Documentos" },
  { key: "VIDEO", label: "🎬 Clases grabadas" },
] as const;

export function BuscadorDocumentos({ documentos }: { documentos: Material[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["key"]>("todo");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return documentos.filter(
      (d) =>
        (filtro === "todo" || d.tipo === filtro) &&
        (!q || `${d.titulo} ${d.descripcion ?? ""}`.toLowerCase().includes(q))
    );
  }, [busqueda, filtro, documentos]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFiltro(f.key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              filtro === f.key
                ? "bg-orion-navy text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:border-orion-navy dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {f.label}
            <span className="ml-1 opacity-70">
              {f.key === "todo" ? documentos.length : documentos.filter((d) => d.tipo === f.key).length}
            </span>
          </button>
        ))}
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por título o descripción…"
          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-orion-navy sm:ml-auto sm:w-64 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800">
          {documentos.length === 0
            ? "Todavía no hay material de capacitación."
            : "No hay material que coincida con la búsqueda."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((d) => {
            const peso = pesoLegible(d.archivoPesoBytes);
            const esVideo = d.tipo === "VIDEO";
            return (
              <Link
                key={d.id}
                href={`/capacitacion/${d.id}`}
                className="group flex gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-orion-navy hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl ${
                    esVideo ? "bg-red-50 dark:bg-red-900/30" : "bg-blue-50 dark:bg-blue-900/30"
                  }`}
                >
                  {esVideo ? "🎬" : "📄"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-orion-navy group-hover:underline dark:text-white">
                    {d.titulo}
                  </p>
                  {d.descripcion && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                      {d.descripcion}
                    </p>
                  )}
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400">
                    <span>{TIPO_MATERIAL_LABEL[d.tipo]}</span>
                    <span>·</span>
                    <span>{fechaCorta(d.creadoEn)}</span>
                    {d.paginas ? <span>· {d.paginas} pág.</span> : null}
                    {peso ? <span>· {peso}</span> : null}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-orion-navy dark:text-orion-gold">
                    {esVideo ? "▶ Ver clase" : "📖 Leer"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
