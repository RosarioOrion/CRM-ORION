"use client";

import { useActionState, useEffect, useState } from "react";
import { crearCaptacion, type CaptacionState } from "./actions";
import { TIPOS_PROPIEDAD } from "@/lib/propiedades";
import { ORIGENES_CONTACTO, ORIGEN_LABEL } from "@/lib/contactos";

const initialState: CaptacionState = {};

type Contacto = { id: string; nombre: string };

const inputClass =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-700 dark:bg-gray-800 dark:text-white";

export function NuevaCaptacionForm({ contactos }: { contactos: Contacto[] }) {
  const [state, formAction, pending] = useActionState(
    crearCaptacion,
    initialState
  );
  const [abierto, setAbierto] = useState(false);

  if (contactos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-500 dark:bg-gray-800 dark:border-gray-700">
        Para cargar una captación primero necesitás al menos un contacto.
        Andá a la sección Contactos.
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
        <span className="text-base leading-none">+</span> Captación nueva
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
      <CaptacionFormFields
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

function CaptacionFormFields({
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
  const [origen, setOrigen] = useState<string>("REFERIDO");

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
          Nueva captación
        </h2>
      </div>

      <input
        name="titulo"
        placeholder="Título (ej. Apartamento 2 dorm. en Pocitos)"
        required
        className="sm:col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />

      <select name="contactoId" required defaultValue="" className={inputClass}>
        <option value="" disabled>
          Elegí el propietario…
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
        className={inputClass}
      />

      <input
        name="direccion"
        placeholder="Dirección (opcional)"
        className={inputClass}
      />

      <select
        name="origen"
        required
        value={origen}
        onChange={(e) => setOrigen(e.target.value)}
        className={inputClass}
      >
        {ORIGENES_CONTACTO.map((o) => (
          <option key={o} value={o}>
            {ORIGEN_LABEL[o]}
          </option>
        ))}
      </select>

      <input
        name="origenDetalle"
        placeholder="Detalle del origen (opcional)"
        className={inputClass}
      />

      <textarea
        name="notas"
        placeholder="Notas (opcional)"
        rows={2}
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
          {pending ? "Guardando…" : "Guardar captación"}
        </button>
      </div>
    </form>
  );
}
