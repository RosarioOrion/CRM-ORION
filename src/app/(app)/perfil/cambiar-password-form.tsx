"use client";

import { useActionState, useEffect, useState } from "react";
import { cambiarPassword, type PasswordState } from "./actions";

const initialState: PasswordState = {};

export function CambiarPasswordForm() {
  const [state, formAction, pending] = useActionState(cambiarPassword, initialState);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      const form = document.getElementById("form-cambiar-password") as HTMLFormElement | null;
      form?.reset();
    }
  }, [state?.ok]);

  return (
    <form id="form-cambiar-password" action={formAction} className="flex flex-col gap-3 max-w-sm">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Contraseña actual
        </span>
        <input
          type={mostrar ? "text" : "password"}
          name="passwordActual"
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-800"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Nueva contraseña
        </span>
        <input
          type={mostrar ? "text" : "password"}
          name="password"
          required
          minLength={6}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-800"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Repetir contraseña
        </span>
        <input
          type={mostrar ? "text" : "password"}
          name="confirmar"
          required
          minLength={6}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-800"
        />
      </label>

      <label className="flex items-center gap-2 text-xs text-gray-500">
        <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} />
        Mostrar contraseña
      </label>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar nueva contraseña"}
      </button>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">Contraseña actualizada correctamente.</p>}
    </form>
  );
}
