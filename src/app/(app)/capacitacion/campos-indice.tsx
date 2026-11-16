"use client";

import { useEffect, useState } from "react";
import {
  areasIniciales,
  BLOQUES,
  bloqueDe,
  leerNumero,
  LETRAS_ANEXO,
  type Clase,
} from "@/lib/manual-indice";

// Número de capítulo o letra de anexo, bloque y áreas de un material.
// Mientras no se toquen a mano, se sugieren solos a partir del título.

export type AreaOpcion = { clave: string; nombre: string; icono: string };
export type IndiceInicial = { clase: Clase; numero: string | null; bloque: string | null; areas: string[] };

const input =
  "rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";

export function CamposIndice({
  areas,
  titulo,
  inicial,
}: {
  areas: AreaOpcion[];
  /** Título que se está escribiendo (para sugerir). */
  titulo: string;
  inicial?: IndiceInicial;
}) {
  const [tocado, setTocado] = useState(!!inicial);
  const [clase, setClase] = useState<Clase>(inicial?.clase ?? "OTRO");
  const [numero, setNumero] = useState<string>(inicial?.numero ?? "");
  const [bloque, setBloque] = useState<string>(inicial?.bloque ?? "");
  const [elegidas, setElegidas] = useState<string[]>(inicial?.areas ?? []);

  // Sugerencia desde el título (solo si todavía no se cambió nada a mano).
  useEffect(() => {
    if (tocado) return;
    const s = leerNumero(titulo);
    /* eslint-disable react-hooks/set-state-in-effect -- sugerencia derivada del título */
    setClase(s.clase);
    setNumero(s.numero ?? "");
    setBloque(bloqueDe(s.clase, s.numero) ?? "");
    setElegidas(areasIniciales(s.clase, s.numero).filter((a) => areas.some((x) => x.clave === a)));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [titulo, tocado, areas]);

  function cambiarNumero(c: Clase, n: string) {
    setTocado(true);
    setClase(c);
    setNumero(n);
    const b = bloqueDe(c, n === "" ? null : n);
    if (b) setBloque(b);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Índice del manual {!tocado && titulo && <span className="normal-case text-orion-gold">· sugerido por el título</span>}
      </p>
      <input type="hidden" name="clase" value={clase} />
      <input type="hidden" name="numero" value={clase === "OTRO" ? "" : numero} />
      <input type="hidden" name="bloque" value={bloque} />
      {elegidas.map((a) => (
        <input key={a} type="hidden" name="areas" value={a} />
      ))}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
          Es un…
          <select value={clase} onChange={(e) => cambiarNumero(e.target.value as Clase, "")} className={input}>
            <option value="CAPITULO">Capítulo</option>
            <option value="ANEXO">Anexo</option>
            <option value="OTRO">Otro material</option>
          </select>
        </label>
        {clase === "CAPITULO" && (
          <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            Número de capítulo
            <input
              type="number"
              min="0"
              max="99"
              value={numero}
              onChange={(e) => cambiarNumero("CAPITULO", e.target.value)}
              className={input}
            />
          </label>
        )}
        {clase === "ANEXO" && (
          <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            Letra del anexo
            <select value={numero} onChange={(e) => cambiarNumero("ANEXO", e.target.value)} className={input}>
              <option value="">Elegí…</option>
              {LETRAS_ANEXO.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
          Bloque del manual
          <select
            value={bloque}
            onChange={(e) => {
              setTocado(true);
              setBloque(e.target.value);
            }}
            className={input}
          >
            <option value="">Sin bloque</option>
            {BLOQUES.map((b) => (
              <option key={b.clave} value={b.clave}>
                {b.numero ? `Bloque ${b.numero} · ` : ""}
                {b.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Áreas (puede estar en varias)</p>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {areas.map((a) => (
            <label key={a.clave} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={elegidas.includes(a.clave)}
                onChange={(e) => {
                  setTocado(true);
                  setElegidas((v) => (e.target.checked ? [...v, a.clave] : v.filter((x) => x !== a.clave)));
                }}
              />
              {a.icono} {a.nombre}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
