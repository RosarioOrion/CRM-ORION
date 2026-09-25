"use client";

import { useState, useTransition } from "react";
import { cambiarPublicadaWeb } from "../actions";

/** Casilla "Mostrar en la web" + link a la ficha pública (solo el agente a cargo). */
export function MostrarEnWeb({
  propiedadId,
  codigo,
  publicada,
  visibleSegunEstado,
}: {
  propiedadId: string;
  codigo: string;
  publicada: boolean;
  /** La web solo muestra Activas y Reservadas. */
  visibleSegunEstado: boolean;
}) {
  const [valor, setValor] = useState(publicada);
  const [pending, startTransition] = useTransition();

  function cambiar(nuevo: boolean) {
    setValor(nuevo);
    startTransition(async () => {
      try {
        await cambiarPublicadaWeb(propiedadId, nuevo);
      } catch {
        setValor(!nuevo);
      }
    });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
      <label className="flex cursor-pointer items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
        <input
          type="checkbox"
          checked={valor}
          disabled={pending}
          onChange={(e) => cambiar(e.target.checked)}
          className="h-4 w-4 accent-[#0f1f45]"
        />
        🌐 Mostrar en la web (Orion Propiedades)
      </label>
      {valor && visibleSegunEstado && (
        <a
          href={`/inmuebles/${codigo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold"
        >
          Ver en la web ↗
        </a>
      )}
      {valor && !visibleSegunEstado && (
        <span className="text-xs text-gray-400">
          (la web solo muestra propiedades Activas o Reservadas)
        </span>
      )}
    </div>
  );
}
