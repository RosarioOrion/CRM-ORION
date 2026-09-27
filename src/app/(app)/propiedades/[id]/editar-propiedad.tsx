"use client";

import { useActionState, useState } from "react";
import { editarPropiedad, type EditarPropiedadState } from "../actions";
import { PropiedadFormFields, type ValoresPropiedad } from "../nueva-propiedad-form";

const inicialState: EditarPropiedadState = {};

/** Botón "Editar propiedad" en la ficha: abre el formulario completo ya cargado. */
export function EditarPropiedad({
  propiedadId,
  valores,
  contactos,
}: {
  propiedadId: string;
  valores: ValoresPropiedad;
  contactos: { id: string; nombre: string }[];
}) {
  const [state, formAction, pending] = useActionState(editarPropiedad, inicialState);
  const [abierto, setAbierto] = useState(false);
  const [ultimoOk, setUltimoOk] = useState<number | undefined>(undefined);
  const [resultado, setResultado] = useState<EditarPropiedadState | null>(null);

  // Al guardar: cerrar el formulario y mostrar el resumen.
  if (state?.ok && state.ok !== ultimoOk) {
    setUltimoOk(state.ok);
    setAbierto(false);
    setResultado(state);
  }

  if (!abierto) {
    return (
      <div className="mb-4">
        <button
          type="button"
          onClick={() => {
            setResultado(null);
            setAbierto(true);
          }}
          className="rounded-lg border border-orion-navy px-3 py-1.5 text-xs font-semibold text-orion-navy transition hover:bg-orion-navy hover:text-white dark:border-orion-gold dark:text-orion-gold dark:hover:bg-orion-gold dark:hover:text-orion-navy"
        >
          ✏️ Editar propiedad
        </button>
        {resultado && (
          <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100">
            <p className="font-semibold">✓ Cambios guardados.</p>
            {resultado.aviso && <p className="text-xs">{resultado.aviso}</p>}
            {resultado.portales && (
              <p className="mt-1 text-xs">
                La web de Orion ya muestra el precio nuevo.
                {resultado.portales.length > 0 ? (
                  <>
                    {" "}Acordate de cambiarlo también en:{" "}
                    {resultado.portales.map((p, i) => (
                      <span key={p.url}>
                        {i > 0 && ", "}
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                          {p.portal}
                        </a>
                      </span>
                    ))}
                    .
                  </>
                ) : (
                  " Si está publicada en otros portales, cambialo también ahí."
                )}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-xs font-semibold text-gray-500 hover:text-orion-navy dark:text-gray-400 dark:hover:text-white"
        >
          Cancelar ✕
        </button>
      </div>
      <PropiedadFormFields
        contactos={contactos}
        formAction={formAction}
        pending={pending}
        error={state?.error}
        inicial={valores}
        titulo="Editar propiedad"
        textoBoton="Guardar cambios"
        extraArriba={<input type="hidden" name="propiedadId" value={propiedadId} />}
        extraAbajo={
          <label className="sm:col-span-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
            <input type="checkbox" name="actualizarTextos" value="1" defaultChecked className="mt-0.5" />
            <span>
              Si cambio el precio, actualizarlo también donde esté escrito en el título y la descripción
              (queda registrado en el historial de precios).
            </span>
          </label>
        }
      />
    </div>
  );
}
