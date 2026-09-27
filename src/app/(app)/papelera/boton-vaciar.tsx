"use client";

import { useState, useTransition } from "react";
import { vaciarMiPapelera } from "./actions";

export function BotonVaciar({ cantidad, soloLoMio }: { cantidad: number; soloLoMio: boolean }) {
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function vaciar() {
    const texto = `¿Vaciar ${soloLoMio ? "tu " : "la "}papelera?\n\nSe borran definitivamente ${cantidad} elemento(s)${
      soloLoMio ? " tuyos (lo de otros agentes no se toca)" : ""
    }. Esto no se puede deshacer.`;
    if (!window.confirm(texto)) return;
    setError(null);
    start(async () => {
      const r = await vaciarMiPapelera();
      if (!r.ok) setError(r.error ?? "No se pudo vaciar.");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={vaciar}
        disabled={pendiente}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        {pendiente ? "Vaciando…" : soloLoMio ? "🗑 Vaciar mi papelera" : "🗑 Vaciar papelera"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
