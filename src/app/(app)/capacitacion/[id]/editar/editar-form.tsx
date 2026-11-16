"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CamposIndice, type AreaOpcion, type IndiceInicial } from "../../campos-indice";
import { editarDocumentoCapacitacion, type DocumentoState } from "../../actions";

const initialState: DocumentoState = {};
const inputClass =
  "rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";

export type MaterialEditable = {
  id: string;
  tipo: "PDF" | "VIDEO";
  titulo: string;
  descripcion: string;
  link: string;
  paginas: number | null;
  archivoNombre: string | null;
  indice: IndiceInicial;
};

export function EditarDocumentoForm({ d, areas }: { d: MaterialEditable; areas: AreaOpcion[] }) {
  const [titulo, setTitulo] = useState(d.titulo);
  const [state, formAction, pending] = useActionState(editarDocumentoCapacitacion, initialState);
  const esVideo = d.tipo === "VIDEO";
  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      <input type="hidden" name="documentoId" value={d.id} />
      <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
        Título *
        <input name="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
        Descripción
        <textarea
          name="descripcion"
          defaultValue={d.descripcion}
          rows={3}
          placeholder="De qué trata, para quién es…"
          className={inputClass}
        />
      </label>

      {esVideo ? (
        <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
          Link de la clase *
          <input name="link" defaultValue={d.link} required className={inputClass} />
        </label>
      ) : (
        <>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {d.archivoNombre ? (
              <p className="mb-1">
                PDF actual: <strong>{d.archivoNombre}</strong>. Si querés cambiarlo, elegí otro:
              </p>
            ) : (
              <p className="mb-1">Subir un PDF (hasta 15MB):</p>
            )}
            <input
              type="file"
              name="archivo"
              accept="application/pdf"
              className="text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orion-navy file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white dark:text-gray-300"
            />
          </div>
          <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            Link al documento (opcional si hay PDF)
            <input name="link" defaultValue={d.link} className={inputClass} />
          </label>
          <label className="flex w-40 flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            Páginas
            <input name="paginas" type="number" min="0" defaultValue={d.paginas ?? ""} className={inputClass} />
          </label>
        </>
      )}

      <CamposIndice areas={areas} titulo={titulo} inicial={d.indice} />

      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.ok && !state.error && <p className="text-xs text-green-600">✓ Cambios guardados.</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        <Link href={`/capacitacion/${d.id}`} className="text-sm text-gray-500 hover:underline">
          Ver material
        </Link>
      </div>
    </form>
  );
}
