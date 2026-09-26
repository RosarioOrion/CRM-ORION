"use client";

import { useState, useTransition } from "react";
import { candidatosParaUnir, unirContactos } from "../actions";

type Candidato = { id: string; nombre: string; telefono: string | null };

/** "Unir con otra ficha": para cuando la misma persona quedó cargada dos veces. */
export function UnirContacto({ contactoId, nombre }: { contactoId: string; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState<{ repetidos: string[]; todos: Candidato[] } | null>(null);
  const [elegido, setElegido] = useState("");
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function abrir() {
    setAbierto(true);
    start(async () => {
      const r = await candidatosParaUnir(contactoId);
      setLista(r);
      if (r.repetidos[0]) setElegido(r.repetidos[0]);
    });
  }

  function unir() {
    const otro = lista?.todos.find((c) => c.id === elegido);
    if (!otro) return;
    if (
      !window.confirm(
        `¿Unir "${otro.nombre}" dentro de "${nombre}"?\n\nSus propiedades, visitas, búsquedas, captaciones y actividades pasan a esta ficha y se suman sus roles. La ficha de "${otro.nombre}" va a la Papelera.`
      )
    )
      return;
    setError(null);
    start(async () => {
      const r = await unirContactos(contactoId, elegido);
      if (!r.ok) setError(r.error ?? "No se pudo unir.");
      else {
        setAbierto(false);
        setElegido("");
        setLista(null);
      }
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={abrir}
        className="text-xs font-semibold text-gray-500 hover:text-orion-navy hover:underline dark:text-gray-400 dark:hover:text-white"
      >
        🔗 Unir con otra ficha repetida
      </button>
    );
  }

  const repetidos = new Set(lista?.repetidos ?? []);
  const q = filtro.trim().toLowerCase();
  const visibles = (lista?.todos ?? [])
    .filter((c) => !q || c.nombre.toLowerCase().includes(q) || (c.telefono ?? "").includes(q))
    .sort((a, b) => Number(repetidos.has(b.id)) - Number(repetidos.has(a.id)));

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900/40">
      <p className="mb-2 text-xs text-gray-600 dark:text-gray-300">
        Elegí la otra ficha de esta misma persona. Todo lo suyo pasa a esta.
      </p>
      {!lista ? (
        <p className="text-xs text-gray-400">Cargando…</p>
      ) : (
        <>
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por nombre o teléfono"
            className="mb-2 w-full rounded-lg border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
          />
          <select
            value={elegido}
            onChange={(e) => setElegido(e.target.value)}
            size={Math.min(6, Math.max(2, visibles.length))}
            className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
          >
            {visibles.map((c) => (
              <option key={c.id} value={c.id}>
                {repetidos.has(c.id) ? "⚠️ " : ""}
                {c.nombre}
                {c.telefono ? ` · ${c.telefono}` : ""}
              </option>
            ))}
          </select>
        </>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={!elegido || pending}
          onClick={unir}
          className="rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? "…" : "Unir fichas"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-xs font-semibold text-gray-500 hover:underline"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
