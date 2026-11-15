"use client";

import { useState } from "react";
import {
  calcularRentabilidad,
  calcularRenta,
  pct,
  TASAS_REFERENCIA,
  valorPorRenta,
} from "@/lib/rentabilidad";
import { formatoUsd } from "@/lib/tasacion-pro";
import { CamposRenta } from "../campos-renta";
import { aDatosRenta, RENTA_VACIA, type FormRenta } from "@/lib/rentabilidad";

const input =
  "rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";

function Dato({ label, valor, fuerte }: { label: string; valor: string; fuerte?: boolean }) {
  return (
    <div className="rounded-lg bg-white p-3 text-center dark:bg-gray-800">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={fuerte ? "text-xl font-bold text-orion-navy dark:text-orion-gold" : "text-base font-semibold text-gray-800 dark:text-gray-100"}>
        {valor}
      </p>
    </div>
  );
}

export function CalculadoraRentabilidad() {
  const [modo, setModo] = useState<"rinde" | "vale">("rinde");
  const [renta, setRenta] = useState<FormRenta>(RENTA_VACIA);
  const [precio, setPrecio] = useState<number | undefined>();
  const [tasa, setTasa] = useState<number | undefined>(7);
  const datos = aDatosRenta(renta);
  const r = datos && modo === "rinde" && precio ? calcularRentabilidad(precio, datos) : null;
  const neta = datos ? calcularRenta(datos) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        {(
          [
            ["rinde", "💰 ¿Cuánto rinde?", "Tengo el precio y el alquiler"],
            ["vale", "🏷️ ¿Cuánto vale por su renta?", "Tengo el alquiler, no el precio"],
          ] as const
        ).map(([k, t, d]) => (
          <button
            key={k}
            type="button"
            onClick={() => setModo(k)}
            className={`rounded-md px-3 py-2 text-left ${modo === k ? "bg-white shadow dark:bg-gray-900" : ""}`}
          >
            <span className={`block text-sm font-semibold ${modo === k ? "text-orion-navy dark:text-white" : "text-gray-500"}`}>{t}</span>
            <span className="block text-[11px] text-gray-400">{d}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-3 text-sm font-semibold text-orion-navy dark:text-white">Alquiler y gastos</p>
        <CamposRenta valor={renta} onChange={setRenta} />
        {modo === "rinde" ? (
          <label className="mt-4 flex max-w-xs flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            Precio de la propiedad (USD) *
            <input
              type="number"
              min="0"
              value={precio ?? ""}
              onChange={(e) => setPrecio(e.target.value === "" ? undefined : Number(e.target.value))}
              className={input}
            />
          </label>
        ) : (
          <label className="mt-4 flex max-w-xs flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            Tasa de capitalización esperada (%) *
            <input
              type="number"
              step="0.1"
              min="0"
              value={tasa ?? ""}
              onChange={(e) => setTasa(e.target.value === "" ? undefined : Number(e.target.value))}
              className={input}
            />
            <span className="text-[10px] text-gray-400">la rentabilidad neta que pide un inversor (ver referencias abajo)</span>
          </label>
        )}
      </div>

      {!datos && (
        <p className="text-sm text-gray-400">
          Cargá el alquiler{renta.moneda === "UYU" ? " y la cotización del dólar" : ""} para ver el resultado.
        </p>
      )}

      {modo === "rinde" && r && (
        <div className="rounded-xl border border-orion-gold bg-orion-gold/5 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Dato label="Rentabilidad bruta" valor={pct(r.bruta)} />
            <Dato label="Rentabilidad neta" valor={pct(r.neta)} fuerte />
            <Dato label="Neta después de IRPF" valor={pct(r.netaDespuesIrpf)} />
            <Dato label="Recupero" valor={r.anosRecupero ? `${r.anosRecupero.toFixed(1)} años` : "—"} />
          </div>
          <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
            Renta bruta {formatoUsd(r.rentaBruta)}/año − gastos {formatoUsd(r.gastos)} = renta neta{" "}
            <strong>{formatoUsd(r.rentaNeta)}</strong>/año · IRPF estimado {formatoUsd(r.irpf)} (12% sobre lo cobrado menos
            contribución, primaria y administración).
          </p>
        </div>
      )}

      {modo === "vale" && neta && tasa ? (
        <div className="rounded-xl border border-orion-gold bg-orion-gold/5 p-4">
          <div className="grid grid-cols-3 gap-3">
            {[tasa + 1, tasa, tasa - 1].filter((t) => t > 0).map((t) => (
              <Dato key={t} label={`Al ${t.toLocaleString("es-UY")}%`} valor={formatoUsd(valorPorRenta(datos!, t))} fuerte={t === tasa} />
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
            Renta neta {formatoUsd(neta.rentaNeta)}/año ÷ {tasa}% = <strong>{formatoUsd(valorPorRenta(datos!, tasa))}</strong>. A
            mayor tasa (más riesgo o peor ubicación), menor valor.
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-2 text-sm font-semibold text-orion-navy dark:text-white">Tasas de referencia (netas, orientativas)</p>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {TASAS_REFERENCIA.map((t) => (
              <tr key={t.tipo}>
                <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-200">{t.tipo}</td>
                <td className="py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">
                  {t.min.toLocaleString("es-UY")}% – {t.max.toLocaleString("es-UY")}%
                </td>
                <td className="py-1.5 text-xs text-gray-400">{t.nota}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-gray-400">
          Son rangos habituales para arrancar, no un dato oficial: ajustalos con lo que veas en tu zona (por ejemplo,
          dividiendo la renta neta de propiedades alquiladas que se vendieron por su precio de venta).
        </p>
      </div>
    </div>
  );
}
