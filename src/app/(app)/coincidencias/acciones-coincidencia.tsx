"use client";

import { useState, useTransition } from "react";
import { marcarCoincidenciaAvisada, quitarAvisoCoincidencia } from "./actions";

export function AccionesCoincidencia({
  busquedaId,
  propiedadId,
  avisoId,
}: {
  busquedaId: string;
  propiedadId: string;
  avisoId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [avisoLocal, setAvisoLocal] = useState(avisoId);

  function avisar() {
    setError(null);
    const nota =
      window.prompt("¿Algo para anotar sobre este aviso? (opcional)") ?? undefined;
    startTransition(() => {
      marcarCoincidenciaAvisada(busquedaId, propiedadId, nota)
        .then(() => setAvisoLocal("pendiente-refresh"))
        .catch((e) => setError(e instanceof Error ? e.message : "No se pudo avisar."));
    });
  }

  function deshacer() {
    if (!avisoLocal || avisoLocal === "pendiente-refresh") return;
    setError(null);
    startTransition(() => {
      quitarAvisoCoincidencia(avisoLocal)
        .then(() => setAvisoLocal(null))
        .catch((e) => setError(e instanceof Error ? e.message : "No se pudo deshacer."));
    });
  }

  if (avisoLocal) {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          ✅ Avisado
        </span>
        {avisoLocal !== "pendiente-refresh" && (
          <button
            type="button"
            disabled={pending}
            onClick={deshacer}
            className="text-[11px] font-semibold text-gray-400 hover:text-red-600 disabled:opacity-60"
          >
            Deshacer
          </button>
        )}
        {error && <p className="text-[11px] text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={avisar}
        className="rounded-lg bg-orion-navy px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-orion-navy-light disabled:opacity-60"
      >
        {pending ? "…" : "📣 Avisar al cliente"}
      </button>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
