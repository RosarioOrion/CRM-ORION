"use client";

import { useTransition } from "react";
import { actualizarCategoria } from "../actions";
import { CATEGORIAS_CONTACTO, CATEGORIA_LABEL } from "@/lib/contactos";

export function CambiarCategoria({
  contactoId,
  categoriaActual,
}: {
  contactoId: string;
  categoriaActual: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={categoriaActual}
      disabled={pending}
      onChange={(e) => {
        const nuevaCategoria = e.target.value;
        startTransition(() => {
          actualizarCategoria(contactoId, nuevaCategoria);
        });
      }}
      className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 outline-none focus:border-orion-navy disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
    >
      {CATEGORIAS_CONTACTO.map((cat) => (
        <option key={cat} value={cat}>
          {CATEGORIA_LABEL[cat]}
        </option>
      ))}
    </select>
  );
}
