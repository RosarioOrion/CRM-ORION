"use client";

import { useActionState, useEffect } from "react";
import { crearNovedad, type NovedadState } from "./actions";

const initialState: NovedadState = {};

export function NuevaNovedadForm() {
  const [state, formAction, pending] = useActionState(crearNovedad, initialState);

  useEffect(() => {
    if (state?.ok && !pending) {
      const form = document.getElementById("form-nueva-novedad") as HTMLFormElement | null;
      form?.reset();
    }
  }, [state?.ok, pending]);

  return (
    <form
      id="form-nueva-novedad"
      action={formAction}
      className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-800 dark:border-gray-700"
    >
      <p className="mb-3 text-sm font-semibold text-orion-navy dark:text-white">
        Publicar novedad
      </p>
      <div className="flex flex-col gap-3">
        <input
          name="titulo"
          placeholder="Título"
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
        <textarea
          name="cuerpo"
          placeholder="Contenido de la novedad..."
          required
          rows={3}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <input type="checkbox" name="destacada" />
          Marcar como destacada
        </label>
        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light disabled:opacity-60"
        >
          {pending ? "Publicando…" : "Publicar"}
        </button>
      </div>
    </form>
  );
}
