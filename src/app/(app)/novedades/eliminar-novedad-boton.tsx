"use client";

import { useTransition } from "react";
import { eliminarNovedad } from "./actions";

export function EliminarNovedadBoton({ novedadId }: { novedadId: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("¿Borrar esta novedad?")) return;
    startTransition(() => {
      eliminarNovedad(novedadId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="shrink-0 text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
    >
      ✕
    </button>
  );
}
