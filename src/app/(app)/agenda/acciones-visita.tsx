"use client";

import { useState, useTransition } from "react";
import { cambiarEstadoVisita, eliminarVisita } from "./actions";
import type { EstadoVisita } from "@/lib/visitas";

export function AccionesVisita({
  visitaId,
  estado,
}: {
  visitaId: string;
  estado: EstadoVisita;
}) {
  const [pending, startTransition] = useTransition();
  const [eliminando, setEliminando] = useState(false);
  const [oculta, setOculta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function marcar(nuevoEstado: EstadoVisita) {
    setError(null);
    let resultado: string | undefined;
    if (nuevoEstado === "REALIZADA") {
      resultado =
        window.prompt(
          "¿Cómo salió? (opcional — ej. interesado, va a pensarlo, no le gustó...)"
        ) ?? undefined;
    }
    startTransition(() => {
      cambiarEstadoVisita(visitaId, nuevoEstado, resultado).catch((e) =>
        setError(e instanceof Error ? e.message : "No se pudo actualizar.")
      );
    });
  }

  function handleEliminar() {
    const confirmado = window.confirm("¿Seguro que querés eliminar esta visita?");
    if (!confirmado) return;

    setEliminando(true);
    eliminarVisita(visitaId)
      .then(() => setOculta(true))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "No se pudo eliminar.");
        setEliminando(false);
      });
  }

  if (oculta) return null;

  return (
    <div className="flex flex-col items-end gap-1.5">
      {estado === "PROGRAMADA" && (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            disabled={pending}
            onClick={() => marcar("REALIZADA")}
            className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
          >
            ✅ Realizada
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => marcar("NO_SE_PRESENTO")}
            className="rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            No se presentó
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => marcar("CANCELADA")}
            className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300"
          >
            Cancelar
          </button>
        </div>
      )}
      <button
        type="button"
        disabled={eliminando}
        onClick={handleEliminar}
        className="text-xs font-semibold text-gray-400 hover:text-red-600 disabled:opacity-60"
      >
        {eliminando ? "…" : "Eliminar"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
