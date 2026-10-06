"use client";

import { useState } from "react";
import type { ResumenEncuestas } from "@/lib/encuestas";

function Fila({ titulo, xs }: { titulo: string; xs: { label: string; cantidad: number }[] }) {
  if (xs.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{titulo}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {xs.map((x) => (
          <span
            key={x.label}
            className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200"
          >
            {x.label} <strong>{x.cantidad}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Resumen de las encuestas de visita de una propiedad (para el dueño). */
export function OpinionVisitas({
  resumen,
  propiedad,
  comentarios,
}: {
  resumen: ResumenEncuestas;
  propiedad: string;
  comentarios: string[];
}) {
  const [copiado, setCopiado] = useState(false);
  const linea = (xs: { label: string; cantidad: number }[]) =>
    xs.map((x) => `${x.label} (${x.cantidad})`).join(", ");

  const texto = [
    `Resumen de visitas de ${propiedad}:`,
    `• ${resumen.respondidas} visitante(s) respondieron la encuesta.`,
    resumen.promedioPropiedad != null ? `• Puntaje promedio de la propiedad: ${resumen.promedioPropiedad}/5` : "",
    resumen.precio.length ? `• Sobre el precio: ${linea(resumen.precio)}` : "",
    resumen.gusto.length ? `• Lo que más gustó: ${linea(resumen.gusto)}` : "",
    resumen.noGusto.length ? `• Lo que no convenció: ${linea(resumen.noGusto)}` : "",
    resumen.interes.length ? `• Intención: ${linea(resumen.interes)}` : "",
  ]
    .filter(Boolean)
    .join("\n");


  return (
    <div>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {resumen.respondidas} encuesta(s) ·{" "}
        {resumen.promedioPropiedad != null && (
          <>
            Propiedad <strong className="text-amber-500">★ {resumen.promedioPropiedad}</strong>
          </>
        )}
        {resumen.promedioAtencion != null && (
          <>
            {" "}
            · Atención <strong className="text-amber-500">★ {resumen.promedioAtencion}</strong>
          </>
        )}
      </p>
      <Fila titulo="Precio" xs={resumen.precio} />
      <Fila titulo="Lo que más gustó" xs={resumen.gusto} />
      <Fila titulo="Lo que no convenció" xs={resumen.noGusto} />
      <Fila titulo="Intención" xs={resumen.interes} />
      {comentarios.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Comentarios</p>
          {comentarios.slice(0, 5).map((c, i) => (
            <p key={i} className="mt-1 text-xs italic text-gray-600 dark:text-gray-300">
              &quot;{c}&quot;
            </p>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() =>
          navigator.clipboard?.writeText(texto).then(() => {
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1500);
          })
        }
        className="mt-3 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-orion-navy hover:border-orion-navy dark:border-gray-600 dark:text-white"
      >
        {copiado ? "✓ Copiado" : "📋 Copiar resumen para el dueño"}
      </button>
    </div>
  );
}
