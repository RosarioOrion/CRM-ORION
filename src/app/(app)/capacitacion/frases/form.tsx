"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { agregarFrase, eliminarFrase, type FraseState } from "./actions";

const inicial: FraseState = {};
const input =
  "rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";

export function FormFrase() {
  const [state, action, pending] = useActionState(agregarFrase, inicial);
  return (
    <form action={action} key={state.ok ?? "f"} className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <textarea name="texto" rows={2} placeholder="La frase *" className={input} />
      <input name="accion" placeholder="Acción de hoy (opcional): ej. Hacé 5 llamadas de captación antes de las 11" className={input} />
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="self-start rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Guardando…" : "+ Agregar frase"}
      </button>
    </form>
  );
}

export function BorrarFrase({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("¿Borrar esta frase?")) return;
        start(async () => {
          await eliminarFrase(id);
          router.refresh();
        });
      }}
      className="text-xs text-gray-400 hover:text-red-600"
    >
      Borrar
    </button>
  );
}
