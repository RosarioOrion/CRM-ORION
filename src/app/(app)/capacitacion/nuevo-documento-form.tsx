"use client";

import { useActionState, useState } from "react";
import { subirDocumentoCapacitacion, type DocumentoState } from "./actions";
import { visorDeLink, type TipoMaterial } from "@/lib/capacitacion";

const initialState: DocumentoState = {};

const inputClass =
  "rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900";

export function NuevoDocumentoForm() {
  const [tipo, setTipo] = useState<TipoMaterial>("PDF");
  const [state, formAction, pending] = useActionState(
    subirDocumentoCapacitacion,
    initialState
  );
  const esVideo = tipo === "VIDEO";

  return (
    <form
      action={formAction}
      key={state.ok ?? "form"}
      className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      <input type="hidden" name="tipo" value={tipo} />
      <div className="flex gap-2">
        {(
          [
            { valor: "PDF", label: "📄 Documento PDF" },
            { valor: "VIDEO", label: "🎬 Clase grabada" },
          ] as const
        ).map((op) => (
          <button
            key={op.valor}
            type="button"
            onClick={() => setTipo(op.valor)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              tipo === op.valor
                ? "bg-orion-navy text-white"
                : "border border-gray-300 text-gray-600 hover:border-orion-navy dark:border-gray-600 dark:text-gray-300"
            }`}
          >
            {op.label}
          </button>
        ))}
      </div>

      <input name="titulo" placeholder="Título *" required className={inputClass} />
      <textarea
        name="descripcion"
        placeholder="Descripción (opcional): de qué trata, para quién es…"
        rows={2}
        className={inputClass}
      />

      {esVideo ? (
        <LinkClase />
      ) : (
        <>
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
          <input name="link" placeholder="Link al documento (Drive, etc.)" className={inputClass} />
          <input
            name="paginas"
            type="number"
            placeholder="Páginas (opcional)"
            className={`w-40 ${inputClass}`}
          />
        </>
      )}

      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.ok && !state.error && (
        <p className="text-xs text-green-600">✓ Guardado. Ya está en la biblioteca.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Guardando…" : esVideo ? "Guardar clase" : "Guardar documento"}
      </button>
    </form>
  );
}

/** Link de la clase grabada, con aviso en vivo si no se puede ver en Orion. */
function LinkClase() {
  const [link, setLink] = useState("");
  const noEmbebible = /^https?:\/\//i.test(link.trim()) && !visorDeLink(link.trim());
  return (
    <div className="flex flex-col gap-1">
      <input
        name="link"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Link de la clase (YouTube, Vimeo, Google Drive o Loom) *"
        required
        className={inputClass}
      />
      <p className="text-xs text-gray-400">
        Subí el video a YouTube como “No listado” (o a Drive compartido con el equipo) y pegá el
        link: se verá dentro de Orion.
      </p>
      {noEmbebible && (
        <p className="text-xs text-amber-600">
          Ese link no se puede reproducir dentro de Orion; se abrirá en otra pestaña.
        </p>
      )}
    </div>
  );
}
