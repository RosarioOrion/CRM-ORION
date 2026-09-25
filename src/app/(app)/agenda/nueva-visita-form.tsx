"use client";

import { useActionState, useEffect, useState } from "react";
import { crearVisita, type VisitaState } from "./actions";

const initialState: VisitaState = {};

type Propiedad = { id: string; codigo: string; titulo: string };
type Contacto = { id: string; nombre: string };

const inputClass =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-700 dark:bg-gray-800 dark:text-white";

export function NuevaVisitaForm({
  propiedades,
  contactos,
}: {
  propiedades: Propiedad[];
  contactos: Contacto[];
}) {
  const [state, formAction, pending] = useActionState(crearVisita, initialState);
  const [abierto, setAbierto] = useState(false);

  if (propiedades.length === 0 || contactos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-500 dark:bg-gray-800 dark:border-gray-700">
        Para agendar una visita necesitás al menos una propiedad activa y un
        contacto cargados.
      </div>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light"
      >
        <span className="text-base leading-none">+</span> Visita nueva
      </button>
    );
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-xs font-semibold text-gray-500 hover:text-orion-navy dark:text-gray-400 dark:hover:text-white"
        >
          Cancelar ✕
        </button>
      </div>
      <VisitaFormFields
        propiedades={propiedades}
        contactos={contactos}
        formAction={formAction}
        pending={pending}
        error={state?.error}
        okFlag={state?.ok}
        onSuccess={() => setAbierto(false)}
      />
    </div>
  );
}

export function VisitaFormFields({
  propiedades,
  contactos,
  formAction,
  pending,
  error,
  okFlag,
  onSuccess,
}: {
  propiedades: Propiedad[];
  contactos: Contacto[];
  formAction: (formData: FormData) => void;
  pending: boolean;
  error?: string;
  okFlag?: boolean;
  onSuccess: () => void;
}) {
  useEffect(() => {
    if (okFlag && !pending) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [okFlag, pending]);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 dark:bg-gray-800 dark:border-gray-700"
    >
      <div className="sm:col-span-2">
        <h2 className="text-sm font-semibold text-orion-navy">Visita nueva</h2>
      </div>

      <select name="propiedadId" required defaultValue="" className={inputClass}>
        <option value="" disabled>
          Elegí la propiedad…
        </option>
        {propiedades.map((p) => (
          <option key={p.id} value={p.id}>
            {p.codigo} — {p.titulo}
          </option>
        ))}
      </select>

      <select name="contactoId" required defaultValue="" className={inputClass}>
        <option value="" disabled>
          Elegí el contacto…
        </option>
        {contactos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
          Fecha y hora
        </label>
        <input
          name="fecha"
          type="datetime-local"
          required
          className={`w-full ${inputClass}`}
        />
      </div>

      <input
        name="notas"
        placeholder="Notas (opcional)"
        className={`sm:col-span-2 ${inputClass}`}
      />

      {error && (
        <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar visita"}
        </button>
      </div>
    </form>
  );
}
