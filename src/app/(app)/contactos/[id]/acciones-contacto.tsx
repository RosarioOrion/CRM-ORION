"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archivarContacto, eliminarContacto, resumenEliminarContacto } from "../actions";

export function AccionesContacto({
  contactoId,
  archivado,
}: {
  contactoId: string;
  archivado: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function toggleArchivado() {
    startTransition(() => {
      archivarContacto(contactoId, !archivado);
    });
  }

  async function handleEliminar() {
    setError(null);
    setEliminando(true);
    try {
      const d = await resumenEliminarContacto(contactoId);
      if (d.propiedadesComoDueno.length > 0) {
        setError(
          `No se puede eliminar: es dueño de ${d.propiedadesComoDueno.join(", ")}. Eliminá esa propiedad primero (o asignale otro dueño).`
        );
        return;
      }
      const seBorra = [
        d.visitas && `${d.visitas} visita(s)`,
        d.busquedas && `${d.busquedas} búsqueda(s)`,
        d.captaciones && `${d.captaciones} captación(es)`,
      ].filter(Boolean);
      let texto =
        "¿Eliminar este contacto?\n\nQueda 30 días en la Papelera y lo podés restaurar con todo lo suyo.";
      if (seBorra.length) texto += `\n\nTambién van a la Papelera: ${seBorra.join(", ")}.`;
      if (d.actividades)
        texto += `\n\n${d.actividades} actividad(es) de la Agenda quedan sin contacto hasta que lo restaures.`;
      if (!window.confirm(texto)) return;

      const res = await eliminarContacto(contactoId);
      if (res.ok) router.push("/contactos");
      else setError(res.error ?? "No se pudo eliminar el contacto.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el contacto.");
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={toggleArchivado}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-orion-navy hover:text-orion-navy disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:text-white"
        >
          {archivado ? "Reactivar" : "Archivar"}
        </button>
        <button
          type="button"
          disabled={eliminando}
          onClick={handleEliminar}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          {eliminando ? "Eliminando…" : "Eliminar"}
        </button>
      </div>
      {error && (
        <p className="max-w-xs text-right text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
