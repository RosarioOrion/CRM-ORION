"use client";

import type { FormRenta } from "@/lib/rentabilidad";

// Campos del alquiler y los gastos del dueño (calculadora y tasación).
// Los montos se pueden cargar en pesos: se pasan a dólares con la cotización.

const input =
  "rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";

function Campo({
  label,
  value,
  onChange,
  placeholder,
  ayuda,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  ayuda?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
      {label}
      <input
        type="number"
        step="any"
        min="0"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        placeholder={placeholder}
        className={input}
      />
      {ayuda && <span className="text-[10px] text-gray-400">{ayuda}</span>}
    </label>
  );
}

export function CamposRenta({ valor, onChange }: { valor: FormRenta; onChange: (f: FormRenta) => void }) {
  const set = (cambios: Partial<FormRenta>) => onChange({ ...valor, ...cambios });
  const mon = valor.moneda === "UYU" ? "$U" : "USD";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
          Montos en
          <select value={valor.moneda} onChange={(e) => set({ moneda: e.target.value as "USD" | "UYU" })} className={input}>
            <option value="USD">Dólares (USD)</option>
            <option value="UYU">Pesos ($U)</option>
          </select>
        </label>
        {valor.moneda === "UYU" && (
          <Campo
            label="Cotización del dólar *"
            value={valor.cotizacion}
            onChange={(v) => set({ cotizacion: v })}
            placeholder="ej. 40"
            ayuda="$U por cada USD"
          />
        )}
        <Campo
          label={`Alquiler mensual (${mon}) *`}
          value={valor.alquilerMensual}
          onChange={(v) => set({ alquilerMensual: v })}
          placeholder="sin gastos comunes"
        />
        <Campo
          label="Meses sin inquilino al año"
          value={valor.mesesVacios}
          onChange={(v) => set({ mesesVacios: v })}
          ayuda="vacancia (1 es habitual)"
        />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Gastos del dueño</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Campo label={`Contribución anual (${mon})`} value={valor.contribucionAnual} onChange={(v) => set({ contribucionAnual: v })} />
        <Campo label={`Primaria anual (${mon})`} value={valor.primariaAnual} onChange={(v) => set({ primariaAnual: v })} />
        <Campo
          label={`Otros por año (${mon})`}
          value={valor.otrosGastosAnuales}
          onChange={(v) => set({ otrosGastosAnuales: v })}
          ayuda="seguro, fondo de reserva…"
        />
        <Campo
          label="Mantenimiento (%)"
          value={valor.mantenimientoPct}
          onChange={(v) => set({ mantenimientoPct: v })}
          ayuda="del alquiler"
        />
        <Campo
          label="Administración (%)"
          value={valor.administracionPct}
          onChange={(v) => set({ administracionPct: v })}
          ayuda="si la administra una inmobiliaria"
        />
      </div>
    </div>
  );
}
