"use client";

import { useState, useTransition } from "react";
import { actualizarActivaBusqueda, eliminarBusqueda } from "./actions";

export function AccionesBusqueda({
  busquedaId,
  activa,
}: {
  busquedaId: string;
  activa: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [eliminando, setEliminando] = useState(false);
  const [oculta, setOculta] = useState(false);

  function toggleActiva() {
    startTransition(() => {
      actualizarActivaBusqueda(busquedaId, !activa);
    });
  }

  function handleEliminar() {
    const confirmado = window.confirm(
      "¿Seguro que querés eliminar esta búsqueda?"
    );
    if (!confirmado) return;

    setEliminando(true);
    eliminarBusqueda(busquedaId).then(() => {
      setOculta(true);
    });
  }

  if (oculta) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={toggleActiva}
        className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600 transition hover:border-orion-navy hover:text-orion-navy disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:text-white"
      >
        {activa ? "Desactivar" : "Reactivar"}
      </button>
      <button
        type="button"
        disabled={eliminando}
        onClick={handleEliminar}
        className="rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        {eliminando ? "…" : "Eliminar"}
      </button>
    </div>
  );
}
