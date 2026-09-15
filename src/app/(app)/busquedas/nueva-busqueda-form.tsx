"use client";

import { useActionState, useEffect, useState } from "react";
import { crearBusqueda, type BusquedaState } from "./actions";
import { TIPOS_PROPIEDAD } from "@/lib/propiedades";

const initialState: BusquedaState = {};

type Contacto = { id: string; nombre: string };

const inputClass =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-700 dark:bg-gray-800 dark:text-white";

export function NuevaBusquedaForm({ contactos }: { contactos: Contacto[] }) {
  const [state, formAction, pending] = useActionState(
    crearBusqueda,
    initialState
  );
  const [abierto, setAbierto] = useState(false);

  if (contactos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-500 dark:bg-gray-800 dark:border-gray-700">
        Para cargar una búsqueda primero necesitás al menos un contacto. Andá
        a la sección Contactos.
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
        <span className="text-base leading-none">+</span> Búsqueda nueva
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
      <BusquedaFormFields
        contactos={contactos}
        formAction={formAction}
        pending={pending}
        error={state?.error}
        onSuccess={() => setAbierto(false)}
        okFlag={state?.ok}
      />
    </div>
  );
}

function BusquedaFormFields({
  contactos,
  formAction,
  pending,
  error,
  okFlag,
  onSuccess,
}: {
  contactos: Contacto[];
  formAction: (formData: FormData) => void;
  pending: boolean;
  error?: string;
  okFlag?: boolean;
  onSuccess: () => void;
}) {
  // Cierra el panel automáticamente apenas se guarda con éxito.
  useEffect(() => {
    if (okFlag && !pending) {
      onSuccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [okFlag, pending]);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 dark:bg-gray-800 dark:border-gray-700"
    >
      <div className="sm:col-span-2">
        <h2 className="text-sm font-semibold text-orion-navy">
          Nueva búsqueda
        </h2>
      </div>

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

      <select name="operacion" required defaultValue="VENTA" className={inputClass}>
        <option value="VENTA">Venta</option>
        <option value="ALQUILER">Alquiler</option>
      </select>

      <select name="tipo" required defaultValue="Apartamento" className={inputClass}>
        {TIPOS_PROPIEDAD.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <input
        name="zona"
        placeholder="Zona (ej. Pocitos, Carrasco...)"
        required
        className={inputClass}
      />

      <div className="flex gap-2">
        <select
          name="moneda"
          defaultValue="UYU"
          className={`w-24 shrink-0 ${inputClass}`}
        >
          <option value="UYU">UYU</option>
          <option value="USD">USD</option>
        </select>
        <input
          name="precioMin"
          type="number"
          placeholder="Precio mínimo (opcional)"
          className={`flex-1 ${inputClass}`}
        />
      </div>
      <input
        name="precioMax"
        type="number"
        placeholder="Precio máximo (opcional)"
        className={inputClass}
      />

      <input
        name="notas"
        placeholder="Notas (opcional, ej. temporal 6 meses con opción)"
        className={`sm:col-span-2 ${inputClass}`}
      />

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
          Vence (opcional)
        </label>
        <input name="vence" type="date" className={`w-full ${inputClass}`} />
      </div>

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
          {pending ? "Guardando…" : "Guardar búsqueda"}
        </button>
      </div>
    </form>
  );
}
