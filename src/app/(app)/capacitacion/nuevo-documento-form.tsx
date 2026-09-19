"use client";

import { useActionState, useState } from "react";
import { subirDocumentoCapacitacion, type DocumentoState } from "./actions";

const initialState: DocumentoState = {};

export function NuevoDocumentoForm() {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction, pending] = useActionState(
    subirDocumentoCapacitacion,
    initialState
  );

  return (
    <div className="mb-6">
      {!abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="flex items-center gap-2 rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light"
        >
          + Nuevo documento
        </button>
      ) : (
        <form
          action={formAction}
          key={state.ok ?? "form"}
          className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-orion-navy dark:text-white">
              Nuevo documento
            </p>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Cancelar ✕
            </button>
          </div>

          <input
            name="titulo"
            placeholder="Título *"
            required
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
          />
          <textarea
            name="descripcion"
            placeholder="Descripción (opcional)"
            rows={2}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
          />
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              Subir PDF (hasta 15MB)
            </label>
            <input
              type="file"
              name="archivo"
              accept="application/pdf"
              className="text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orion-navy file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-orion-navy-light dark:text-gray-300"
            />
          </div>
          <p className="text-xs text-gray-400">— o, para archivos más pesados —</p>
          <input
            name="link"
            placeholder="Link al documento (Drive, etc.)"
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
          />
          <input
            name="paginas"
            type="number"
            placeholder="Páginas (opcional)"
            className="w-32 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
          />

          {state.error && <p className="text-xs text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar documento"}
          </button>
        </form>
      )}
    </div>
  );
}
