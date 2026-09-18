"use client";

import { useState, useTransition } from "react";
import { alternarTareaKaizen } from "./actions";
import {
  DIAS_KAIZEN,
  DIA_KAIZEN_LABEL,
  DIA_KAIZEN_TEMA,
  DIA_KAIZEN_DESCRIPCION,
  DIA_KAIZEN_ICONO,
  type DiaKaizen,
} from "@/lib/kaizen";

type Tarea = { id: string; dia: DiaKaizen; orden: number; texto: string };

export function KaizenChecklist({
  tareas,
  completadasIds,
}: {
  tareas: Tarea[];
  completadasIds: string[];
}) {
  const [, startTransition] = useTransition();
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set(completadasIds));

  const totalGeneral = tareas.length;
  const hechasGeneral = tareas.filter((t) => marcadas.has(t.id)).length;

  function toggle(id: string) {
    const marcar = !marcadas.has(id);
    setMarcadas((prev) => {
      const next = new Set(prev);
      if (marcar) next.add(id);
      else next.delete(id);
      return next;
    });
    startTransition(() => {
      alternarTareaKaizen(id, marcar);
    });
  }

  return (
    <div>
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-orion-navy dark:text-white">
            Progreso semanal
          </p>
          <p className="text-sm font-semibold text-orion-navy dark:text-white">
            {hechasGeneral}/{totalGeneral} tareas completadas
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            className="h-full bg-orion-gold transition-all"
            style={{
              width: totalGeneral ? `${(hechasGeneral / totalGeneral) * 100}%` : "0%",
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
        {DIAS_KAIZEN.map((dia) => {
          const tareasDia = tareas.filter((t) => t.dia === dia);
          const hechas = tareasDia.filter((t) => marcadas.has(t.id)).length;
          return (
            <div
              key={dia}
              className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-800 dark:border-gray-700"
            >
              <p className="text-sm font-semibold text-orion-navy dark:text-white">
                {DIA_KAIZEN_ICONO[dia]} {DIA_KAIZEN_LABEL[dia]} — {DIA_KAIZEN_TEMA[dia]}
              </p>
              <p className="mb-3 text-[11px] text-gray-400">{DIA_KAIZEN_DESCRIPCION[dia]}</p>

              <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <div
                  className="h-full bg-orion-gold transition-all"
                  style={{
                    width: tareasDia.length ? `${(hechas / tareasDia.length) * 100}%` : "0%",
                  }}
                />
              </div>

              <div className="flex flex-1 flex-col gap-2">
                {tareasDia.length === 0 ? (
                  <p className="text-xs text-gray-400">Sin tareas cargadas.</p>
                ) : (
                  tareasDia.map((t) => (
                    <label
                      key={t.id}
                      className="flex cursor-pointer items-start gap-2 text-xs text-gray-700 dark:text-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={marcadas.has(t.id)}
                        onChange={() => toggle(t.id)}
                        className="mt-0.5"
                      />
                      <span className={marcadas.has(t.id) ? "text-gray-400 line-through" : ""}>
                        {t.texto}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
