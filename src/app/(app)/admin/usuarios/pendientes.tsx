"use client";

import { useState, useTransition } from "react";
import { aprobarUsuario, rechazarUsuario } from "./actions";

type Pendiente = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  descripcion: string | null;
  creadoEn: Date;
};

export function Pendientes({ pendientesIniciales }: { pendientesIniciales: Pendiente[] }) {
  const [pendientes, setPendientes] = useState(pendientesIniciales);
  const [, startTransition] = useTransition();
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  function handleAprobar(id: string) {
    setProcesandoId(id);
    startTransition(() => {
      aprobarUsuario(id).finally(() => {
        setPendientes((ps) => ps.filter((p) => p.id !== id));
        setProcesandoId(null);
      });
    });
  }

  function handleRechazar(id: string) {
    if (!window.confirm("¿Rechazar esta solicitud? Se va a borrar permanentemente.")) {
      return;
    }
    setProcesandoId(id);
    startTransition(() => {
      rechazarUsuario(id).finally(() => {
        setPendientes((ps) => ps.filter((p) => p.id !== id));
        setProcesandoId(null);
      });
    });
  }

  if (pendientes.length === 0) {
    return (
      <p className="text-sm text-gray-400">No hay solicitudes pendientes de aprobación.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {pendientes.map((p) => (
        <div
          key={p.id}
          className="rounded-xl border border-orion-gold/40 bg-orion-gold/5 p-4 dark:bg-gray-800 dark:border-orion-gold/30"
        >
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-orion-navy dark:text-white">{p.nombre}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {p.email}
                {p.telefono ? ` · ${p.telefono}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={procesandoId === p.id}
                onClick={() => handleAprobar(p.id)}
                className="rounded bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-orion-navy-light disabled:opacity-60"
              >
                {procesandoId === p.id ? "…" : "Aprobar"}
              </button>
              <button
                type="button"
                disabled={procesandoId === p.id}
                onClick={() => handleRechazar(p.id)}
                className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Rechazar
              </button>
            </div>
          </div>
          {p.descripcion && (
            <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
              {p.descripcion}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
