"use client";

import { useActionState, useEffect, useState } from "react";
import { cambiarEmail, type EmailState } from "./actions";

const initialState: EmailState = {};

export function CambiarEmailForm({ emailActual }: { emailActual: string }) {
  const [state, formAction, pending] = useActionState(cambiarEmail, initialState);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      const form = document.getElementById("form-cambiar-email") as HTMLFormElement | null;
      form?.reset();
    }
  }, [state?.ok]);

  return (
    <form id="form-cambiar-email" action={formAction} className="flex flex-col gap-3 max-w-sm">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Email actual: <span className="font-semibold">{state?.email ?? emailActual}</span>
      </p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Nuevo email
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-800"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Tu contraseña actual (para confirmar)
        </span>
        <input
          type={mostrar ? "text" : "password"}
          name="passwordActual"
          required
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
        {pending ? "Guardando…" : "Guardar nuevo email"}
      </button>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-green-600">
          Listo. Desde ahora entrás a Orion con {state.email} (la contraseña sigue siendo la misma).
        </p>
      )}
    </form>
  );
}
