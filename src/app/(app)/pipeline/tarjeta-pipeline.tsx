"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  registrarAccionPipeline,
  registrarAjustePrecio,
  corregirFechaInicioPipeline,
  elegirFrecuenciaSeguimiento,
  registrarSeguimientoPipeline,
  registrarRepublicacion,
  type SeguimientoPipelineState,
} from "./actions";
import {
  CATEGORIAS_PIPELINE,
  CATEGORIA_PIPELINE_LABEL,
  CATEGORIA_PIPELINE_ICONO,
  type CategoriaPipeline,
  type AccionesSemana,
  type EstadoRecurrente,
  FRECUENCIA_LABEL,
} from "@/lib/pipeline";

export type EstadoTareaRecurrente = {
  estado: EstadoRecurrente;
  /** Lunes en que toca (texto corto, ej. "lun 06/10"). */
  toca: string;
  diasAtraso: number;
};

export type ItemHistorialPipeline = {
  id: string;
  fecha: string;
  canal: string;
  respondio: boolean;
  nota: string | null;
  ajustePlanteado: boolean | null;
  ajusteAceptado: boolean | null;
  ajustePrecio: number | null;
  ajusteMoneda: string | null;
};

export type TarjetaPipelineProps = {
  propiedadId: string;
  codigo: string;
  titulo: string;
  operacion: "VENTA" | "ALQUILER";
  precio: number | null;
  moneda: string;
  dias: number;
  semana: number;
  totalSemanas: number;
  esFinal: boolean;
  vencido: boolean;
  revisarPrecio: boolean;
  estancada: boolean;
  acciones: AccionesSemana;
  hechasEstaSemana: CategoriaPipeline[];
  diasSinContacto: number | null;
  ultimoAjustePrecio: { fecha: string; precioAnterior: number | null } | null;
  fechaInicioPipeline: string;
  soloLectura?: boolean;
  /** 7 = todos los lunes, 14 = cada 15 días, null = sin elegir todavía. */
  frecuencia: 7 | 14 | null;
  seguimiento: (EstadoTareaRecurrente & { proximaISO: string }) | null;
  republicar: (EstadoTareaRecurrente & { ultima: string | null }) | null;
  /** En esta semana del plan corresponde plantear ajuste de precio. */
  pideAjuste: boolean;
  dueno: { nombre: string; telefono: string | null; whatsapp: string | null } | null;
  visitasProximas: string[];
  visitasDesdeUltimoSeg: number;
  historial: ItemHistorialPipeline[];
};

export function TarjetaPipeline(p: TarjetaPipelineProps) {
  const [pending, startTransition] = useTransition();
  const [hechas, setHechas] = useState<CategoriaPipeline[]>(p.hechasEstaSemana);
  const [mostrarPrecio, setMostrarPrecio] = useState(false);
  const [mostrarFecha, setMostrarFecha] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urgente = p.diasSinContacto === null ? true : p.diasSinContacto >= 7;

  function marcarHecha(categoria: CategoriaPipeline) {
    setError(null);
    setHechas((h) => [...h, categoria]);
    startTransition(() => {
      registrarAccionPipeline(
        p.propiedadId,
        categoria,
        p.semana,
        p.acciones[categoria]
      ).catch((e) => {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
        setHechas((h) => h.filter((c) => c !== categoria));
      });
    });
  }

  async function handleAjustePrecio(formData: FormData) {
    setError(null);
    const r = await registrarAjustePrecio(p.propiedadId, formData);
    if (r.error) setError(r.error);
    else setMostrarPrecio(false);
  }

  async function handleFecha(formData: FormData) {
    setError(null);
    const fecha = formData.get("fecha") as string;
    try {
      await corregirFechaInicioPipeline(p.propiedadId, fecha);
      setMostrarFecha(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-gray-800 dark:border-gray-700">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-orion-navy px-1.5 py-0.5 text-[10px] font-bold text-white">
              {p.codigo}
            </span>
            {p.esFinal && (
              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                🎯 Entrevista crítica
              </span>
            )}
            {p.vencido && (
              <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                ⚠️ VENCIDO
              </span>
            )}
            {p.revisarPrecio && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                ⚠️ Revisar precio
              </span>
            )}
            {urgente && !p.esFinal && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                {p.diasSinContacto === null
                  ? "⚠️ Sin seguimiento registrado todavía"
                  : `⚠️ Sin contacto hace ${p.diasSinContacto} día(s)`}
              </span>
            )}
          </div>
          <Link
            href={`/propiedades/${p.propiedadId}`}
            className="mt-1 block text-sm font-semibold text-gray-800 hover:underline dark:text-gray-100"
          >
            {p.titulo}
          </Link>
        </div>

        <div className="text-right text-xs text-gray-500 dark:text-gray-400">
          <p className="font-semibold text-orion-navy dark:text-orion-gold">
            Semana {p.semana} de {p.totalSemanas}
          </p>
          <p>{p.dias} día(s) en mercado</p>
        </div>
      </div>

      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          className="h-full bg-orion-gold"
          style={{ width: `${Math.min(100, (p.semana / p.totalSemanas) * 100)}%` }}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        {p.precio != null && (
          <span>
            {p.moneda} {p.precio.toLocaleString("es-UY")}
          </span>
        )}
        {p.ultimoAjustePrecio && (
          <span className="text-amber-600 dark:text-amber-400">
            📉 último ajuste {new Date(p.ultimoAjustePrecio.fecha).toLocaleDateString("es-UY")}
          </span>
        )}
        {!p.soloLectura && (
          <>
            <button
              type="button"
              onClick={() => setMostrarPrecio((v) => !v)}
              className="text-orion-navy hover:underline dark:text-orion-gold"
            >
              Ajustar precio
            </button>
            <button
              type="button"
              onClick={() => setMostrarFecha((v) => !v)}
              className="text-orion-navy hover:underline dark:text-orion-gold"
            >
              Corregir inicio
            </button>
          </>
        )}
      </div>

      {!p.soloLectura && mostrarPrecio && (
        <form
          action={handleAjustePrecio}
          className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-orion-bg p-2 dark:bg-gray-900"
        >
          <input
            name="precio"
            type="number"
            placeholder="Nuevo precio"
            required
            className="w-32 rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
          />
          <select
            name="moneda"
            defaultValue={p.moneda}
            className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="USD">USD</option>
            <option value="UYU">UYU</option>
          </select>
          <button
            type="submit"
            className="rounded bg-orion-navy px-2 py-1 text-xs font-semibold text-white"
          >
            Guardar
          </button>
        </form>
      )}

      {!p.soloLectura && mostrarFecha && (
        <form
          action={handleFecha}
          className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-orion-bg p-2 dark:bg-gray-900"
        >
          <input
            name="fecha"
            type="date"
            required
            defaultValue={p.fechaInicioPipeline.slice(0, 10)}
            className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
          />
          <button
            type="submit"
            className="rounded bg-orion-navy px-2 py-1 text-xs font-semibold text-white"
          >
            Guardar
          </button>
        </form>
      )}

      <BloqueRecurrentes p={p} />

      <p className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        Plan de la semana {p.semana}
      </p>
      <div className="space-y-1.5">
        {CATEGORIAS_PIPELINE.map((cat) => {
          const hecha = hechas.includes(cat);
          return (
            <div
              key={cat}
              className={`flex items-start gap-2 rounded-lg border p-2 text-xs ${
                hecha
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-900/20"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <span>{CATEGORIA_PIPELINE_ICONO[cat]}</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-600 dark:text-gray-300">
                  {CATEGORIA_PIPELINE_LABEL[cat]}
                </p>
                <p className="text-gray-500 dark:text-gray-400">{p.acciones[cat]}</p>
              </div>
              {!p.soloLectura && !p.esFinal && p.acciones[cat] !== "—" && (
                <button
                  type="button"
                  disabled={hecha || pending}
                  onClick={() => marcarHecha(cat)}
                  className="shrink-0 rounded border border-orion-navy/30 px-1.5 py-0.5 text-[10px] font-semibold text-orion-navy transition hover:bg-orion-navy/10 disabled:opacity-50 dark:border-orion-gold/30 dark:text-orion-gold"
                >
                  {hecha ? "✓ Hecho" : "Marcar"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// --- Seguimiento de los lunes, republicar y visitas -----------------------

function ChipEstado({ e, hechoTexto }: { e: EstadoTareaRecurrente; hechoTexto: string }) {
  const base = "rounded px-1.5 py-0.5 text-[10px] font-semibold";
  if (e.estado === "HECHO")
    return (
      <span className={`${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`}>
        ✓ {hechoTexto} · próximo {e.toca}
      </span>
    );
  if (e.estado === "PROXIMO")
    return (
      <span className={`${base} bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300`}>
        Primero: {e.toca}
      </span>
    );
  if (e.estado === "HOY")
    return (
      <span className={`${base} bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300`}>
        📌 Toca hoy
      </span>
    );
  return (
    <span className={`${base} bg-red-600 text-white`}>
      ⚠️ Atrasado desde {e.toca} ({e.diasAtraso} día{e.diasAtraso === 1 ? "" : "s"})
    </span>
  );
}

function BloqueRecurrentes({ p }: { p: TarjetaPipelineProps }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [abrirForm, setAbrirForm] = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);
  const [cambiarFrecuencia, setCambiarFrecuencia] = useState(false);

  function elegir(f: 7 | 14) {
    setError(null);
    startTransition(async () => {
      try {
        await elegirFrecuenciaSeguimiento(p.propiedadId, f);
        setCambiarFrecuencia(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  }

  function republicado() {
    setError(null);
    startTransition(async () => {
      try {
        await registrarRepublicacion(p.propiedadId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  }

  const botonChico =
    "rounded border border-orion-navy/30 px-2 py-0.5 text-[11px] font-semibold text-orion-navy transition hover:bg-orion-navy/10 disabled:opacity-50 dark:border-orion-gold/30 dark:text-orion-gold";

  // Primera vez: elegir cada cuánto se hace el seguimiento.
  if (!p.frecuencia || cambiarFrecuencia) {
    if (p.soloLectura) return null;
    return (
      <div className="rounded-lg border border-orion-gold/50 bg-amber-50/60 p-3 text-xs dark:bg-amber-900/10">
        <p className="mb-2 font-semibold text-orion-navy dark:text-orion-gold">
          📞 ¿Cada cuánto hacés el seguimiento al dueño{p.dueno ? ` (${p.dueno.nombre})` : ""}?
        </p>
        <p className="mb-2 text-gray-500 dark:text-gray-400">
          Republicar va a seguir la misma frecuencia.
        </p>
        <div className="flex flex-wrap gap-2">
          {([7, 14] as const).map((f) => (
            <button
              key={f}
              type="button"
              disabled={pending}
              onClick={() => elegir(f)}
              className={`rounded-lg px-3 py-1.5 font-semibold ${
                p.frecuencia === f
                  ? "bg-orion-navy text-white"
                  : "border border-orion-navy/30 text-orion-navy dark:text-orion-gold"
              }`}
            >
              {FRECUENCIA_LABEL[f]}
            </button>
          ))}
          {cambiarFrecuencia && (
            <button type="button" onClick={() => setCambiarFrecuencia(false)} className="text-gray-400 underline">
              Cancelar
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-red-600">{error}</p>}
      </div>
    );
  }

  const seg = p.seguimiento!;
  const rep = p.republicar!;
  const tocaSeg = seg.estado === "HOY" || seg.estado === "ATRASADO";
  const tocaRep = rep.estado === "HOY" || rep.estado === "ATRASADO";

  return (
    <div className="space-y-2">
      {/* Seguimiento al dueño */}
      <div
        className={`rounded-lg border p-2.5 text-xs ${
          seg.estado === "ATRASADO"
            ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-900/20"
            : seg.estado === "HOY"
              ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20"
              : "border-gray-200 dark:border-gray-700"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-gray-700 dark:text-gray-200">
            📞 Seguimiento al dueño
            <span className="ml-1 font-normal text-gray-400">
              · {FRECUENCIA_LABEL[p.frecuencia]}
              {!p.soloLectura && (
                <button
                  type="button"
                  onClick={() => setCambiarFrecuencia(true)}
                  className="ml-1 text-orion-navy underline dark:text-orion-gold"
                >
                  cambiar
                </button>
              )}
            </span>
          </p>
          <ChipEstado e={seg} hechoTexto="Hecho" />
        </div>
        {p.dueno && (
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {p.dueno.nombre}
            {p.dueno.telefono ? ` · ${p.dueno.telefono}` : ""}
            {p.dueno.whatsapp && !p.soloLectura && (
              <a
                href={`https://wa.me/${p.dueno.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="ml-2 font-semibold text-emerald-600 hover:underline"
              >
                WhatsApp
              </a>
            )}
          </p>
        )}
        {p.pideAjuste && tocaSeg && (
          <p className="mt-1 font-semibold text-amber-700 dark:text-amber-300">
            💲 Esta semana el plan pide plantear ajuste de precio.
          </p>
        )}
        {!p.soloLectura && !abrirForm && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAbrirForm(true)}
              className={
                tocaSeg
                  ? "rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-orion-navy-light"
                  : botonChico
              }
            >
              {tocaSeg ? "Registrar seguimiento" : "Registrar un seguimiento extra"}
            </button>
            {p.historial.length > 0 && (
              <button
                type="button"
                onClick={() => setVerHistorial((v) => !v)}
                className="text-gray-500 underline"
              >
                {verHistorial ? "Ocultar historial" : `Historial (${p.historial.length})`}
              </button>
            )}
          </div>
        )}
        {p.soloLectura && p.historial.length > 0 && (
          <button
            type="button"
            onClick={() => setVerHistorial((v) => !v)}
            className="mt-2 text-gray-500 underline"
          >
            {verHistorial ? "Ocultar historial" : `Historial (${p.historial.length})`}
          </button>
        )}
        {abrirForm && <FormSeguimiento p={p} onCerrar={() => setAbrirForm(false)} />}
        {verHistorial && <HistorialSeguimientos items={p.historial} />}
      </div>

      {/* Republicar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 text-xs ${
          rep.estado === "ATRASADO"
            ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-900/20"
            : rep.estado === "HOY"
              ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20"
              : "border-gray-200 dark:border-gray-700"
        }`}
      >
        <p className="font-semibold text-gray-700 dark:text-gray-200">
          📣 Republicar
          {rep.ultima && <span className="ml-1 font-normal text-gray-400">· última {rep.ultima}</span>}
        </p>
        <div className="flex items-center gap-2">
          <ChipEstado e={rep} hechoTexto="Republicada" />
          {!p.soloLectura && (tocaRep || rep.estado === "PROXIMO") && (
            <button type="button" disabled={pending} onClick={republicado} className={botonChico}>
              Republicada ✓
            </button>
          )}
        </div>
      </div>

      {/* Visitas (salen solas de la Agenda) */}
      <div className="rounded-lg border border-gray-200 p-2.5 text-xs dark:border-gray-700">
        <p className="font-semibold text-gray-700 dark:text-gray-200">
          🗓️ Visitas
          <span className="ml-1 font-normal text-gray-400">
            · {p.visitasDesdeUltimoSeg} desde el último seguimiento
          </span>
        </p>
        {p.visitasProximas.length > 0 ? (
          <ul className="mt-1 space-y-0.5 text-gray-600 dark:text-gray-300">
            {p.visitasProximas.slice(0, 4).map((v, i) => (
              <li key={i}>• {v}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-gray-400">
            No hay visitas agendadas.{" "}
            {!p.soloLectura && (
              <Link href="/agenda" className="text-orion-navy underline dark:text-orion-gold">
                Agendar
              </Link>
            )}
          </p>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

const estadoInicial: SeguimientoPipelineState = {};

function Opciones({
  name,
  valor,
  onCambio,
  opciones,
}: {
  name: string;
  valor: string;
  onCambio: (v: string) => void;
  opciones: { v: string; t: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opciones.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onCambio(o.v)}
          className={`rounded-lg px-3 py-1 text-xs font-semibold ${
            valor === o.v
              ? "bg-orion-navy text-white"
              : "border border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300"
          }`}
        >
          {o.t}
        </button>
      ))}
      <input type="hidden" name={name} value={valor} />
    </div>
  );
}

const SI_NO = [
  { v: "si", t: "Sí" },
  { v: "no", t: "No" },
];

function FormSeguimiento({ p, onCerrar }: { p: TarjetaPipelineProps; onCerrar: () => void }) {
  const [estado, accion, enviando] = useActionState(registrarSeguimientoPipeline, estadoInicial);
  const [canal, setCanal] = useState("WHATSAPP");
  const [enviado, setEnviado] = useState("");
  const [respondio, setRespondio] = useState("");
  const [ajuste, setAjuste] = useState(p.pideAjuste ? "" : "no");
  const [mostrarAjuste, setMostrarAjuste] = useState(p.pideAjuste);
  const [acepto, setAcepto] = useState("");

  useEffect(() => {
    if (estado.ok) onCerrar();
  }, [estado.ok, onCerrar]);

  const label = "mb-1 mt-2.5 block text-[11px] font-semibold text-gray-600 dark:text-gray-300";

  return (
    <form action={accion} className="mt-2 rounded-lg bg-white p-3 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
      <input type="hidden" name="propiedadId" value={p.propiedadId} />
      <input type="hidden" name="canal" value={canal} />

      <span className={label}>¿Cómo fue?</span>
      <Opciones
        name="_canal"
        valor={canal}
        onCambio={setCanal}
        opciones={[
          { v: "WHATSAPP", t: "💬 Mensaje" },
          { v: "LLAMADA", t: "📞 Llamada" },
          { v: "VISITA", t: "🤝 En persona" },
        ]}
      />

      <span className={label}>{canal === "LLAMADA" ? "¿Hiciste la llamada?" : "¿Mensaje enviado?"}</span>
      <Opciones name="_enviado" valor={enviado} onCambio={setEnviado} opciones={SI_NO} />

      {enviado === "no" && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
          Queda pendiente. Registralo cuando lo hagas.
        </p>
      )}

      {enviado === "si" && (
        <>
          <span className={label}>¿Respondió?</span>
          <Opciones name="respondio" valor={respondio} onCambio={setRespondio} opciones={SI_NO} />

          {respondio !== "" && (
            <>
              <span className={label}>
                {respondio === "si" ? "¿Qué respondió?" : "Nota (opcional)"}
              </span>
              <textarea
                name="nota"
                rows={2}
                required={respondio === "si"}
                placeholder={respondio === "si" ? "Ej: sigue firme con el precio, pide más visitas…" : ""}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
              />
            </>
          )}

          {respondio === "si" &&
            (mostrarAjuste ? (
              <>
                <span className={label}>
                  {p.pideAjuste ? "💲 Esta semana toca: ¿planteaste ajuste de precio?" : "¿Planteaste ajuste de precio?"}
                </span>
                <Opciones name="ajustePlanteado" valor={ajuste} onCambio={setAjuste} opciones={SI_NO} />
                {ajuste === "si" && (
                  <>
                    <span className={label}>¿Aceptó?</span>
                    <Opciones name="ajusteAceptado" valor={acepto} onCambio={setAcepto} opciones={SI_NO} />
                    {acepto === "si" && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input
                          name="ajustePrecio"
                          type="number"
                          required
                          placeholder="Nuevo precio"
                          className="w-32 rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                        />
                        <select
                          name="ajusteMoneda"
                          defaultValue={p.moneda}
                          className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                        >
                          <option value="USD">USD</option>
                          <option value="UYU">UYU</option>
                        </select>
                        <span className="text-[11px] text-gray-400">Se actualiza el precio de la propiedad.</span>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMostrarAjuste(true);
                  setAjuste("");
                }}
                className="mt-2 block text-[11px] text-orion-navy underline dark:text-orion-gold"
              >
                + Planteé un ajuste de precio
              </button>
            ))}
        </>
      )}

      {estado.error && <p className="mt-2 text-xs text-red-600">{estado.error}</p>}

      <div className="mt-3 flex gap-2">
        {enviado === "si" && respondio !== "" && (
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {enviando ? "Guardando…" : "Guardar seguimiento"}
          </button>
        )}
        <button type="button" onClick={onCerrar} className="text-xs text-gray-500 underline">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function HistorialSeguimientos({ items }: { items: ItemHistorialPipeline[] }) {
  return (
    <ul className="mt-2 space-y-1.5 border-t border-gray-200 pt-2 dark:border-gray-700">
      {items.map((h) => (
        <li key={h.id} className="text-gray-600 dark:text-gray-300">
          <span className="font-semibold">{h.fecha}</span> · {h.canal} ·{" "}
          {h.respondio ? (
            <span className="text-emerald-600">respondió</span>
          ) : (
            <span className="text-red-600">sin respuesta</span>
          )}
          {h.ajustePlanteado && (
            <span className="ml-1">
              · ajuste de precio{" "}
              {h.ajusteAceptado ? (
                <span className="text-emerald-600">
                  aceptado{h.ajustePrecio ? ` (${h.ajusteMoneda} ${h.ajustePrecio.toLocaleString("es-UY")})` : ""}
                </span>
              ) : (
                <span className="text-red-600">no aceptado</span>
              )}
            </span>
          )}
          {h.nota && <p className="text-gray-500 dark:text-gray-400">“{h.nota}”</p>}
        </li>
      ))}
    </ul>
  );
}
