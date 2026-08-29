"use client";

import { useActionState, useRef, useEffect } from "react";
import { crearPropiedad, type PropiedadState } from "./actions";

const initialState: PropiedadState = {};

type Contacto = { id: string; nombre: string };

export function NuevaPropiedadForm({ contactos }: { contactos: Contacto[] }) {
  const [state, formAction, pending] = useActionState(
    crearPropiedad,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state?.error) {
      formRef.current?.reset();
    }
  }, [pending, state]);

  if (contactos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-500">
        Para publicar una propiedad primero necesitás cargar al menos un
        contacto (el dueño). Andá a la sección Contactos.
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <h2 className="text-sm font-semibold text-orion-navy">
          Nueva propiedad
        </h2>
      </div>
      <input
        name="titulo"
        placeholder="Título (ej. Apto 2 dorm. en Pocitos)"
        required
        className="sm:col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      />
      <select
        name="operacion"
        required
        defaultValue="VENTA"
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      >
        <option value="VENTA">Venta</option>
        <option value="ALQUILER">Alquiler</option>
      </select>
      <input
        name="tipo"
        placeholder="Tipo (casa, apartamento...)"
        required
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      />
      <input
        name="zona"
        placeholder="Zona (ej. Montevideo — Pocitos)"
        required
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      />
      <input
        name="precio"
        type="number"
        placeholder="Precio en USD (opcional)"
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      />
      <select
        name="duenoId"
        required
        defaultValue=""
        className="sm:col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      >
        <option value="" disabled>
          Elegí el contacto dueño…
        </option>
        {contactos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>

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
          {pending ? "Guardando…" : "Publicar propiedad"}
        </button>
      </div>
    </form>
  );
}
