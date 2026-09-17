"use client";

import { useActionState, useEffect, useState } from "react";
import { crearUsuarioAdmin, type NuevoUsuarioState } from "./actions";

const initialState: NuevoUsuarioState = {};

export function NuevoUsuarioForm() {
  const [state, formAction, pending] = useActionState(crearUsuarioAdmin, initialState);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (state?.ok && !pending) {
      setAbierto(false);
      const form = document.getElementById("form-nuevo-usuario") as HTMLFormElement | null;
      form?.reset();
    }
  }, [state?.ok, pending]);

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-orion-navy dark:text-white">
          Agentes del equipo
        </h2>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-orion-navy-light"
        >
          {abierto ? "Cancelar" : "+ Usuario nuevo"}
        </button>
      </div>

      {abierto && (
        <form
          id="form-nuevo-usuario"
          action={formAction}
          className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 dark:border-gray-700 dark:bg-gray-800"
        >
          <input
            name="nombre"
            placeholder="Nombre completo"
            required
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
          />
          <input
            name="telefono"
            placeholder="Teléfono (opcional)"
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
          />
          <select
            name="rol"
            defaultValue="AGENTE"
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
          >
            <option value="AGENTE">Agente</option>
            <option value="TEAM_LEADER">Team Leader</option>
            <option value="ADMINISTRADOR">Administrador</option>
          </select>
          <textarea
            name="descripcion"
            placeholder="Presentación profesional (opcional)"
            rows={2}
            className="rounded border border-gray-300 px-3 py-2 text-sm sm:col-span-2 dark:border-gray-600 dark:bg-gray-900"
          />
          <input
            name="password"
            type="password"
            placeholder="Contraseña provisoria"
            required
            minLength={6}
            className="rounded border border-gray-300 px-3 py-2 text-sm sm:col-span-2 dark:border-gray-600 dark:bg-gray-900"
          />

          {state?.error && (
            <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700 sm:col-span-2">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white hover:bg-orion-navy-light disabled:opacity-60 sm:col-span-2"
          >
            {pending ? "Creando…" : "Crear usuario"}
          </button>
        </form>
      )}
    </div>
  );
}
