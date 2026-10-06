"use client";

import { useState } from "react";
import {
  etiqueta,
  OPCIONES_GUSTO,
  OPCIONES_NO_GUSTO,
  OPCIONES_PRECIO,
  opcionesInteres,
  type RespuestasEncuesta,
} from "@/lib/encuestas";
import { enviarEncuestaPorWhatsApp } from "./enviar-encuesta";

/** Estado de la encuesta de una visita realizada (en el historial de la Agenda). */
export function EncuestaVisita({
  visitaId,
  operacion,
  enviada,
  respuestas,
  propia,
}: {
  visitaId: string;
  operacion: string;
  enviada: boolean;
  respuestas: RespuestasEncuesta | null;
  propia: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (respuestas) {
    const r = respuestas;
    const estrellas = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
    return (
      <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-gray-700 dark:bg-emerald-900/20 dark:text-gray-200">
        <p className="mb-1 font-semibold text-emerald-700 dark:text-emerald-300">📋 Encuesta respondida</p>
        <p>
          Propiedad <span className="text-amber-500">{estrellas(r.propiedad)}</span> · Atención{" "}
          <span className="text-amber-500">{estrellas(r.atencion)}</span>
        </p>
        <p>
          Precio: {etiqueta(OPCIONES_PRECIO, r.precio)} · <strong>{etiqueta(opcionesInteres(operacion), r.interes)}</strong>
        </p>
        {r.gusto.length > 0 && (
          <p>Le gustó: {r.gusto.map((g) => etiqueta(OPCIONES_GUSTO, g)).join(", ")}</p>
        )}
        {r.noGusto.length > 0 && (
          <p>No le convenció: {r.noGusto.map((g) => etiqueta(OPCIONES_NO_GUSTO, g)).join(", ")}</p>
        )}
        {r.comentario && <p className="mt-1 italic">&quot;{r.comentario}&quot;</p>}
      </div>
    );
  }

  if (!propia) return enviada ? <p className="mt-1 text-gray-400">📋 Encuesta enviada, sin responder</p> : null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      {enviada && <span className="text-gray-400">📋 Encuesta enviada, sin responder</span>}
      <button
        type="button"
        disabled={enviando}
        onClick={async () => {
          setError(null);
          setEnviando(true);
          const e = await enviarEncuestaPorWhatsApp(visitaId);
          setEnviando(false);
          if (e) setError(e);
        }}
        className="rounded bg-green-100 px-2 py-0.5 font-semibold text-green-700 hover:bg-green-200 disabled:opacity-60 dark:bg-green-900/40 dark:text-green-300"
      >
        {enviando ? "…" : enviada ? "Reenviar encuesta" : "📋 Enviar encuesta"}
      </button>
      {error && <span className="text-red-600">{error}</span>}
    </div>
  );
}
