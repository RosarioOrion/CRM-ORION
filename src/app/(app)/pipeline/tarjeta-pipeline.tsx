"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  registrarAccionPipeline,
  registrarAjustePrecio,
  corregirFechaInicioPipeline,
} from "./actions";
import {
  CATEGORIAS_PIPELINE,
  CATEGORIA_PIPELINE_LABEL,
  CATEGORIA_PIPELINE_ICONO,
  type CategoriaPipeline,
  type AccionesSemana,
} from "@/lib/pipeline";

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
  acciones: AccionesSemana;
  hechasEstaSemana: CategoriaPipeline[];
  diasSinContacto: number | null;
  ultimoAjustePrecio: { fecha: string; precioAnterior: number | null } | null;
  fechaInicioPipeline: string;
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
            {urgente && !p.esFinal && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                ⚠️ Sin contacto hace {p.diasSinContacto ?? "?"}+ días
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
      </div>

      {mostrarPrecio && (
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

      {mostrarFecha && (
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
              {!p.esFinal && p.acciones[cat] !== "—" && (
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
