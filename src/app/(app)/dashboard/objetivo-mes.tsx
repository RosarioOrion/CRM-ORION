"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ObjetivoMes as Datos } from "@/lib/objetivo-mes";
import { guardarObjetivoMes } from "./actions";

const usd = (n: number) => `USD ${n.toLocaleString("es-UY")}`;

/** Inicio: comisiones cobradas del mes contra el objetivo, y cierres del mes. */
export function ObjetivoMes({ datos: d }: { datos: Datos }) {
  const [editando, setEditando] = useState(d.objetivo === null);
  const [valor, setValor] = useState(d.objetivo ? String(d.objetivo) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const mes = d.mesLabel.charAt(0).toUpperCase() + d.mesLabel.slice(1);
  const pct = d.objetivo ? Math.round((d.cobrado / d.objetivo) * 100) : 0;

  function guardar() {
    setError(null);
    startTransition(async () => {
      const r = await guardarObjetivoMes(Number(valor));
      if (r.error) setError(r.error);
      else setEditando(false);
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">🎯 Objetivo de {d.mesLabel}</p>
          {d.objetivo !== null ? (
            <p className="mt-1 text-lg font-bold text-orion-navy dark:text-white sm:text-xl">
              {usd(d.cobrado)} <span className="font-normal text-gray-500 dark:text-gray-400">de</span>{" "}
              {usd(d.objetivo)}
            </p>
          ) : (
            <p className="mt-1 text-lg font-bold text-orion-navy dark:text-white">
              Cobrado: {usd(d.cobrado)}
            </p>
          )}
        </div>
        <Link
          href="/comisiones"
          className="shrink-0 rounded-lg border border-gray-200 px-4 py-2 text-center hover:border-orion-navy dark:border-gray-700"
        >
          <p className="text-2xl font-bold text-orion-navy dark:text-orion-gold">{d.cierres}</p>
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Cierres del mes</p>
        </Link>
      </div>

      {d.objetivo !== null && (
        <div className="mt-3">
          <div
            className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"
            role="progressbar"
            aria-valuenow={Math.min(pct, 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Objetivo de ${d.mesLabel}`}
          >
            <div
              className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-orion-gold"}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {pct >= 100
              ? `¡Objetivo cumplido! ${pct}% 🎉`
              : `${pct}% · te faltan ${usd(d.objetivo - d.cobrado)}`}
          </p>
        </div>
      )}

      {d.automatico && !editando && (
        <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-900/20 dark:text-sky-200">
          ℹ️ No tenías objetivo para {d.mesLabel}: te asigné {usd(d.promedio)}, el promedio de lo que cobraste en
          tus últimos 3 meses.{" "}
          <button type="button" onClick={() => setEditando(true)} className="font-semibold underline">
            Cambiarlo
          </button>
        </p>
      )}

      {editando ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {d.objetivo === null && (
            <p className="w-full text-xs text-gray-500 dark:text-gray-400">
              Todavía no tenés objetivo para {d.mesLabel} ni comisiones cobradas en los últimos 3 meses para
              calcularlo. Definilo vos:
            </p>
          )}
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-300" htmlFor="objetivo-mes">
            Objetivo de {mes} (USD)
          </label>
          <input
            id="objetivo-mes"
            type="number"
            min={1}
            inputMode="numeric"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-32 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
          <button
            type="button"
            onClick={guardar}
            disabled={pending || !valor}
            className="rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
          {d.objetivo !== null && (
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="text-xs text-gray-500 hover:underline dark:text-gray-400"
            >
              Cancelar
            </button>
          )}
          {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
        </div>
      ) : (
        !d.automatico && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="mt-2 text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold"
          >
            Cambiar objetivo
          </button>
        )
      )}
    </div>
  );
}
