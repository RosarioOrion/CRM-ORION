"use client";

import { useActionState, useRef, useEffect } from "react";
import { crearContacto, type ContactoState } from "./actions";

const initialState: ContactoState = {};

export function NuevoContactoForm() {
  const [state, formAction, pending] = useActionState(
    crearContacto,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state?.error) {
      formRef.current?.reset();
    }
  }, [pending, state]);

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
      <input
        name="notas"
        placeholder="Notas"
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      />
      {state?.error && (
        <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
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
