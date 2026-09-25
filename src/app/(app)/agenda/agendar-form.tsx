"use client";

import { useActionState, useEffect, useState } from "react";
import {
  crearVisita,
  crearActividad,
  type VisitaState,
  type ActividadState,
} from "./actions";
import { VisitaFormFields } from "./nueva-visita-form";
import {
  TIPOS_EVENTO,
  TIPO_EVENTO_LABEL,
  TIPO_EVENTO_ICONO,
  TIPO_EVENTO_EJEMPLO,
  TIPO_EVENTO_PUNTO,
  type TipoEvento,
} from "@/lib/calendario";

type Propiedad = { id: string; codigo: string; titulo: string };
type Contacto = { id: string; nombre: string };

const inputClass =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-700 dark:bg-gray-800 dark:text-white";

/**
 * Botón "+ Agendar": primero se elige QUÉ se agenda (visita, reunión,
 * captación, tasación, firma, material gráfico...) y el formulario pide
 * solo lo que corresponde a ese tipo.
 */
export function AgendarForm({
  propiedades,
  contactos,
}: {
  propiedades: Propiedad[];
  contactos: Contacto[];
}) {
  const [abierto, setAbierto] = useState(false);
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

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-orion-navy dark:text-white">
          ¿Qué vas a agendar?
        </h2>
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
            <FormVisita propiedades={propiedades} contactos={contactos} onSuccess={cerrar} />
          ) : (
            <FormActividad
              key={tipo}
              tipo={tipo}
              propiedades={propiedades}
              contactos={contactos}
              onSuccess={cerrar}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FormVisita({
  propiedades,
  contactos,
  onSuccess,
}: {
  propiedades: Propiedad[];
  contactos: Contacto[];
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<VisitaState, FormData>(crearVisita, {});

  if (propiedades.length === 0 || contactos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700">
        Para una visita a propiedad necesitás al menos una propiedad activa y un
        contacto cargados. Si es una visita para captar, elegí{" "}
        <b>Visita de captación</b>.
      </p>
    );
  }

  return (
    <VisitaFormFields
      propiedades={propiedades}
      contactos={contactos}
      formAction={formAction}
      pending={pending}
      error={state?.error}
      okFlag={state?.ok}
      onSuccess={onSuccess}
    />
  );
}

function FormActividad({
  tipo,
  propiedades,
  contactos,
  onSuccess,
}: {
  tipo: Exclude<TipoEvento, "VISITA">;
  propiedades: Propiedad[];
  contactos: Contacto[];
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActividadState, FormData>(
    crearActividad,
    {}
  );

  useEffect(() => {
    if (state?.ok && !pending) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.ok, pending]);

  // Qué campos opcionales tienen sentido para cada tipo.
  const conPropiedad = tipo !== "REUNION_EQUIPO";
  const conContacto = tipo !== "REUNION_EQUIPO" && tipo !== "MATERIAL_GRAFICO";

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="hidden" name="tipo" value={tipo} />

      <div className="sm:col-span-2">
        <h3 className="text-sm font-semibold text-orion-navy dark:text-white">
          {TIPO_EVENTO_ICONO[tipo]} {TIPO_EVENTO_LABEL[tipo]}
        </h3>
      </div>

      <input
        name="titulo"
        required
        placeholder={TIPO_EVENTO_EJEMPLO[tipo]}
        className={`sm:col-span-2 ${inputClass}`}
      />

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
          Fecha y hora
        </label>
        <input name="fecha" type="datetime-local" required className={`w-full ${inputClass}`} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
          Lugar / dirección (opcional)
        </label>
        <input
          name="lugar"
          placeholder={tipo === "REUNION_EQUIPO" ? "Ej: Oficina / Zoom" : "Ej: Santa Rosa, Canelones"}
          className={`w-full ${inputClass}`}
        />
      </div>

      {conPropiedad && (
        <select name="propiedadId" defaultValue="" className={inputClass}>
          <option value="">Propiedad (opcional)…</option>
          {propiedades.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo} — {p.titulo}
            </option>
          ))}
        </select>
      )}

      {conContacto && (
        <select name="contactoId" defaultValue="" className={inputClass}>
          <option value="">Contacto (opcional)…</option>
          {contactos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      )}

      <input
        name="notas"
        placeholder="Notas (opcional)"
        className={`sm:col-span-2 ${inputClass}`}
      />

      {state?.error && (
        <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar en la agenda"}
        </button>
      </div>
    </form>
  );
}
