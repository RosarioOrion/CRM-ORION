"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resumenEliminarPropiedad, eliminarPropiedad } from "../actions";

/** Botón "Eliminar propiedad" (solo el agente a cargo). Pide confirmación mostrando lo que se borra. */
export function EliminarPropiedad({ propiedadId, codigo }: { propiedadId: string; codigo: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function eliminar() {
    setError(null);
    setOcupado(true);
    try {
      const d = await resumenEliminarPropiedad(propiedadId);
      const seBorra = [
        d.visitas && `${d.visitas} visita(s)`,
        d.portales && `${d.portales} registro(s) de portales`,
        d.pipeline && `${d.pipeline} acción(es) del pipeline`,
        d.coincidencias && `${d.coincidencias} coincidencia(s) avisada(s)`,
      ].filter(Boolean);
      const seDesvincula = [
        d.reservas && `${d.reservas} reserva(s) (quedan guardadas con el nombre)`,
        d.actividades && `${d.actividades} actividad(es) de la Agenda (quedan sin propiedad)`,
      ].filter(Boolean);

      let texto = `¿Eliminar la propiedad ${codigo}?\n\nQueda 30 días en la Papelera y la podés restaurar con todo lo suyo.`;
      if (seBorra.length) texto += `\n\nTambién van a la Papelera: ${seBorra.join(", ")}.`;
      if (seDesvincula.length) texto += `\n\nSe desvinculan: ${seDesvincula.join(", ")}.`;
      if (!window.confirm(texto)) return;

      const r = await eliminarPropiedad(propiedadId);
      if (r.ok) router.push("/propiedades");
      else setError(r.error ?? "No se pudo eliminar.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={eliminar}
        disabled={ocupado}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        {ocupado ? "Eliminando…" : "🗑 Eliminar propiedad"}
      </button>
      {error && <p className="max-w-xs text-right text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
