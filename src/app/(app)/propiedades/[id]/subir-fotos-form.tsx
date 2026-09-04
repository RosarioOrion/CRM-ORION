"use client";

import { useActionState, useRef } from "react";
import { agregarFotos, type FotosState } from "../actions";

const initialState: FotosState = {};

export function SubirFotosForm({ propiedadId }: { propiedadId: string }) {
  const accion = agregarFotos.bind(null, propiedadId);
  const [state, formAction, pending] = useActionState(accion, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <input
        type="file"
        name="fotos"
        accept="image/*"
        multiple
        required
        className="text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orion-navy file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-orion-navy-light dark:text-gray-300"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-orion-gold px-3 py-1.5 text-xs font-semibold text-orion-navy transition hover:brightness-95 disabled:opacity-60"
      >
        {pending ? "Subiendo…" : "Subir fotos"}
      </button>
      {state.error && (
        <span className="text-xs text-red-600">{state.error}</span>
      )}
    </form>
  );
}
