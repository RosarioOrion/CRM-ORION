"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Para Team Leader / Administrador: elegir de quién se ve la agenda
 * (la propia, la de un agente o la de todo el equipo).
 */
export function SelectorAgente({
  valor,
  agentes,
}: {
  valor: string;
  agentes: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function cambiar(nuevo: string) {
    const p = new URLSearchParams(params.toString());
    if (nuevo === "yo") p.delete("agente");
    else p.set("agente", nuevo);
    p.delete("fecha");
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
      Ver agenda de:
      <select
        value={valor}
        onChange={(e) => cambiar(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm font-normal text-gray-800 outline-none focus:border-orion-navy dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      >
        <option value="yo">Mi agenda</option>
        <option value="todos">Todo el equipo</option>
        {agentes.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
