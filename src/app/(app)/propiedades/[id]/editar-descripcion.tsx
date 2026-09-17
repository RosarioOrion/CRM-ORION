"use client";

import { useActionState, useEffect, useState } from "react";
import { actualizarDescripcion, type DescripcionState } from "../actions";

const initialState: DescripcionState = {};

export function EditarDescripcion({
  propiedadId,
  descripcionInicial,
}: {
  propiedadId: string;
  descripcionInicial: string | null;
}) {
  const accionConId = actualizarDescripcion.bind(null, propiedadId);
  const [state, formAction, pending] = useActionState(accionConId, initialState);
  const [abierto, setAbierto] = useState(false);
  const [descripcion, setDescripcion] = useState(descripcionInicial ?? "");

  useEffect(() => {
    setDescripcion(descripcionInicial ?? "");
  }, [descripcionInicial]);

  useEffect(() => {
    if (state?.ok && !pending) setAbierto(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.ok, pending]);

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Descripción
        </p>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold"
        >
          {abierto ? "Cancelar" : descripcion ? "Editar" : "+ Agregar descripción"}
        </button>
      </div>

      {!abierto && (
        <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">
          {descripcion || (
            <span className="text-gray-400">Todavía no cargaste una descripción.</span>
          )}
        </p>
      )}

      {abierto && (
        <form action={formAction} className="flex flex-col gap-2">
          <textarea
            name="descripcion"
            rows={5}
            defaultValue={descripcion}
            placeholder="Descripción de la propiedad (para la ficha y para publicar en portales)…"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-800"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-orion-navy px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
            {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
          </div>
        </form>
      )}
    </div>
  );
}
