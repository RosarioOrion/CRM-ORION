"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { crearTasacion, sugerirComparables, type TasacionState } from "./actions";
import {
  busquedasEnPortales,
  calcularTasacion,
  MINIMO_COMPARABLES,
  OPCIONES_ESTADO,
  OPCIONES_UBICACION,
  type Comparable,
  type ComparableSugerido,
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

  const [buscando, iniciarBusqueda] = useTransition();
  const [sugeridos, setSugeridos] = useState<ComparableSugerido[] | null>(null);
  const [errorSugeridos, setErrorSugeridos] = useState("");

  function buscarSugeridos() {
    setErrorSugeridos("");
    iniciarBusqueda(async () => {
      const r = await sugerirComparables(tipo, zona, Number(m2));
      if (r.error) {
        setErrorSugeridos(r.error);
        setSugeridos(null);
      } else {
        setSugeridos(r.sugeridos ?? []);
      }
    });
  }

  // Ocupa primero los comparables vacíos y después agrega al final.
  function usarSugeridos(lista: ComparableSugerido[]) {
    setComparables((prev) => {
      const nuevos = [...prev];
      for (const s of lista) {
        if (nuevos.some((c) => c.link === s.link)) continue;
        const { link, m2, precio, esCierre, estado, ubicacion } = s;
        const comparable = { link, m2, precio, esCierre, estado, ubicacion };
        const vacio = nuevos.findIndex((c) => !c.link && !c.m2 && !c.precio);
        if (vacio >= 0) nuevos[vacio] = comparable;
        else nuevos.push(comparable);
      }
      return nuevos;
    });
  }

  const yaCargado = (s: ComparableSugerido) => comparables.some((c) => c.link === s.link);
  const portales = busquedasEnPortales(tipo, zona, Number(m2));

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

        <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={buscarSugeridos}
              disabled={buscando}
              className="rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {buscando ? "Buscando…" : "🔎 Sugerir comparables de Orion"}
            </button>
            {portales.map((p) => (
              <a
                key={p.portal}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200"
              >
                Buscar en {p.portal} ↗
              </a>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            Orion busca propiedades en venta del mismo tipo y zona, con ±25% de m². Las vendidas o reservadas
            entran como Cierre y las activas como Dinámico. En los portales, copiá el link del aviso que elijas
            y cargalo en un comparable.
          </p>
          {errorSugeridos && <p className="mt-2 text-xs text-red-600">{errorSugeridos}</p>}
          {sugeridos && sugeridos.length === 0 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              No hay propiedades parecidas en Orion. Probá con una zona más amplia o buscá en los portales.
            </p>
          )}
          {sugeridos && sugeridos.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {sugeridos.length} encontrada(s)
                </span>
                {sugeridos.some((s) => !yaCargado(s)) && (
                  <button
                    type="button"
                    onClick={() => usarSugeridos(sugeridos)}
                    className="text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold"
                  >
                    Agregar todas
                  </button>
                )}
              </div>
              {sugeridos.map((s) => (
                <div
                  key={s.link}
                  className="flex items-center justify-between gap-3 rounded border border-gray-200 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="min-w-0">
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate font-semibold text-gray-700 hover:underline dark:text-gray-200"
                    >
                      {s.codigo} · {s.titulo}
                    </a>
                    <span className="text-gray-400">
                      {s.zona} · {s.m2} m² · {formatoUsd(s.precio)} ·{" "}
                      {s.esCierre ? "✅ Cierre" : "📊 Dinámico"}
                    </span>
                  </div>
                  {yaCargado(s) ? (
                    <span className="shrink-0 text-gray-400">Agregada</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => usarSugeridos([s])}
                      className="shrink-0 rounded border border-orion-navy px-2 py-1 font-semibold text-orion-navy dark:border-orion-gold dark:text-orion-gold"
                    >
                      Agregar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
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
