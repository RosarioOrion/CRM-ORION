"use client";

import { useState, useTransition } from "react";
import { cambiarEstadoReservaVenta } from "./actions";
import {
  ESTADOS_RESERVA_VENTA,
  ESTADO_RESERVA_VENTA_LABEL,
  type EstadoReservaVenta,
} from "@/lib/reservas";

type Reserva = {
  id: string;
  nombrePropiedad: string;
  estado: EstadoReservaVenta;
  compradorNombre: string | null;
  vendedorNombre: string | null;
  precioCierre: number;
  comisionVendedor: number | null;
  comisionComprador: number | null;
  porcentajePorParte: number;
  agenteNombre: string;
  puedeEditar: boolean;
};

function fmtUsd(n: number) {
  return `USD ${n.toLocaleString("es-UY")}`;
}

export function TablaReservasVenta({ reservas }: { reservas: Reserva[] }) {
  const [, startTransition] = useTransition();
  const [estados, setEstados] = useState<Record<string, EstadoReservaVenta>>(
    Object.fromEntries(reservas.map((r) => [r.id, r.estado]))
  );

  function mover(id: string, nuevoEstado: EstadoReservaVenta) {
    setEstados((e) => ({ ...e, [id]: nuevoEstado }));
    startTransition(() => {
      cambiarEstadoReservaVenta(id, nuevoEstado);
    });
  }

  if (reservas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:bg-gray-800 dark:border-gray-700">
        Todavía no hay reservas de venta cargadas.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {reservas.map((r) => {
        const estado = estados[r.id];
        const idx = ESTADOS_RESERVA_VENTA.indexOf(estado);
        const comVendedor =
          r.comisionVendedor ?? Math.round((r.precioCierre * r.porcentajePorParte) / 100);
        const comComprador =
          r.comisionComprador ?? Math.round((r.precioCierre * r.porcentajePorParte) / 100);

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
                        : estado === "ESCRITURADA"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    }`}
                  >
                    {ESTADO_RESERVA_VENTA_LABEL[estado]}
                  </span>
                  <p className="font-semibold text-orion-navy dark:text-white">
                    {r.nombrePropiedad}
                  </p>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {r.vendedorNombre ? `Vendedor: ${r.vendedorNombre}` : ""}
                  {r.vendedorNombre && r.compradorNombre ? " · " : ""}
                  {r.compradorNombre ? `Comprador: ${r.compradorNombre}` : ""}
                </p>
                <p className="mt-1 text-xs text-gray-400">Agente: {r.agenteNombre}</p>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-orion-navy dark:text-white">
                  {fmtUsd(r.precioCierre)}
                </p>
                <p className="text-[11px] text-gray-400">
                  Com. {fmtUsd(comVendedor + comComprador)} ({r.porcentajePorParte}% c/parte)
                </p>
              </div>
            </div>

            {r.puedeEditar && estado !== "CANCELADA" && (
              <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5">
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => mover(r.id, ESTADOS_RESERVA_VENTA[idx - 1])}
                    className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600 transition hover:border-orion-navy hover:text-orion-navy dark:border-gray-600 dark:text-gray-300"
                  >
                    ← {ESTADO_RESERVA_VENTA_LABEL[ESTADOS_RESERVA_VENTA[idx - 1]]}
                  </button>
                )}
                {idx < ESTADOS_RESERVA_VENTA.length - 2 && (
                  <button
                    type="button"
                    onClick={() => mover(r.id, ESTADOS_RESERVA_VENTA[idx + 1])}
                    className="rounded-lg border border-orion-navy/30 bg-orion-navy/5 px-2 py-1 text-xs font-semibold text-orion-navy transition hover:bg-orion-navy/10 dark:border-orion-gold/30 dark:bg-orion-gold/10 dark:text-orion-gold"
                  >
                    {ESTADO_RESERVA_VENTA_LABEL[ESTADOS_RESERVA_VENTA[idx + 1]]} →
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
