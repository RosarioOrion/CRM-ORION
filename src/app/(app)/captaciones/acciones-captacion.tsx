"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cambiarEstadoCaptacion,
  convertirEnPropiedad,
  eliminarCaptacion,
} from "./actions";
import { ESTADOS_CAPTACION, ESTADO_CAPTACION_LABEL } from "@/lib/captaciones";
import type { EstadoCaptacion } from "@/lib/captaciones";

export function AccionesCaptacion({
  captacionId,
  estado,
  yaConvertida,
}: {
  captacionId: string;
  estado: EstadoCaptacion;
  yaConvertida: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [publicando, setPublicando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [oculta, setOculta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const indiceActual = ESTADOS_CAPTACION.indexOf(estado);

  function moverA(nuevoEstado: EstadoCaptacion) {
    setError(null);
    startTransition(() => {
      cambiarEstadoCaptacion(captacionId, nuevoEstado).catch((e) =>
        setError(e instanceof Error ? e.message : "No se pudo mover.")
      );
    });
  }

  function handlePublicar() {
    setError(null);
    setPublicando(true);
    convertirEnPropiedad(captacionId)
      .then(() => {
        router.refresh();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo publicar."))
      .finally(() => setPublicando(false));
  }

  function handleEliminar() {
    const confirmado = window.confirm(
      "¿Seguro que querés eliminar esta captación?"
    );
    if (!confirmado) return;

    setEliminando(true);
    eliminarCaptacion(captacionId)
      .then(() => setOculta(true))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "No se pudo eliminar.");
        setEliminando(false);
      });
  }

  if (oculta) return null;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {indiceActual > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => moverA(ESTADOS_CAPTACION[indiceActual - 1])}
            className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600 transition hover:border-orion-navy hover:text-orion-navy disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:text-white"
          >
            ← {ESTADO_CAPTACION_LABEL[ESTADOS_CAPTACION[indiceActual - 1]]}
          </button>
        )}
        {indiceActual < ESTADOS_CAPTACION.length - 1 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => moverA(ESTADOS_CAPTACION[indiceActual + 1])}
            className="rounded-lg border border-orion-navy/30 bg-orion-navy/5 px-2 py-1 text-xs font-semibold text-orion-navy transition hover:bg-orion-navy/10 disabled:opacity-60 dark:border-orion-gold/30 dark:bg-orion-gold/10 dark:text-orion-gold"
          >
            {ESTADO_CAPTACION_LABEL[ESTADOS_CAPTACION[indiceActual + 1]]} →
          </button>
        )}
        <button
          type="button"
          disabled={eliminando}
          onClick={handleEliminar}
          className="rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          {eliminando ? "…" : "Eliminar"}
        </button>
      </div>

      {estado === "PARA_PUBLICAR" && !yaConvertida && (
        <button
          type="button"
          disabled={publicando}
          onClick={handlePublicar}
          className="rounded-lg bg-orion-gold px-3 py-1.5 text-xs font-semibold text-orion-navy transition hover:brightness-95 disabled:opacity-60"
        >
          {publicando ? "Publicando…" : "🏠 Publicar propiedad"}
        </button>
      )}

      {yaConvertida && (
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          ✅ Convertida en propiedad
        </span>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
