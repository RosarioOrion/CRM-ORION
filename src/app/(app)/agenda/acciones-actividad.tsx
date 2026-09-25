"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cambiarEstadoActividad, eliminarActividad } from "./actions";
import type { EstadoActividad } from "@/lib/calendario";

export function AccionesActividad({
  actividadId,
  estado,
  esCaptacion = false,
}: {
  actividadId: string;
  estado: EstadoActividad;
  /** Visita de captación: al marcarla realizada ofrece crear la captación. */
  esCaptacion?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [eliminando, setEliminando] = useState(false);
  const [oculta, setOculta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function marcar(nuevoEstado: EstadoActividad) {
    setError(null);
    let resultado: string | undefined;
    if (nuevoEstado === "REALIZADA") {
      resultado = window.prompt("¿Cómo salió? (opcional)") ?? undefined;
    }
    startTransition(async () => {
      try {
        await cambiarEstadoActividad(actividadId, nuevoEstado, resultado);
        if (
          esCaptacion &&
          nuevoEstado === "REALIZADA" &&
          window.confirm("¿Querés cargar la captación ahora con estos datos?")
        ) {
          router.push(`/captaciones?desde=${actividadId}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo actualizar.");
      }
    });
  }

  function handleEliminar() {
    if (!window.confirm("¿Seguro que querés eliminar esta actividad?")) return;
    setEliminando(true);
    eliminarActividad(actividadId)
      .then(() => setOculta(true))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "No se pudo eliminar.");
        setEliminando(false);
      });
  }

  if (oculta) return null;

  return (
    <div className="flex flex-col items-end gap-1.5">
      {estado === "PENDIENTE" && (
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
