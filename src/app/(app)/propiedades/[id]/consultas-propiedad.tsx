"use client";

import { useState, useTransition } from "react";
import { CANALES_CONSULTA, CANAL_CONSULTA_LABEL, type CanalConsulta } from "@/lib/consultas";
import { agregarConsulta, eliminarConsulta } from "./consultas-actions";

export type ConsultaVista = {
  id: string;
  canal: string;
  nombre: string | null;
  telefono: string | null;
  nota: string | null;
  fecha: string;
  agente: string;
  puedeBorrar: boolean;
};

const campo =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-900 dark:text-white";

/**
 * Consultas que llegaron por la propiedad (WhatsApp, portales, llamadas…).
 * Cuentan para las etapas del panel "Mis propiedades" del Inicio.
 */
export function ConsultasPropiedad({
  propiedadId,
  consultas,
  diasDesdeUltima,
}: {
  propiedadId: string;
  consultas: ConsultaVista[];
  diasDesdeUltima: number | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const [canal, setCanal] = useState<CanalConsulta>("WHATSAPP");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verTodas, setVerTodas] = useState(false);
  const [pending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    startTransition(async () => {
      const r = await agregarConsulta(propiedadId, { canal, nombre, telefono, nota });
      if (r.error) return setError(r.error);
      setNombre("");
      setTelefono("");
      setNota("");
      setAbierto(false);
    });
  }

  function borrar(id: string) {
    if (!window.confirm("¿Borrar esta consulta?")) return;
    startTransition(async () => {
      const r = await eliminarConsulta(id);
      if (r.error) setError(r.error);
    });
  }

  const lista = verTodas ? consultas : consultas.slice(0, 5);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">💬 Consultas · {consultas.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {diasDesdeUltima === null
              ? "Todavía no se anotó ninguna."
              : diasDesdeUltima === 0
              ? "La última, hoy."
              : `La última, hace ${diasDesdeUltima} día(s).`}
          </p>
        </div>
        {!abierto && (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-orion-navy-light"
          >
            + Consulta
          </button>
        )}
      </div>

      {abierto && (
        <div className="mb-3 grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700 sm:grid-cols-3">
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value as CanalConsulta)}
            className={campo}
            aria-label="Por dónde llegó"
          >
            {CANALES_CONSULTA.map((c) => (
              <option key={c} value={c}>
                {CANAL_CONSULTA_LABEL[c]}
              </option>
            ))}
          </select>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre (opcional)" className={campo} />
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Teléfono (opcional)"
            type="tel"
            className={campo}
          />
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="¿Qué preguntó? (opcional)"
            className={`${campo} sm:col-span-3`}
          />
          <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
            <button
              type="button"
              onClick={guardar}
              disabled={pending}
              className="rounded-lg bg-orion-navy px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" onClick={() => setAbierto(false)} className="text-sm text-gray-500 hover:underline">
              Cancelar
            </button>
          </div>
        </div>
      )}
      {error && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {consultas.length > 0 && (
        <ul className="divide-y divide-gray-100 text-sm dark:divide-gray-700">
          {lista.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-gray-800 dark:text-gray-100">
                  <span className="font-semibold">{CANAL_CONSULTA_LABEL[c.canal as CanalConsulta] ?? c.canal}</span>
                  {c.nombre && ` · ${c.nombre}`}
                  {c.telefono && <span className="text-gray-500"> · {c.telefono}</span>}
                </p>
                {c.nota && <p className="text-xs text-gray-600 dark:text-gray-300">{c.nota}</p>}
                <p className="text-[11px] text-gray-400">
                  {c.fecha} · {c.agente}
                </p>
              </div>
              {c.puedeBorrar && (
                <button
                  type="button"
                  onClick={() => borrar(c.id)}
                  className="shrink-0 text-xs text-gray-400 hover:text-red-500"
                  aria-label="Borrar consulta"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {consultas.length > 5 && !verTodas && (
        <button
          type="button"
          onClick={() => setVerTodas(true)}
          className="mt-1 text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold"
        >
          Ver las {consultas.length}
        </button>
      )}
    </div>
  );
}
