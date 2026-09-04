"use client";

import { useTransition } from "react";
import { actualizarEstado } from "../actions";
import { ESTADOS_PROPIEDAD, ESTADO_LABEL } from "@/lib/propiedades";

export function CambiarEstado({
  propiedadId,
  estadoActual,
}: {
  propiedadId: string;
  estadoActual: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={estadoActual}
      disabled={pending}
      onChange={(e) => {
        const nuevoEstado = e.target.value;
        startTransition(() => {
          actualizarEstado(propiedadId, nuevoEstado);
        });
      }}
      className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 outline-none focus:border-orion-navy disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
    >
      {ESTADOS_PROPIEDAD.map((estado) => (
        <option key={estado} value={estado}>
          {ESTADO_LABEL[estado]}
        </option>
      ))}
    </select>
  );
}
