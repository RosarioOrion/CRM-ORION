"use client";

import { useState, useTransition } from "react";
import { reactivarPropiedad } from "../actions";

/** "Volver al mercado": para propiedades suspendidas, reservadas, cerradas, vendidas o alquiladas. */
export function ReactivarPropiedad({ propiedadId, estadoLabel }: { propiedadId: string; estadoLabel: string }) {
  const [abierto, setAbierto] = useState(false);
  const [reiniciar, setReiniciar] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();

  return (
    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          Esta propiedad está <b>{estadoLabel.toLowerCase()}</b>. Si se cayó la operación o el dueño vuelve a
          ofrecerla, podés volver a ponerla en el mercado.
        </p>
        {!abierto && (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            ↩ Reactivar propiedad
          </button>
        )}
      </div>
      {abierto && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={reiniciar} onChange={(e) => setReiniciar(e.target.checked)} />
            Reiniciar el ciclo del Pipeline desde hoy (semana 1)
          </label>
          <button
            type="button"
            disabled={pendiente}
            onClick={() =>
              start(async () => {
                const r = await reactivarPropiedad(propiedadId, reiniciar);
                if (!r.ok) setError(r.error ?? "No se pudo reactivar.");
                else setAbierto(false);
              })
            }
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {pendiente ? "…" : "Confirmar: volver a Activa"}
          </button>
          <button type="button" onClick={() => setAbierto(false)} className="text-xs font-semibold hover:underline">
            Cancelar
          </button>
          {error && <p className="w-full text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
