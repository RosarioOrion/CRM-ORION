"use client";

import { useState, useTransition } from "react";
import { cambiarEstadoReservaAlquiler } from "./actions";
import { ESTADO_RESERVA_ALQUILER_LABEL, type EstadoReservaAlquiler } from "@/lib/reservas";

type Reserva = {
  id: string;
  nombrePropiedad: string;
  estado: EstadoReservaAlquiler;
  propietarioNombre: string | null;
  inquilinoNombre: string | null;
  precioMensual: number | null;
  moneda: string;
  comisionTotalUsd: number | null;
  agenteNombre: string;
  puedeEditar: boolean;
};

export function TablaReservasAlquiler({
  reservas,
  esAdmin,
}: {
  reservas: Reserva[];
  esAdmin: boolean;
}) {
  const [, startTransition] = useTransition();
  const [estados, setEstados] = useState<Record<string, EstadoReservaAlquiler>>(
    Object.fromEntries(reservas.map((r) => [r.id, r.estado]))
  );

  function mover(id: string, nuevoEstado: EstadoReservaAlquiler) {
    setEstados((e) => ({ ...e, [id]: nuevoEstado }));
    startTransition(() => {
      cambiarEstadoReservaAlquiler(id, nuevoEstado);
    });
  }

  if (reservas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:bg-gray-800 dark:border-gray-700">
        Todavía no hay reservas de alquiler cargadas.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {reservas.map((r) => {
        const estado = estados[r.id];
        return (
          <div
            key={r.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-gray-800 dark:border-gray-700"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      estado === "CANCELADA"
                        ? "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        : estado === "FIRMADA"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    }`}
                  >
                    {ESTADO_RESERVA_ALQUILER_LABEL[estado]}
                  </span>
                  <p className="font-semibold text-orion-navy dark:text-white">
                    {r.nombrePropiedad}
                  </p>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {r.propietarioNombre ? `Propietario: ${r.propietarioNombre}` : ""}
                  {r.propietarioNombre && r.inquilinoNombre ? " · " : ""}
                  {r.inquilinoNombre ? `Inquilino: ${r.inquilinoNombre}` : ""}
                </p>
                <p className="mt-1 text-xs text-gray-400">Agente: {r.agenteNombre}</p>
              </div>

              <div className="text-right">
                {r.precioMensual != null && (
                  <p className="text-sm font-semibold text-orion-navy dark:text-white">
                    {r.moneda} {r.precioMensual.toLocaleString("es-UY")}/mes
                  </p>
                )}
                {r.comisionTotalUsd != null && (
                  <p className="text-[11px] text-gray-400">
                    Com. USD {r.comisionTotalUsd.toLocaleString("es-UY")}
                  </p>
                )}
              </div>
            </div>

            {r.puedeEditar && estado === "RESERVADA" && (
              <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5">
                {esAdmin && (
                  <button
                    type="button"
                    onClick={() => mover(r.id, "FIRMADA")}
                    className="rounded-lg border border-orion-navy/30 bg-orion-navy/5 px-2 py-1 text-xs font-semibold text-orion-navy transition hover:bg-orion-navy/10 dark:border-orion-gold/30 dark:bg-orion-gold/10 dark:text-orion-gold"
                  >
                    Firmada →
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => mover(r.id, "CANCELADA")}
                  className="rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
