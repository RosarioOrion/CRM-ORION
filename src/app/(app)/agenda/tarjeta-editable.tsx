"use client";

import { useState } from "react";
import {
  FormVisita,
  FormActividad,
  type Propiedad,
  type Contacto,
  type ValoresVisita,
  type ValoresActividad,
} from "./formularios";

/**
 * Tarjeta de la Agenda con botón "Editar": al tocarlo, el contenido se
 * reemplaza por el formulario con los datos cargados, para reprogramar o
 * corregir sin tener que borrar y volver a cargar.
 */
export function TarjetaEditable({
  contenido,
  acciones,
  clase,
  valoresVisita,
  valoresActividad,
  propiedades,
  contactos,
  resaltada,
  editable = true,
}: {
  contenido: React.ReactNode;
  acciones: React.ReactNode;
  clase: "visita" | "actividad";
  valoresVisita?: ValoresVisita;
  valoresActividad?: ValoresActividad;
  propiedades: Propiedad[];
  contactos: Contacto[];
  resaltada?: boolean;
  /** false = de otro agente (vista del equipo / reunión de equipo ajena): solo lectura. */
  editable?: boolean;
}) {
  const [editando, setEditando] = useState(false);

  const marco = resaltada
    ? "border-red-300 dark:border-red-800"
    : "border-gray-200 dark:border-gray-700";

  if (editando) {
    return (
      <div className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-800 ${marco}`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-orion-navy dark:text-white">✏️ Editar</h3>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="text-xs font-semibold text-gray-500 hover:text-orion-navy dark:text-gray-400 dark:hover:text-white"
          >
            Cancelar ✕
          </button>
        </div>
        {clase === "visita" && valoresVisita ? (
          <FormVisita
            propiedades={propiedades}
            contactos={contactos}
            valores={valoresVisita}
            onSuccess={() => setEditando(false)}
          />
        ) : valoresActividad ? (
          <FormActividad
            propiedades={propiedades}
            contactos={contactos}
            valores={valoresActividad}
            onSuccess={() => setEditando(false)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-800 ${marco}`}
    >
      <div className="min-w-0">{contenido}</div>
      <div className="flex flex-col items-end gap-1.5">
        {acciones}
        {editable && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold"
          >
            ✏️ Editar
          </button>
        )}
      </div>
    </div>
  );
}
