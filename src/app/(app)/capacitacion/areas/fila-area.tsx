"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { eliminarArea, guardarArea, type DocumentoState } from "../actions";

const inicial: DocumentoState = {};
const input =
  "rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";

export function FilaArea({
  area,
  cantidad,
}: {
  area?: { clave: string; nombre: string; icono: string; orden: number };
  cantidad?: number;
}) {
  const [state, action, pending] = useActionState(guardarArea, inicial);
  const [borrando, start] = useTransition();
  const router = useRouter();
  return (
    <form action={action} key={area ? area.clave : state.ok ?? "nueva"} className="flex flex-wrap items-center gap-2 py-2">
      <input type="hidden" name="clave" value={area?.clave ?? ""} />
      <input name="orden" type="number" defaultValue={area?.orden ?? ""} placeholder="#" className={`${input} w-14`} title="Orden" />
      <input name="icono" defaultValue={area?.icono ?? ""} placeholder="📘" className={`${input} w-14 text-center`} title="Ícono (emoji)" />
      <input name="nombre" defaultValue={area?.nombre ?? ""} placeholder={area ? "" : "Nueva área…"} className={`${input} min-w-48 flex-1`} />
      {area && <span className="w-24 text-xs text-gray-400">{cantidad ?? 0} material(es)</span>}
      <button type="submit" disabled={pending} className="rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
        {pending ? "…" : area ? "Guardar" : "+ Agregar"}
      </button>
      {area && (
        <button
          type="button"
          disabled={borrando}
          onClick={() => {
            if (!window.confirm(`¿Eliminar el área "${area.nombre}"? Los materiales no se borran, solo dejan de estar en esta área.`)) return;
            start(async () => {
              await eliminarArea(area.clave);
              router.refresh();
            });
          }}
          className="text-xs text-gray-400 hover:text-red-600"
        >
          Eliminar
        </button>
      )}
      {state.error && <span className="w-full text-xs text-red-600">{state.error}</span>}
      {state.ok && !state.error && area && <span className="text-xs text-emerald-600">✓</span>}
    </form>
  );
}
