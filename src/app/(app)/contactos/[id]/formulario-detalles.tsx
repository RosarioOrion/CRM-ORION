"use client";

import { useActionState, useState } from "react";
import { actualizarDetalles, type DetallesState } from "../actions";
import {
  ORIGENES_CONTACTO,
  ORIGEN_LABEL,
  ORIGEN_DETALLE_PLACEHOLDER,
  type OrigenContacto,
} from "@/lib/contactos";

const initialState: DetallesState = {};

export function FormularioDetalles({
  contactoId,
  origenActual,
  origenDetalleActual,
  notasActuales,
}: {
  contactoId: string;
  origenActual: string;
  origenDetalleActual: string | null;
  notasActuales: string | null;
}) {
  const actualizarConId = actualizarDetalles.bind(null, contactoId);
  const [state, formAction, pending] = useActionState(
    actualizarConId,
    initialState
  );
  const [origen, setOrigen] = useState(origenActual as OrigenContacto);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
          Origen
        </label>
        <select
          name="origen"
          value={origen}
          onChange={(e) => setOrigen(e.target.value as OrigenContacto)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          {ORIGENES_CONTACTO.map((o) => (
            <option key={o} value={o}>
              {ORIGEN_LABEL[o]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
          ¿Cuál?
        </label>
        <input
          name="origenDetalle"
          defaultValue={origenDetalleActual ?? ""}
          placeholder={ORIGEN_DETALLE_PLACEHOLDER[origen]}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
          Notas
        </label>
        <textarea
          name="notas"
          defaultValue={notasActuales ?? ""}
          rows={4}
          placeholder="Notas sobre este contacto..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        {state?.ok && (
          <span className="text-xs font-semibold text-green-600 dark:text-green-400">
            Guardado ✓
          </span>
        )}
        {state?.error && (
          <span className="text-xs font-semibold text-red-600 dark:text-red-400">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
