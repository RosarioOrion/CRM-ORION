"use client";

import { useRouter } from "next/navigation";
import {
  PERIODOS_PRODUCTIVIDAD,
  PERIODO_PRODUCTIVIDAD_LABEL,
  type PeriodoProductividad,
} from "@/lib/productividad";

export function FiltroPeriodo({ periodoActivo }: { periodoActivo: PeriodoProductividad }) {
  const router = useRouter();

  return (
    <div className="flex gap-2">
      {PERIODOS_PRODUCTIVIDAD.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => router.push(`/productividad?periodo=${p}`)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            p === periodoActivo
              ? "bg-orion-navy text-white"
              : "border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          }`}
        >
          {PERIODO_PRODUCTIVIDAD_LABEL[p]}
        </button>
      ))}
    </div>
  );
}
