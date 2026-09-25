"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { agregarPortalPublicado, eliminarPortalPublicado, type PortalState } from "../actions";
import { PORTALES_SUGERIDOS } from "@/lib/portales";

type Portal = {
  id: string;
  portal: string;
  url: string;
};

const initialState: PortalState = {};

export function RegistroPortales({
  propiedadId,
  portalesIniciales,
  soloLectura = false,
}: {
  propiedadId: string;
  portalesIniciales: Portal[];
  soloLectura?: boolean;
}) {
  const accionConId = agregarPortalPublicado.bind(null, propiedadId);
  const [state, formAction, pending] = useActionState(accionConId, initialState);
  const [abierto, setAbierto] = useState(false);
  const [portales, setPortales] = useState(portalesIniciales);
  const [, startTransition] = useTransition();
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  useEffect(() => {
    setPortales(portalesIniciales);
  }, [portalesIniciales]);

  useEffect(() => {
    if (state?.ok && !pending) setAbierto(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.ok, pending]);

  function handleEliminar(portalId: string) {
    setEliminandoId(portalId);
    setPortales((ps) => ps.filter((p) => p.id !== portalId));
    startTransition(() => {
      eliminarPortalPublicado(portalId, propiedadId).finally(() => setEliminandoId(null));
    });
  }

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Publicada en
        </p>
        {!soloLectura && (
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold"
        >
          {abierto ? "Cancelar" : "+ Agregar link"}
        </button>
        )}
      </div>

      {portales.length === 0 && !abierto && (
        <p className="text-sm text-gray-400">
          {soloLectura ? "Sin portales registrados." : "Todavía no registraste dónde está publicada."}
        </p>
      )}

      {portales.length > 0 && (
        <div className="mb-2 flex flex-col gap-1.5">
          {portales.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700"
            >
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-orion-navy hover:underline dark:text-orion-gold"
              >
                🔗 {p.portal}
              </a>
              {!soloLectura && (
              <button
                type="button"
                disabled={eliminandoId === p.id}
                onClick={() => handleEliminar(p.id)}
                className="shrink-0 text-xs font-semibold text-gray-400 hover:text-red-600 disabled:opacity-60"
              >
                {eliminandoId === p.id ? "…" : "Eliminar"}
              </button>
              )}
            </div>
          ))}
        </div>
      )}

      {abierto && !soloLectura && (
        <form
          action={formAction}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-orion-bg p-3 dark:border-gray-700 dark:bg-gray-900"
        >
          <select
            name="portal"
            defaultValue=""
            required
            className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="" disabled>
              Portal…
            </option>
            {PORTALES_SUGERIDOS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            name="url"
            type="url"
            placeholder="https://..."
            required
            className="min-w-[200px] flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-orion-navy px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
          {state?.error && (
            <p className="w-full text-xs text-red-600">{state.error}</p>
          )}
        </form>
      )}
    </div>
  );
}
