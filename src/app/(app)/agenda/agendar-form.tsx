"use client";

import { useState } from "react";
import {
  TIPOS_EVENTO,
  TIPO_EVENTO_LABEL,
  TIPO_EVENTO_ICONO,
  TIPO_EVENTO_PUNTO,
  type TipoEvento,
} from "@/lib/calendario";
import { FormVisita, FormActividad, type Propiedad, type Contacto } from "./formularios";

/**
 * Botón "+ Agendar": primero se elige QUÉ se agenda (visita, reunión,
 * captación, tasación, firma, material gráfico...) y el formulario pide
 * solo lo que corresponde a ese tipo.
 *
 * `fechaInicial` ("YYYY-MM-DDTHH:MM") llega cuando se viene desde el
 * calendario de Inicio con "+ Agendar este día": el formulario se abre solo
 * y con esa fecha ya cargada.
 */
export function AgendarForm({
  propiedades,
  contactos,
  fechaInicial,
}: {
  propiedades: Propiedad[];
  contactos: Contacto[];
  fechaInicial?: string;
}) {
  const [abierto, setAbierto] = useState(Boolean(fechaInicial));
  const [tipo, setTipo] = useState<TipoEvento | null>(null);

  function cerrar() {
    setAbierto(false);
    setTipo(null);
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light"
      >
        <span className="text-base leading-none">+</span> Agendar
      </button>
    );
  }

  const diaTexto = fechaInicial
    ? new Date(fechaInicial).toLocaleDateString("es-UY", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-orion-navy dark:text-white">
            ¿Qué vas a agendar?
          </h2>
          {diaTexto && (
            <p className="text-xs text-gray-500 first-letter:uppercase dark:text-gray-400">
              Para el {diaTexto}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={cerrar}
          className="text-xs font-semibold text-gray-500 hover:text-orion-navy dark:text-gray-400 dark:hover:text-white"
        >
          Cancelar ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TIPOS_EVENTO.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={[
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition",
              tipo === t
                ? "border-orion-navy bg-orion-navy text-white dark:border-orion-gold dark:bg-orion-gold dark:text-orion-navy"
                : "border-gray-200 text-gray-700 hover:border-orion-gold hover:bg-orion-gold/5 dark:border-gray-700 dark:text-gray-200",
            ].join(" ")}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${TIPO_EVENTO_PUNTO[t]}`} />
            <span>
              {TIPO_EVENTO_ICONO[t]} {TIPO_EVENTO_LABEL[t]}
            </span>
          </button>
        ))}
      </div>

      {tipo && (
        <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
          {tipo === "VISITA" ? (
            <FormVisita
              propiedades={propiedades}
              contactos={contactos}
              valores={{ fecha: fechaInicial }}
              onSuccess={cerrar}
            />
          ) : (
            <FormActividad
              key={tipo}
              propiedades={propiedades}
              contactos={contactos}
              valores={{ tipo, fecha: fechaInicial }}
              onSuccess={cerrar}
            />
          )}
        </div>
      )}
    </div>
  );
}
