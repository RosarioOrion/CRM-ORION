"use client";

import { useState, useTransition } from "react";
import { crearTareaKaizen, editarTareaKaizen, eliminarTareaKaizen } from "./actions";
import { DIAS_KAIZEN, DIA_KAIZEN_LABEL, type DiaKaizen } from "@/lib/kaizen";

type Tarea = { id: string; dia: DiaKaizen; orden: number; texto: string };

export function KaizenAdmin({ tareas }: { tareas: Tarea[] }) {
  const [, startTransition] = useTransition();
  const [nuevoTexto, setNuevoTexto] = useState<Record<string, string>>({});

  function agregar(dia: DiaKaizen) {
    const texto = (nuevoTexto[dia] ?? "").trim();
    if (!texto) return;
    setNuevoTexto((n) => ({ ...n, [dia]: "" }));
    startTransition(() => {
      crearTareaKaizen(dia, texto);
    });
  }

  function guardarEdicion(id: string, texto: string) {
    startTransition(() => {
      editarTareaKaizen(id, texto);
    });
  }

  function eliminar(id: string) {
    if (!confirm("¿Sacar esta tarea del checklist?")) return;
    startTransition(() => {
      eliminarTareaKaizen(id);
    });
  }

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-orion-navy dark:text-white">
        Editar tareas de Kaizen 5S
      </h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Son las mismas tareas que usa Lumen OS. Desde acá las podés ajustar, sacar o agregar
        cuando quieras.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
        {DIAS_KAIZEN.map((dia) => (
          <div
            key={dia}
            className="rounded-xl border border-gray-200 bg-white p-3 dark:bg-gray-800 dark:border-gray-700"
          >
            <p className="mb-2 text-xs font-semibold text-orion-navy dark:text-white">
              {DIA_KAIZEN_LABEL[dia]}
            </p>
            <div className="flex flex-col gap-2">
              {tareas
                .filter((t) => t.dia === dia)
                .map((t) => (
                  <div key={t.id} className="flex items-start gap-1">
                    <input
                      defaultValue={t.texto}
                      onBlur={(e) => {
                        if (e.target.value.trim() !== t.texto) {
                          guardarEdicion(t.id, e.target.value);
                        }
                      }}
                      className="flex-1 rounded border border-gray-300 bg-white px-1.5 py-1 text-[11px] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => eliminar(t.id)}
                      className="text-[11px] text-gray-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                ))}
            </div>
            <div className="mt-2 flex gap-1">
              <input
                placeholder="Nueva tarea…"
                value={nuevoTexto[dia] ?? ""}
                onChange={(e) => setNuevoTexto((n) => ({ ...n, [dia]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregar(dia);
                  }
                }}
                className="flex-1 rounded border border-gray-300 bg-white px-1.5 py-1 text-[11px] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => agregar(dia)}
                className="rounded bg-orion-navy px-2 text-[11px] font-semibold text-white hover:bg-orion-navy-light"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
