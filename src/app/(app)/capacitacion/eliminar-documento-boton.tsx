"use client";

import { useTransition } from "react";
import { eliminarDocumentoCapacitacion } from "./actions";

export function EliminarDocumentoBoton({ documentoId }: { documentoId: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("¿Borrar este documento?")) return;
    startTransition(() => {
      eliminarDocumentoCapacitacion(documentoId);
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
