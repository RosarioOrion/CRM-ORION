"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  diagnosticarFotos,
  vaciarFotosPropiedad,
  type DiagnosticoFotos,
} from "./actions";

export function DiagnosticoFotos() {
  const [filas, setFilas] = useState<DiagnosticoFotos[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [reparando, setReparando] = useState<string | null>(null);

  function cargar() {
    startTransition(async () => {
      const r = await diagnosticarFotos();
      setFilas(r);
    });
  }

  async function reparar(id: string) {
    const confirmado = window.confirm(
      "Esto borra TODAS las fotos de esta propiedad para recuperarla de un error. ¿Continuar?"
    );
    if (!confirmado) return;
    setReparando(id);
    try {
      await vaciarFotosPropiedad(id);
      cargar();
    } finally {
      setReparando(null);
    }
  }

  return (
    <div className="mt-10">
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-orion-navy dark:text-white">
          Diagnóstico de fotos por propiedad
        </h2>
        <button
          type="button"
          disabled={pending}
          onClick={cargar}
          className="rounded-lg border border-orion-navy px-3 py-1.5 text-xs font-semibold text-orion-navy transition hover:bg-orion-navy/5 disabled:opacity-50 dark:border-orion-gold dark:text-orion-gold"
        >
          {pending ? "Consultando…" : "Consultar"}
        </button>
      </div>

      {filas && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase text-gray-400 dark:border-gray-700">
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Fotos</th>
                <th className="px-3 py-2">Peso</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-gray-100 last:border-0 dark:border-gray-700"
                >
                  <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-200">
                    <Link
                      href={`/propiedades/${f.id}`}
                      className="text-orion-navy hover:underline dark:text-orion-gold"
                    >
                      {f.codigo}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-3 py-2 text-gray-600 dark:text-gray-300">
                    {f.titulo}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{f.tipo}</td>
                  <td className="px-3 py-2 text-gray-500">{f.cantidad ?? "—"}</td>
                  <td
                    className={`px-3 py-2 font-semibold ${
                      f.kb > 5000 ? "text-red-600" : "text-gray-500"
                    }`}
                  >
                    {f.kb.toLocaleString("es-UY")} KB
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      disabled={reparando === f.id}
                      onClick={() => reparar(f.id)}
                      className="rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      {reparando === f.id ? "…" : "Vaciar fotos"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
