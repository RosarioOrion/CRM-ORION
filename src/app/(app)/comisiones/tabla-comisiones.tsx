"use client";

import { useState, useTransition } from "react";
import { marcarComisionPagada } from "./actions";

type Comision = {
  id: string;
  concepto: string;
  porcentaje: number;
  monto: number;
  pagada: boolean;
  beneficiarioNombre: string;
  propiedadNombre: string;
  tipoOperacion: "VENTA" | "ALQUILER";
  creadoEn: string;
};

export function TablaComisiones({ comisiones, esAdmin }: { comisiones: Comision[]; esAdmin: boolean }) {
  const [, startTransition] = useTransition();
  const [pagadas, setPagadas] = useState<Record<string, boolean>>(
    Object.fromEntries(comisiones.map((c) => [c.id, c.pagada]))
  );

  function toggle(id: string, pagada: boolean) {
    setPagadas((p) => ({ ...p, [id]: pagada }));
    startTransition(() => {
      marcarComisionPagada(id, pagada);
    });
  }

  if (comisiones.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:bg-gray-800 dark:border-gray-700">
        Todavía no hay comisiones. Se generan automáticamente al cerrar reservas.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400 dark:border-gray-700">
          <tr>
            <th className="px-4 py-3 font-semibold">Propiedad</th>
            <th className="px-4 py-3 font-semibold">Beneficiario</th>
            <th className="px-4 py-3 font-semibold">Concepto</th>
            <th className="px-4 py-3 font-semibold text-right">Monto</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
          </tr>
        </thead>
        <tbody>
          {comisiones.map((c) => {
            const pagada = pagadas[c.id];
            return (
              <tr key={c.id} className="border-b border-gray-100 last:border-0 dark:border-gray-700">
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  {c.propiedadNombre}
                  <span className="ml-1 text-[10px] text-gray-400">
                    ({c.tipoOperacion === "VENTA" ? "Venta" : "Alquiler"})
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  {c.beneficiarioNombre}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                  {c.concepto}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-orion-navy dark:text-white">
                  USD {c.monto.toLocaleString("es-UY")}
                </td>
                <td className="px-4 py-3">
                  {esAdmin ? (
                    <button
                      type="button"
                      onClick={() => toggle(c.id, !pagada)}
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold transition ${
                        pagada
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400"
                      }`}
                    >
                      {pagada ? "✓ Cobrado" : "Pendiente"}
                    </button>
                  ) : (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        pagada
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                      }`}
                    >
                      {pagada ? "✓ Cobrado" : "Pendiente"}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
