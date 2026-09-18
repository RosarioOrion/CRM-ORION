"use client";

import { useActionState } from "react";
import { actualizarPerfil, type PerfilState } from "./actions";

const initialState: PerfilState = {};

export function EditarPerfilForm({
  nombre,
  telefono,
  descripcion,
}: {
  nombre: string;
  telefono: string | null;
  descripcion: string | null;
}) {
  const [state, formAction, pending] = useActionState(actualizarPerfil, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 max-w-sm">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Nombre completo
        </span>
        <input
          name="nombre"
          defaultValue={nombre}
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-800"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Teléfono
        </span>
        <input
          name="telefono"
          defaultValue={telefono ?? ""}
          placeholder="099 123 456"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-800"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Presentación profesional
        </span>
        <textarea
          name="descripcion"
          defaultValue={descripcion ?? ""}
          rows={4}
          placeholder="Contanos tu experiencia en el rubro, especialidad, zonas donde trabajás, etc."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-800"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar perfil"}
      </button>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">Perfil actualizado correctamente.</p>}
    </form>
  );
}
