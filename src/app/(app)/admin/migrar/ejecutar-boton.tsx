"use client";

import { useState, useTransition } from "react";
import { ejecutarMigracion, type PasoMigracion } from "./actions";

export function EjecutarMigracionBoton() {
  const [resultados, setResultados] = useState<PasoMigracion[] | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await ejecutarMigracion();
            setResultados(r);
          })
        }
        className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white hover:bg-orion-navy-light disabled:opacity-50"
      >
        {pending ? "Ejecutando..." : "Ejecutar migración"}
      </button>

      {resultados && (
        <ul className="mt-4 space-y-1 rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
          {resultados.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <span>{r.ok ? "✅" : "❌"}</span>
              <span>
                <span className="font-medium text-gray-800 dark:text-gray-100">
                  {r.paso}:
                </span>{" "}
                <span className="text-gray-500 dark:text-gray-400">
                  {r.detalle}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
