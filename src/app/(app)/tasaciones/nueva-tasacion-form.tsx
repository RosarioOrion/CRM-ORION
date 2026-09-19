"use client";

import { useActionState, useMemo, useState } from "react";
import { crearTasacion, type TasacionState } from "./actions";
import {
  calcularTasacion,
  MINIMO_COMPARABLES,
  OPCIONES_ESTADO,
  OPCIONES_UBICACION,
  type Comparable,
} from "@/lib/tasaciones";

const initialState: TasacionState = {};

const COMPARABLE_VACIO: Comparable = {
  link: "",
  m2: 0,
  precio: 0,
  esCierre: false,
  estado: 3,
  ubicacion: 3,
};

function formatoUsd(n: number) {
  return `USD ${Math.round(n).toLocaleString("es-UY")}`;
}

export function NuevaTasacionForm() {
  const [state, formAction, pending] = useActionState(crearTasacion, initialState);

  const [tipo, setTipo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [zona, setZona] = useState("");
  const [link, setLink] = useState("");
  const [m2, setM2] = useState("");
  const [estado, setEstado] = useState(3);
  const [ubicacion, setUbicacion] = useState(3);
  const [notas, setNotas] = useState("");
  const [ajusteManual, setAjusteManual] = useState("");
  const [comparables, setComparables] = useState<Comparable[]>([
    { ...COMPARABLE_VACIO },
    { ...COMPARABLE_VACIO },
    { ...COMPARABLE_VACIO },
    { ...COMPARABLE_VACIO },
  ]);

  function actualizarComparable(i: number, campo: keyof Comparable, valor: string | number | boolean) {
    setComparables((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, [campo]: valor } : c))
    );
  }

  function agregarComparable() {
    setComparables((prev) => [...prev, { ...COMPARABLE_VACIO }]);
  }

  function quitarComparable(i: number) {
    setComparables((prev) => prev.filter((_, idx) => idx !== i));
  }

  const comparablesCompletos = comparables.filter((c) => c.m2 > 0 && c.precio > 0);

  const resultado = useMemo(() => {
    const m2Num = Number(m2);
    if (!m2Num || comparablesCompletos.length < MINIMO_COMPARABLES) return null;
    return calcularTasacion(comparablesCompletos, estado, ubicacion, m2Num);
  }, [comparablesCompletos, estado, ubicacion, m2]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="comparablesJson" value={JSON.stringify(comparablesCompletos)} />

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-3 text-sm font-semibold text-orion-navy dark:text-white">
          Datos de la propiedad
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <input
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            placeholder="Tipo (casa, apartamento…) *"
            required
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
          />
          <input
            name="direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Dirección"
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
          />
          <input
            name="zona"
            value={zona}
            onChange={(e) => setZona(e.target.value)}
            placeholder="Barrio / Zona"
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
          />
          <input
            name="link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Link de publicación (opcional)"
            className="col-span-2 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
          />
          <input
            name="m2"
            type="number"
            step="0.01"
            value={m2}
            onChange={(e) => setM2(e.target.value)}
            placeholder="Superficie m² *"
            required
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
          />
          <select
            name="estado"
            value={estado}
            onChange={(e) => setEstado(Number(e.target.value))}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
          >
            {OPCIONES_ESTADO.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            name="ubicacion"
            value={ubicacion}
            onChange={(e) => setUbicacion(Number(e.target.value))}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
          >
            {OPCIONES_UBICACION.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-orion-navy dark:text-white">
            Comparables (mínimo {MINIMO_COMPARABLES})
          </p>
          <span className="text-xs text-gray-400">
            {comparablesCompletos.length} completo(s) de {comparables.length} cargado(s)
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {comparables.map((c, i) => {
            const usdM2 = resultado ? resultado.ajustados[comparablesCompletos.indexOf(c)] : undefined;
            return (
              <div
                key={i}
                className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400">
                    Comparable #{i + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => actualizarComparable(i, "esCierre", !c.esCierre)}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        c.esCierre
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                      }`}
                    >
                      {c.esCierre ? "✅ Cierre" : "📊 Dinámico"}
                    </button>
                    {comparables.length > MINIMO_COMPARABLES && (
                      <button
                        type="button"
                        onClick={() => quitarComparable(i)}
                        className="text-xs text-gray-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <input
                    value={c.link}
                    onChange={(e) => actualizarComparable(i, "link", e.target.value)}
                    placeholder="Link"
                    className="col-span-2 rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 sm:col-span-2"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={c.m2 || ""}
                    onChange={(e) => actualizarComparable(i, "m2", Number(e.target.value))}
                    placeholder="m²"
                    className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900"
                  />
                  <input
                    type="number"
                    value={c.precio || ""}
                    onChange={(e) => actualizarComparable(i, "precio", Number(e.target.value))}
                    placeholder="Precio USD"
                    className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900"
                  />
                  <select
                    value={c.estado}
                    onChange={(e) => actualizarComparable(i, "estado", Number(e.target.value))}
                    className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900"
                  >
                    {OPCIONES_ESTADO.map((o) => (
                      <option key={o.valor} value={o.valor}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={c.ubicacion}
                    onChange={(e) => actualizarComparable(i, "ubicacion", Number(e.target.value))}
                    className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900"
                  >
                    {OPCIONES_UBICACION.map((o) => (
                      <option key={o.valor} value={o.valor}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {usdM2 !== undefined && (
                  <p className="mt-2 text-xs text-gray-400">
                    USD/m² ajustado: <span className="font-semibold text-orion-navy dark:text-orion-gold">{formatoUsd(usdM2)}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={agregarComparable}
          className="mt-3 text-sm text-orion-navy hover:underline dark:text-orion-gold"
        >
          + Agregar comparable
        </button>
      </div>

      {resultado && (
        <div className="rounded-xl border border-orion-gold bg-orion-gold/5 p-4 dark:border-orion-gold">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Vista previa del cálculo
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Promedio USD/m²: <span className="font-semibold">{formatoUsd(resultado.promedioUsdM2Redondeado)}</span>
          </p>
          <p className="text-xl font-bold text-orion-navy dark:text-orion-gold">
            Valor estimado: {formatoUsd(resultado.valorEstimado)}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-3 text-sm font-semibold text-orion-navy dark:text-white">
          Ajuste manual y notas
        </p>
        <input
          name="ajusteManual"
          type="number"
          value={ajusteManual}
          onChange={(e) => setAjusteManual(e.target.value)}
          placeholder="Valor final ajustado (opcional, si querés pisar el estimado)"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
        />
        <textarea
          name="notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={3}
          placeholder="Notas y observaciones"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || comparablesCompletos.length < MINIMO_COMPARABLES}
        className="self-start rounded-lg bg-orion-navy px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending
          ? "Guardando…"
          : comparablesCompletos.length < MINIMO_COMPARABLES
          ? `Necesitás ${MINIMO_COMPARABLES - comparablesCompletos.length} comparable(s) más`
          : "Guardar tasación"}
      </button>
    </form>
  );
}
