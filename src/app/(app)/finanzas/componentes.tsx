"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIAS, GRUPO_LABEL, pesos, type Grupo } from "@/lib/finanzas";
import {
  agregarMovimiento,
  eliminarMovimiento,
  guardarCotizacion,
  guardarPresupuesto,
  type FinanzasState,
} from "./actions";

const inicial: FinanzasState = {};
const input =
  "rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";

/** Cargar un ingreso o un gasto. */
export function FormMovimiento({ hoy }: { hoy: string }) {
  const [state, action, pending] = useActionState(agregarMovimiento, inicial);
  const [tipo, setTipo] = useState<"INGRESO" | "GASTO">("GASTO");
  const grupos: Grupo[] = tipo === "INGRESO" ? ["INGRESO"] : ["TRABAJO", "PERSONAL", "RESERVA"];
  return (
    <form action={action} key={state.ok ?? "f"} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-900">
        {(["GASTO", "INGRESO"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`rounded-md py-1.5 text-sm font-semibold ${
              tipo === t ? (t === "INGRESO" ? "bg-emerald-600 text-white" : "bg-orion-navy text-white") : "text-gray-500"
            }`}
          >
            {t === "INGRESO" ? "➕ Ingreso" : "➖ Gasto o reserva"}
          </button>
        ))}
      </div>
      <select name="categoria" required defaultValue="" className={input}>
        <option value="" disabled>
          Categoría…
        </option>
        {grupos.map((g) => (
          <optgroup key={g} label={GRUPO_LABEL[g]}>
            {CATEGORIAS.filter((c) => c.grupo === g).map((c) => (
              <option key={c.clave} value={c.clave}>
                {c.icono} {c.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <div className="grid grid-cols-3 gap-2">
        <input name="monto" type="number" step="any" min="0" placeholder="Monto *" required className={`${input} col-span-2`} />
        <select name="moneda" defaultValue="UYU" className={input}>
          <option value="UYU">$U</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <input name="fecha" type="date" defaultValue={hoy} required className={input} />
      <input name="nota" placeholder="Nota (opcional)" className={input} />
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

export function BorrarMovimiento({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("¿Borrar este movimiento?")) return;
        start(async () => {
          const r = await eliminarMovimiento(id);
          if (r.error) window.alert(r.error);
          router.refresh();
        });
      }}
      className="text-xs text-gray-400 hover:text-red-600"
      aria-label="Borrar"
    >
      ✕
    </button>
  );
}

export function FormCotizacion({ mes, valor }: { mes: string; valor: number | null }) {
  const [state, action, pending] = useActionState(guardarCotizacion, inicial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="mes" value={mes} />
      <label className="text-xs text-gray-500 dark:text-gray-400">Cotización del dólar del mes: $U</label>
      <input name="cotizacion" type="number" step="0.01" min="1" defaultValue={valor ?? ""} placeholder="ej. 40" className={`${input} w-24 py-1`} />
      <button type="submit" disabled={pending} className="rounded-lg border border-orion-navy px-3 py-1 text-xs font-semibold text-orion-navy disabled:opacity-50 dark:border-orion-gold dark:text-orion-gold">
        {pending ? "…" : "Guardar"}
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
      {state.ok && !state.error && <span className="text-xs text-emerald-600">✓</span>}
    </form>
  );
}

/** Presupuesto del mes (en pesos). Desde el Money Day también cierra el mes anterior. */
export function FormPresupuesto({
  mes,
  presupuesto,
  ingresoEsperado,
  referencia,
  cerrarMes,
  boton,
}: {
  mes: string;
  presupuesto: Record<string, number>;
  ingresoEsperado: number | null;
  /** Lo real de un mes, para comparar mientras se arma el presupuesto. */
  referencia?: Record<string, number>;
  cerrarMes?: string;
  boton: string;
}) {
  const [state, action, pending] = useActionState(guardarPresupuesto, inicial);
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(CATEGORIAS.map((c) => [c.clave, presupuesto[c.clave] ? String(presupuesto[c.clave]) : ""]))
  );
  const [ingreso, setIngreso] = useState(ingresoEsperado ? String(Math.round(ingresoEsperado)) : "");
  const total = (g: Grupo) =>
    CATEGORIAS.filter((c) => c.grupo === g).reduce((n, c) => n + (Number(valores[c.clave]) || 0), 0);
  const egresos = total("TRABAJO") + total("PERSONAL") + total("RESERVA");
  const libre = (Number(ingreso) || 0) - egresos;
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="mes" value={mes} />
      {cerrarMes && <input type="hidden" name="cerrarMes" value={cerrarMes} />}
      <label className="flex max-w-xs flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
        Ingreso que espero (en pesos)
        <input name="ingresoEsperado" type="number" min="0" value={ingreso} onChange={(e) => setIngreso(e.target.value)} className={input} />
        <span className="text-[10px] text-gray-400">Sé prudente: contá solo lo que tenés casi seguro (reservas, señas firmadas).</span>
      </label>
      {(["TRABAJO", "PERSONAL", "RESERVA"] as Grupo[]).map((g) => (
        <div key={g}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {GRUPO_LABEL[g]} · {pesos(total(g))}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CATEGORIAS.filter((c) => c.grupo === g).map((c) => (
              <label key={c.clave} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <span className="w-6 text-center">{c.icono}</span>
                <span className="flex-1 truncate" title={c.label}>
                  {c.label}
                  {referencia?.[c.clave] ? (
                    <span className="block text-[10px] text-gray-400">este mes: {pesos(referencia[c.clave])}</span>
                  ) : null}
                </span>
                <input
                  name={`p_${c.clave}`}
                  type="number"
                  min="0"
                  value={valores[c.clave]}
                  onChange={(e) => setValores((v) => ({ ...v, [c.clave]: e.target.value }))}
                  placeholder="$"
                  className={`${input} w-28 py-1`}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
      <p className={`rounded-lg px-3 py-2 text-sm ${libre < 0 ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"}`}>
        Ingreso esperado {pesos(Number(ingreso) || 0)} − presupuesto {pesos(egresos)} ={" "}
        <strong>{pesos(libre)}</strong> {libre < 0 ? "(no alcanza: ajustá algo)" : "libres"}
      </p>
      {cerrarMes && (
        <textarea
          name="notas"
          rows={2}
          placeholder="Notas de este cierre: qué aprendiste, qué vas a cambiar… (solo vos las ves)"
          className={input}
        />
      )}
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.ok && !state.error && <p className="text-xs text-emerald-600">✓ Guardado.</p>}
      <button type="submit" disabled={pending} className="self-start rounded-lg bg-orion-navy px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Guardando…" : boton}
      </button>
    </form>
  );
}
