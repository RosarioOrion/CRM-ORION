"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { crearTasacion, editarTasacion, sugerirComparables, type TasacionState } from "./actions";
import { busquedasEnPortales, type ComparableSugerido } from "@/lib/tasaciones";
import {
  calcularTasacionPro,
  CAMPOS,
  categoriaDe,
  comparableCompleto,
  CONFIABILIDAD_LABEL,
  DEPARTAMENTOS_UY,
  formatoSuperficie,
  formatoUsd,
  MINIMO_COMPARABLES,
  superficieComparable,
  TIPOS_TASACION,
  ZONA_TIPO_LABEL,
  type Categoria,
  type ComparablePro,
  type ZonaTipo,
} from "@/lib/tasacion-pro";
import { BARRIOS_CONOCIDOS } from "@/lib/revisar-propiedad";
import {
  aDatosRenta,
  calcularRenta,
  METODO_LABEL,
  RENTA_VACIA,
  tasaSugerida,
  valorFinal,
  valorPorRenta,
  type FormRenta,
  type RentaGuardada,
} from "@/lib/rentabilidad";
import { CamposRenta } from "./campos-renta";

const initialState: TasacionState = {};

const PUNTAJES = [
  { valor: 1, label: "1 – Malo" },
  { valor: 2, label: "2 – Regular" },
  { valor: 3, label: "3 – Bueno" },
  { valor: 4, label: "4 – Excelente" },
];

const COMPARABLE_VACIO: ComparablePro = { link: "", m2: 0, precio: 0, esCierre: false, estado: 3, ubicacion: 3 };

const DEPTOS_BALNEARIOS = ["Canelones", "Maldonado", "Rocha"];

/** Tasación guardada que se edita. */
export type TasacionExistente = {
  id: string;
  tipo: string;
  departamento: string;
  zona: string;
  direccion: string;
  link: string;
  zonaTipo: ZonaTipo;
  m2: number;
  m2Semi?: number;
  m2Desc?: number;
  m2Terreno?: number;
  garajes?: number;
  piscina?: boolean;
  esquina?: boolean;
  coneat?: number;
  estado: number;
  ubicacion: number;
  comparables: ComparablePro[];
  ajusteManual: number | null;
  notas: string;
  renta?: RentaGuardada | null;
};

export type TasacionInicial = {
  captacionId: string;
  tipo: string;
  direccion: string | null;
  zona: string | null;
  link: string | null;
};

const input =
  "rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";
const inputChico =
  "rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";

function tipoInicial(t?: string) {
  if (!t) return "";
  const exacto = TIPOS_TASACION.find((x) => x.tipo.toLowerCase() === t.toLowerCase());
  if (exacto) return exacto.tipo;
  const cat = categoriaDe(t);
  return TIPOS_TASACION.find((x) => x.categoria === cat)?.tipo ?? "";
}

/** Campo numérico que guarda undefined si está vacío. */
function Num({
  value,
  onChange,
  placeholder,
  className,
  name,
  step,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder: string;
  className: string;
  name?: string;
  step?: string;
}) {
  return (
    <input
      name={name}
      type="number"
      step={step ?? "any"}
      min="0"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      placeholder={placeholder}
      className={className}
    />
  );
}

export function NuevaTasacionForm({
  inicial,
  existente: e,
}: { inicial?: TasacionInicial; existente?: TasacionExistente } = {}) {
  const [state, formAction, pending] = useActionState(e ? editarTasacion : crearTasacion, initialState);

  // --- Propiedad a tasar ---
  const [tipo, setTipo] = useState(tipoInicial(e?.tipo ?? inicial?.tipo));
  const cat: Categoria | null = tipo ? categoriaDe(tipo) : null;
  const k = cat ? CAMPOS[cat] : null;
  const [departamento, setDepartamento] = useState(e?.departamento ?? "");
  const [zona, setZona] = useState(e?.zona ?? inicial?.zona ?? "");
  const [direccion, setDireccion] = useState(e?.direccion ?? inicial?.direccion ?? "");
  const [link, setLink] = useState(e?.link ?? inicial?.link ?? "");
  const [zonaTipo, setZonaTipo] = useState<ZonaTipo>(e?.zonaTipo ?? "URBANA");
  const [m2, setM2] = useState<number | undefined>(e?.m2);
  const [m2Semi, setM2Semi] = useState<number | undefined>(e?.m2Semi);
  const [m2Desc, setM2Desc] = useState<number | undefined>(e?.m2Desc);
  const [m2Terreno, setM2Terreno] = useState<number | undefined>(e?.m2Terreno);
  const [garajes, setGarajes] = useState<number | undefined>(e?.garajes);
  const [piscina, setPiscina] = useState(!!e?.piscina);
  const [esquina, setEsquina] = useState(!!e?.esquina);
  const [coneat, setConeat] = useState<number | undefined>(e?.coneat);
  const [estado, setEstado] = useState(e?.estado ?? 3);
  const [ubicacion, setUbicacion] = useState(e?.ubicacion ?? 3);
  const [notas, setNotas] = useState(e?.notas ?? "");
  const [ajusteManual, setAjusteManual] = useState(e?.ajusteManual != null ? String(e.ajusteManual) : "");
  // Valor por renta (opcional).
  const [usarRenta, setUsarRenta] = useState(!!e?.renta);
  const [renta, setRenta] = useState<FormRenta>(e?.renta ?? RENTA_VACIA);
  const [tasa, setTasa] = useState<number | undefined>(e?.renta?.tasa);

  // --- Comparables ---
  const [comparables, setComparables] = useState<ComparablePro[]>(e?.comparables.length ? e.comparables : [
    { ...COMPARABLE_VACIO },
    { ...COMPARABLE_VACIO },
    { ...COMPARABLE_VACIO },
    { ...COMPARABLE_VACIO },
  ]);
  const [masDatos, setMasDatos] = useState<Record<number, boolean>>({});

  function cambiarComparable(i: number, cambios: Partial<ComparablePro>) {
    setComparables((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...cambios } : c)));
  }

  function elegirDepartamento(d: string) {
    setDepartamento(d);
    setZonaTipo(DEPTOS_BALNEARIOS.includes(d) ? "BALNEARIA" : "URBANA");
  }

  const sujeto = useMemo(
    () => ({
      m2: m2 ?? 0,
      estado,
      ubicacion,
      m2Semi,
      m2Desc,
      m2Terreno,
      garajes,
      piscina: piscina || undefined,
      esquina: esquina || undefined,
      coneat,
    }),
    [m2, estado, ubicacion, m2Semi, m2Desc, m2Terreno, garajes, piscina, esquina, coneat]
  );

  const completos = comparables.filter(comparableCompleto);
  const resultado = useMemo(() => {
    if (!cat || !sujeto.m2 || completos.length === 0) return null;
    return calcularTasacionPro(cat, sujeto, completos, zonaTipo);
  }, [cat, sujeto, completos, zonaTipo]);
  const supSujeto = cat && sujeto.m2 ? superficieComparable(cat, sujeto, zonaTipo) : 0;

  // --- Sugerir comparables de Orion ---
  const [buscando, iniciarBusqueda] = useTransition();
  const [sugeridos, setSugeridos] = useState<ComparableSugerido[] | null>(null);
  const [errorSugeridos, setErrorSugeridos] = useState("");

  function buscarSugeridos() {
    setErrorSugeridos("");
    iniciarBusqueda(async () => {
      const r = await sugerirComparables(tipo, zona, m2 ?? 0, e?.id);
      if (r.error) {
        setErrorSugeridos(r.error);
        setSugeridos(null);
      } else setSugeridos(r.sugeridos ?? []);
    });
  }

  function usarSugeridos(lista: ComparableSugerido[]) {
    setComparables((prev) => {
      const nuevos = [...prev];
      for (const s of lista) {
        if (nuevos.some((c) => c.link === s.link)) continue;
        const c: ComparablePro = {
          link: s.link,
          m2: s.m2,
          precio: s.precio,
          esCierre: s.esCierre,
          esTasacion: s.esTasacion,
          estado: s.estado,
          ubicacion: s.ubicacion,
          m2Terreno: s.m2Terreno,
          garajes: s.garajes,
          piscina: s.piscina,
        };
        const vacio = nuevos.findIndex((x) => !x.link && !x.m2 && !x.precio);
        if (vacio >= 0) nuevos[vacio] = c;
        else nuevos.push(c);
      }
      return nuevos;
    });
  }

  const yaCargado = (s: ComparableSugerido) => comparables.some((c) => c.link === s.link);
  const portales = busquedasEnPortales(tipo.split(" ")[0], zona, m2 ?? 0);
  const unidad = k?.unidad ?? "m²";
  const datosRenta = usarRenta ? aDatosRenta(renta) : null;
  const tasaUsada = tasa ?? tasaSugerida(cat);
  const valorRenta = datosRenta ? valorPorRenta(datosRenta, tasaUsada) : 0;
  const rentaOk = valorRenta > 0;
  const faltan = rentaOk ? 0 : MINIMO_COMPARABLES - completos.length;
  const final = valorFinal(
    completos.length >= MINIMO_COMPARABLES && resultado ? resultado.valorCierre : null,
    rentaOk ? valorRenta : null
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="comparablesJson" value={JSON.stringify(completos)} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="zonaTipo" value={zonaTipo} />
      <input type="hidden" name="estado" value={estado} />
      <input type="hidden" name="ubicacion" value={ubicacion} />
      {inicial && <input type="hidden" name="captacionId" value={inicial.captacionId} />}
      {e && <input type="hidden" name="tasacionId" value={e.id} />}
      {usarRenta && <input type="hidden" name="rentaJson" value={JSON.stringify({ ...renta, tasa: tasaUsada })} />}

      {/* 1. Tipo */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-3 text-sm font-semibold text-orion-navy dark:text-white">1. ¿Qué se tasa?</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {TIPOS_TASACION.map((t) => (
            <button
              key={t.tipo}
              type="button"
              onClick={() => setTipo(t.tipo)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                tipo === t.tipo
                  ? "border-orion-navy bg-orion-navy text-white"
                  : "border-gray-200 text-gray-700 hover:border-orion-navy dark:border-gray-600 dark:text-gray-200"
              }`}
            >
              <span className="text-lg">{t.icono}</span>
              {t.tipo}
            </button>
          ))}
        </div>
      </div>

      {k && cat && (
        <>
          {/* 2. Datos de la propiedad */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="mb-3 text-sm font-semibold text-orion-navy dark:text-white">2. Datos de la propiedad</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <select
                name="departamento"
                value={departamento}
                onChange={(e) => elegirDepartamento(e.target.value)}
                className={input}
              >
                <option value="">Departamento…</option>
                {DEPARTAMENTOS_UY.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
              <input
                name="zona"
                list="barrios-tasacion"
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                placeholder="Barrio / localidad *"
                className={input}
              />
              <datalist id="barrios-tasacion">
                {BARRIOS_CONOCIDOS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
              <input
                name="direccion"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Dirección"
                className={input}
              />
              <input
                name="link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Link de publicación (opcional)"
                className={`${input} sm:col-span-3`}
              />
            </div>

            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Medidas</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                {k.medida} *
                <Num name="m2" value={m2} onChange={setM2} placeholder={k.unidad} className={input} />
              </label>
              {k.terreno && (
                <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                  m² de terreno *
                  <Num name="m2Terreno" value={m2Terreno} onChange={setM2Terreno} placeholder="m²" className={input} />
                </label>
              )}
              {k.semi && (
                <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                  Semicubiertos (galería, balcón techado)
                  <Num name="m2Semi" value={m2Semi} onChange={setM2Semi} placeholder="m² (50%)" className={input} />
                </label>
              )}
              {k.desc && (
                <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                  Descubiertos (terraza, patio)
                  <Num name="m2Desc" value={m2Desc} onChange={setM2Desc} placeholder="m² (30%)" className={input} />
                </label>
              )}
              {k.garajes && (
                <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                  Garajes
                  <Num name="garajes" value={garajes} onChange={setGarajes} placeholder="0" step="1" className={input} />
                </label>
              )}
              {k.coneat && (
                <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                  Índice CONEAT
                  <Num name="coneat" value={coneat} onChange={setConeat} placeholder="ej. 100" className={input} />
                </label>
              )}
              {k.piscina && (
                <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-700 dark:text-gray-200">
                  <input type="checkbox" name="piscina" checked={piscina} onChange={(e) => setPiscina(e.target.checked)} />
                  Piscina
                </label>
              )}
              {k.esquina && (
                <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-700 dark:text-gray-200">
                  <input type="checkbox" name="esquina" checked={esquina} onChange={(e) => setEsquina(e.target.checked)} />
                  Esquina
                </label>
              )}
            </div>

            {k.terreno && (
              <div className="mt-3 flex flex-wrap gap-4">
                {(Object.keys(ZONA_TIPO_LABEL) as ZonaTipo[]).map((z) => (
                  <label key={z} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-200">
                    <input type="radio" checked={zonaTipo === z} onChange={() => setZonaTipo(z)} />
                    {ZONA_TIPO_LABEL[z]}
                  </label>
                ))}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                {k.estado} (1 a 4)
                <select value={estado} onChange={(e) => setEstado(Number(e.target.value))} className={input}>
                  {PUNTAJES.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                {k.ubicacion} (1 a 4)
                <select value={ubicacion} onChange={(e) => setUbicacion(Number(e.target.value))} className={input}>
                  {PUNTAJES.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.label.replace("Malo", "Mala").replace("Bueno", "Buena")}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {supSujeto > 0 && unidad === "m²" && (k.semi || k.desc || k.terreno) && (
              <p className="mt-3 rounded-lg bg-orion-gold/10 px-3 py-2 text-xs text-gray-700 dark:text-gray-200">
                Superficie ponderada para comparar: <strong>{formatoSuperficie(supSujeto, "m²")}</strong>
                {k.terreno && m2Terreno ? " (incluye el terreno libre)" : ""}
              </p>
            )}
          </div>

          {/* 3. Comparables */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-orion-navy dark:text-white">
                3. Comparables (mínimo {MINIMO_COMPARABLES})
              </p>
              <span className="text-xs text-gray-400">
                {completos.length} completo(s) de {comparables.length}
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
                Orion busca propiedades en venta del mismo tipo y barrio, con ±25% de superficie. Las vendidas o
                reservadas entran como Cierre, las activas como Dinámico (se les descuenta 10%) y también aparecen las
                tasaciones anteriores del equipo (📐 Tasación previa).
              </p>
              {errorSugeridos && <p className="mt-2 text-xs text-red-600">{errorSugeridos}</p>}
              {sugeridos && sugeridos.length === 0 && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  No hay propiedades parecidas en Orion. Buscá en los portales y cargalas abajo.
                </p>
              )}
              {sugeridos && sugeridos.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">{sugeridos.length} encontrada(s)</span>
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
                        <a href={s.link} target="_blank" rel="noreferrer" className="block truncate font-semibold text-gray-700 hover:underline dark:text-gray-200">
                          {s.codigo} · {s.titulo}
                        </a>
                        <span className="text-gray-400">
                          {s.zona} · {s.m2} {unidad} · {formatoUsd(s.precio)} ·{" "}
                          {s.esTasacion ? "📐 Tasación previa" : s.esCierre ? "✅ Cierre" : "📊 Dinámico"}
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
                const idx = completos.indexOf(c);
                const calc = resultado && idx >= 0 ? resultado.comparables[idx] : undefined;
                const extraDisponible = k.semi || k.desc || (k.garajes && cat !== "APARTAMENTO") || k.piscina;
                return (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 ${
                      calc?.atipico ? "border-red-300 dark:border-red-800" : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-400">Comparable #{i + 1}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            cambiarComparable(i, c.esTasacion ? { esTasacion: undefined, esCierre: false } : { esCierre: !c.esCierre })
                          }
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            c.esTasacion
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                              : c.esCierre
                              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          }`}
                          title="Cierre = venta concretada · Dinámico = publicación activa (−10%) · Tasación previa = valor de una tasación de Orion"
                        >
                          {c.esTasacion ? "📐 Tasación previa" : c.esCierre ? "✅ Cierre" : "📊 Dinámico"}
                        </button>
                        {comparables.length > MINIMO_COMPARABLES && (
                          <button
                            type="button"
                            onClick={() => setComparables((prev) => prev.filter((_, j) => j !== i))}
                            className="text-xs text-gray-400 hover:text-red-500"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                      <input
                        value={c.link}
                        onChange={(e) => cambiarComparable(i, { link: e.target.value })}
                        placeholder="Link"
                        className={`${inputChico} col-span-2`}
                      />
                      <Num value={c.m2 || undefined} onChange={(v) => cambiarComparable(i, { m2: v ?? 0 })} placeholder={k.unidad === "ha" ? "Hectáreas" : k.terreno ? "m² edif." : "m²"} className={inputChico} />
                      {k.terreno && (
                        <Num value={c.m2Terreno} onChange={(v) => cambiarComparable(i, { m2Terreno: v })} placeholder="m² terreno" className={inputChico} />
                      )}
                      {cat === "APARTAMENTO" && (
                        <Num value={c.garajes} onChange={(v) => cambiarComparable(i, { garajes: v })} placeholder="Garajes" step="1" className={inputChico} />
                      )}
                      {k.coneat && (
                        <Num value={c.coneat} onChange={(v) => cambiarComparable(i, { coneat: v })} placeholder="CONEAT" className={inputChico} />
                      )}
                      <Num value={c.precio || undefined} onChange={(v) => cambiarComparable(i, { precio: v ?? 0 })} placeholder="Precio USD" step="1" className={inputChico} />
                      <select
                        value={c.estado}
                        onChange={(e) => cambiarComparable(i, { estado: Number(e.target.value) })}
                        title={k.estado}
                        className={inputChico}
                      >
                        {PUNTAJES.map((o) => (
                          <option key={o.valor} value={o.valor}>
                            Est. {o.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={c.ubicacion}
                        onChange={(e) => cambiarComparable(i, { ubicacion: Number(e.target.value) })}
                        title={k.ubicacion}
                        className={inputChico}
                      >
                        {PUNTAJES.map((o) => (
                          <option key={o.valor} value={o.valor}>
                            Ubic. {o.label.replace("Malo", "Mala").replace("Bueno", "Buena")}
                          </option>
                        ))}
                      </select>
                      {k.esquina && (
                        <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-200">
                          <input type="checkbox" checked={!!c.esquina} onChange={(e) => cambiarComparable(i, { esquina: e.target.checked || undefined })} />
                          Esquina
                        </label>
                      )}
                    </div>

                    {extraDisponible && (
                      <>
                        <button
                          type="button"
                          onClick={() => setMasDatos((m) => ({ ...m, [i]: !m[i] }))}
                          className="mt-2 text-[11px] font-semibold text-orion-navy hover:underline dark:text-orion-gold"
                        >
                          {masDatos[i] ? "− menos datos" : "+ más datos (opcional)"}
                        </button>
                        {masDatos[i] && (
                          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {k.semi && (
                              <Num value={c.m2Semi} onChange={(v) => cambiarComparable(i, { m2Semi: v })} placeholder="m² semicubiertos" className={inputChico} />
                            )}
                            {k.desc && (
                              <Num value={c.m2Desc} onChange={(v) => cambiarComparable(i, { m2Desc: v })} placeholder="m² descubiertos" className={inputChico} />
                            )}
                            {k.garajes && cat !== "APARTAMENTO" && (
                              <Num value={c.garajes} onChange={(v) => cambiarComparable(i, { garajes: v })} placeholder="Garajes" step="1" className={inputChico} />
                            )}
                            {k.piscina && (
                              <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-200">
                                <input type="checkbox" checked={!!c.piscina} onChange={(e) => cambiarComparable(i, { piscina: e.target.checked || undefined })} />
                                Piscina
                              </label>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {calc && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {formatoSuperficie(calc.superficie, unidad)} · base {formatoUsd(calc.base)}/{unidad}
                        {calc.ajustes.map((a) => ` · ${a.nombre} ${a.factor >= 1 ? "+" : ""}${Math.round((a.factor - 1) * 100)}%`).join("")}
                        {" → "}
                        <span className="font-semibold text-orion-navy dark:text-orion-gold">
                          {formatoUsd(calc.ajustado)}/{unidad}
                        </span>
                        {calc.atipico && <span className="ml-1 font-semibold text-red-600">⚠ se aleja del resto</span>}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setComparables((prev) => [...prev, { ...COMPARABLE_VACIO }])}
              className="mt-3 text-sm text-orion-navy hover:underline dark:text-orion-gold"
            >
              + Agregar comparable
            </button>
          </div>

          {/* Valor por renta (opcional) */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <label className="flex items-center gap-2 text-sm font-semibold text-orion-navy dark:text-white">
              <input type="checkbox" checked={usarRenta} onChange={(ev) => setUsarRenta(ev.target.checked)} />
              Está alquilada: calcular también el valor por renta
            </label>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Útil en locales, oficinas y galpones, o cuando no hay comparables: valor = renta neta anual ÷ tasa de
              capitalización. Con renta, la tasación se puede guardar aunque falten comparables.
            </p>
            {usarRenta && (
              <div className="mt-4 flex flex-col gap-4">
                <CamposRenta valor={renta} onChange={setRenta} />
                <label className="flex max-w-xs flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                  Tasa de capitalización (%)
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={tasa ?? ""}
                    onChange={(ev) => setTasa(ev.target.value === "" ? undefined : Number(ev.target.value))}
                    placeholder={`${tasaSugerida(cat)} (sugerida)`}
                    className={input}
                  />
                  <span className="text-[10px] text-gray-400">
                    Referencia: vivienda 4,5–6% · oficina 6–7,5% · local 6,5–8,5% · galpón 7,5–9,5%
                  </span>
                </label>
                {datosRenta && (
                  <p className="rounded-lg bg-orion-gold/10 px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                    Renta neta {formatoUsd(calcularRenta(datosRenta).rentaNeta)}/año ÷ {tasaUsada}% ={" "}
                    <strong>{formatoUsd(valorRenta)}</strong>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 4. Resultado */}
          {resultado && (
            <div className="rounded-xl border border-orion-gold bg-orion-gold/5 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">4. Resultado (vista previa)</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CONFIABILIDAD_LABEL[resultado.confiabilidad].clase}`}>
                  Confiabilidad {CONFIABILIDAD_LABEL[resultado.confiabilidad].texto}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
                <div>
                  <p className="text-xs text-gray-500">Valor probable de cierre</p>
                  <p className="text-xl font-bold text-orion-navy dark:text-orion-gold">{formatoUsd(resultado.valorCierre)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Rango</p>
                  <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    {formatoUsd(resultado.rangoMin)} – {formatoUsd(resultado.rangoMax)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Precio sugerido de publicación</p>
                  <p className="text-base font-semibold text-gray-800 dark:text-gray-100">{formatoUsd(resultado.valorPublicacion)}</p>
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-gray-500">
                {formatoUsd(resultado.promedio)}/{unidad} × {formatoSuperficie(resultado.superficieSujeto, unidad)}
              </p>
              <ul className="mt-3 list-disc pl-5 text-xs text-gray-600 dark:text-gray-300">
                {resultado.motivos.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {final && (final.metodo !== "COMPARABLES" || usarRenta) && (
            <div className="rounded-xl border border-orion-navy/30 bg-orion-navy/5 p-4 text-center dark:border-white/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Valor final · {METODO_LABEL[final.metodo]}</p>
              <p className="text-2xl font-bold text-orion-navy dark:text-orion-gold">{formatoUsd(final.valor)}</p>
              {final.metodo === "CONCILIADO" && resultado && (
                <p className="text-xs text-gray-500">
                  Comparables {formatoUsd(resultado.valorCierre)} · Renta {formatoUsd(valorRenta)}
                </p>
              )}
            </div>
          )}

          {/* Ajuste manual y notas */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="mb-3 text-sm font-semibold text-orion-navy dark:text-white">Ajuste manual y notas</p>
            <input
              name="ajusteManual"
              type="number"
              value={ajusteManual}
              onChange={(e) => setAjusteManual(e.target.value)}
              placeholder="Valor final ajustado (opcional, si querés pisar el estimado)"
              className={`${input} mb-3 w-full`}
            />
            <textarea
              name="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Notas y observaciones (estado general, reformas, orientación, vista…)"
              className={`${input} w-full`}
            />
          </div>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending || faltan > 0}
            className="self-start rounded-lg bg-orion-navy px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending
              ? "Guardando…"
              : faltan > 0
              ? `Necesitás ${faltan} comparable(s) más`
              : e
              ? "Guardar cambios"
              : "Guardar tasación"}
          </button>
        </>
      )}
    </form>
  );
}
