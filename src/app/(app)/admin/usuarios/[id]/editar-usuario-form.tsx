"use client";

import { useActionState, useState } from "react";
import { editarUsuarioAdmin, type EditarUsuarioState } from "../actions";
import { numeroWhatsApp } from "@/lib/seguimientos";

const initialState: EditarUsuarioState = {};

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-900 dark:text-white";
const labelClass = "mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400";

export function EditarUsuarioForm({
  usuario,
}: {
  usuario: {
    id: string;
    nombre: string;
    email: string;
    telefono: string | null;
    descripcion: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(
    editarUsuarioAdmin.bind(null, usuario.id),
    initialState
  );
  const [telefono, setTelefono] = useState(usuario.telefono ?? "");
  const wa = numeroWhatsApp(telefono);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className={labelClass}>Nombre completo</label>
        <input name="nombre" defaultValue={usuario.nombre} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Email (con este entra a Orion)</label>
        <input name="email" type="email" defaultValue={usuario.email} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Celular / WhatsApp</label>
        <input
          name="telefono"
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="099 123 456"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          Es el número del botón de WhatsApp en la página web de cada propiedad que tiene a cargo.
          {wa && (
            <>
              {" "}
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-green-600 hover:underline"
              >
                Probar WhatsApp →
              </a>
            </>
          )}
        </p>
        {telefono.trim() && !wa && (
          <p className="mt-1 text-xs text-amber-600">Revisá el número: no parece un celular válido.</p>
        )}
      </div>
      <div>
        <label className={labelClass}>Presentación profesional</label>
        <textarea
          name="descripcion"
          defaultValue={usuario.descripcion ?? ""}
          rows={4}
          className={inputClass}
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && !state.error && <p className="text-sm text-green-600">✓ Datos guardados.</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
