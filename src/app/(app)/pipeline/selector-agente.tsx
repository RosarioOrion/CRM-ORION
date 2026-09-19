"use client";

import { useRouter } from "next/navigation";

export function SelectorAgente({
  agentes,
  seleccionado,
  propioId,
}: {
  agentes: { id: string; nombre: string }[];
  seleccionado: string;
  propioId: string;
}) {
  const router = useRouter();

  return (
    <form className="mb-6 flex items-center gap-2 text-sm">
      <label htmlFor="agente" className="text-gray-500 dark:text-gray-400">
        Ver pipeline de:
      </label>
      <select
        id="agente"
        name="agente"
        defaultValue={seleccionado}
        onChange={(e) => router.push(`/pipeline?agente=${e.target.value}`)}
        className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
      >
        {agentes.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nombre}
            {a.id === propioId ? " (vos)" : ""}
          </option>
        ))}
      </select>
    </form>
  );
}
