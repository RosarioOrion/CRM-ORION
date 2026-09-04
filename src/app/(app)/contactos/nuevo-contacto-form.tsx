"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { crearContacto, type ContactoState } from "./actions";
import {
  CATEGORIAS_CONTACTO,
  CATEGORIA_LABEL,
  ORIGENES_CONTACTO,
  ORIGEN_LABEL,
  ORIGEN_DETALLE_PLACEHOLDER,
  type OrigenContacto,
} from "@/lib/contactos";

const initialState: ContactoState = {};

export function NuevoContactoForm() {
  const [state, formAction, pending] = useActionState(
    crearContacto,
    initialState
  );
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!pending && !state?.error && abierto) {
      setAbierto(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, state]);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light"
      >
        <span className="text-base leading-none">+</span> Contacto nuevo
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
      <ContactoFormFields
        formAction={formAction}
        pending={pending}
        error={state?.error}
      />
    </div>
  );
}

function ContactoFormFields({
  formAction,
  pending,
  error,
}: {
  formAction: (formData: FormData) => void;
  pending: boolean;
  error?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [origen, setOrigen] = useState<OrigenContacto>("OTRO");

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <h2 className="text-sm font-semibold text-orion-navy">
          Nuevo contacto
        </h2>
      </div>
      <input
        name="nombre"
        placeholder="Nombre completo"
        required
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      />
      <input
        name="telefono"
        placeholder="Teléfono / WhatsApp"
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      />
      <input
        name="email"
        type="email"
        placeholder="Email (opcional)"
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      />
      <select
        name="categoria"
        defaultValue="OTRO"
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      >
        {CATEGORIAS_CONTACTO.map((cat) => (
          <option key={cat} value={cat}>
            {CATEGORIA_LABEL[cat]}
          </option>
        ))}
      </select>
      <select
        name="origen"
        value={origen}
        onChange={(e) => setOrigen(e.target.value as OrigenContacto)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      >
        {ORIGENES_CONTACTO.map((o) => (
          <option key={o} value={o}>
            {ORIGEN_LABEL[o]}
          </option>
        ))}
      </select>
      <input
        name="origenDetalle"
        placeholder={ORIGEN_DETALLE_PLACEHOLDER[origen]}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      />
      <input
        name="notas"
        placeholder="Notas"
        className="sm:col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
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
          {pending ? "Guardando…" : "Guardar contacto"}
        </button>
      </div>
    </form>
  );
}
