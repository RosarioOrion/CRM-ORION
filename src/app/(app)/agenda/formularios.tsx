"use client";

import { useActionState, useEffect } from "react";
import {
  crearVisita,
  crearActividad,
  editarVisita,
  editarActividad,
  type VisitaState,
  type ActividadState,
} from "./actions";
import {
  TIPOS_ACTIVIDAD,
  TIPO_EVENTO_LABEL,
  TIPO_EVENTO_ICONO,
  TIPO_EVENTO_EJEMPLO,
  DURACIONES,
  type TipoEvento,
} from "@/lib/calendario";

export type Propiedad = { id: string; codigo: string; titulo: string };
export type Contacto = { id: string; nombre: string };

export const inputClass =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-700 dark:bg-gray-800 dark:text-white";

const labelClass =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400";

function CampoFechaDuracion({
  fecha,
  duracionMin,
}: {
  fecha?: string;
  duracionMin?: number | null;
}) {
  return (
    <>
      <div>
        <label className={labelClass}>Fecha y hora</label>
        <input
          name="fecha"
          type="datetime-local"
          required
          defaultValue={fecha}
          className={`w-full ${inputClass}`}
        />
      </div>
      <div>
        <label className={labelClass}>Duración (opcional)</label>
        <select
          name="duracionMin"
          defaultValue={duracionMin ? String(duracionMin) : ""}
          className={`w-full ${inputClass}`}
        >
          <option value="">Sin indicar</option>
          {DURACIONES.map((d) => (
            <option key={d.valor} value={d.valor}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

function BotonGuardar({ pending, texto }: { pending: boolean; texto: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light disabled:opacity-60"
    >
      {pending ? "Guardando…" : texto}
    </button>
  );
}

function MensajeError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
  );
}

// ---------------------------------------------------------------------------
// Visita a propiedad (propiedad y contacto obligatorios)

export type ValoresVisita = {
  id?: string;
  propiedadId?: string;
  contactoId?: string;
  fecha?: string;
  duracionMin?: number | null;
  notas?: string | null;
};

export function FormVisita({
  propiedades,
  contactos,
  valores = {},
  onSuccess,
}: {
  propiedades: Propiedad[];
  contactos: Contacto[];
  valores?: ValoresVisita;
  onSuccess: () => void;
}) {
  const editando = Boolean(valores.id);
  const [state, formAction, pending] = useActionState<VisitaState, FormData>(
    editando ? editarVisita : crearVisita,
    {}
  );

  useEffect(() => {
    if (state?.ok && !pending) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.ok, pending]);

  if (!editando && (propiedades.length === 0 || contactos.length === 0)) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700">
        Para una visita a propiedad necesitás al menos una propiedad activa y un
        contacto cargados. Si es una visita para captar, elegí{" "}
        <b>Visita de captación</b>.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {editando && <input type="hidden" name="id" value={valores.id} />}

      <select
        name="propiedadId"
        required
        defaultValue={valores.propiedadId ?? ""}
        className={inputClass}
      >
        <option value="" disabled>
          Elegí la propiedad…
        </option>
        {propiedades.map((p) => (
          <option key={p.id} value={p.id}>
            {p.codigo} — {p.titulo}
          </option>
        ))}
      </select>

      <select
        name="contactoId"
        required
        defaultValue={valores.contactoId ?? ""}
        className={inputClass}
      >
        <option value="" disabled>
          Elegí el contacto…
        </option>
        {contactos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>

      <CampoFechaDuracion fecha={valores.fecha} duracionMin={valores.duracionMin} />

      <input
        name="notas"
        placeholder="Notas (opcional)"
        defaultValue={valores.notas ?? ""}
        className={`sm:col-span-2 ${inputClass}`}
      />

      <MensajeError error={state?.error} />

      <div className="sm:col-span-2">
        <BotonGuardar pending={pending} texto={editando ? "Guardar cambios" : "Guardar visita"} />
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Actividad (captación, reunión, reunión de equipo, tasación, firma, ...)

export type ValoresActividad = {
  id?: string;
  tipo: Exclude<TipoEvento, "VISITA">;
  titulo?: string;
  fecha?: string;
  duracionMin?: number | null;
  lugar?: string | null;
  propiedadId?: string | null;
  contactoId?: string | null;
  notas?: string | null;
};

export function FormActividad({
  propiedades,
  contactos,
  valores,
  onSuccess,
}: {
  propiedades: Propiedad[];
  contactos: Contacto[];
  valores: ValoresActividad;
  onSuccess: () => void;
}) {
  const editando = Boolean(valores.id);
  const [state, formAction, pending] = useActionState<ActividadState, FormData>(
    editando ? editarActividad : crearActividad,
    {}
  );

  useEffect(() => {
    if (state?.ok && !pending) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.ok, pending]);

  const tipo = valores.tipo;
  const conPropiedad = tipo !== "REUNION_EQUIPO";
  const conContacto = tipo !== "REUNION_EQUIPO" && tipo !== "MATERIAL_GRAFICO";

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {editando && <input type="hidden" name="id" value={valores.id} />}

      {editando ? (
        <select name="tipo" defaultValue={tipo} className={`sm:col-span-2 ${inputClass}`}>
          {TIPOS_ACTIVIDAD.map((t) => (
            <option key={t} value={t}>
              {TIPO_EVENTO_ICONO[t]} {TIPO_EVENTO_LABEL[t]}
            </option>
          ))}
        </select>
      ) : (
        <>
          <input type="hidden" name="tipo" value={tipo} />
          <div className="sm:col-span-2">
            <h3 className="text-sm font-semibold text-orion-navy dark:text-white">
              {TIPO_EVENTO_ICONO[tipo]} {TIPO_EVENTO_LABEL[tipo]}
            </h3>
          </div>
        </>
      )}

      <input
        name="titulo"
        required
        placeholder={TIPO_EVENTO_EJEMPLO[tipo]}
        defaultValue={valores.titulo ?? ""}
        className={`sm:col-span-2 ${inputClass}`}
      />

      <CampoFechaDuracion fecha={valores.fecha} duracionMin={valores.duracionMin} />

      <div className="sm:col-span-2">
        <label className={labelClass}>Lugar / dirección (opcional)</label>
        <input
          name="lugar"
          defaultValue={valores.lugar ?? ""}
          placeholder={tipo === "REUNION_EQUIPO" ? "Ej: Oficina / Zoom" : "Ej: Santa Rosa, Canelones"}
          className={`w-full ${inputClass}`}
        />
      </div>

      {(conPropiedad || valores.propiedadId) && (
        <select name="propiedadId" defaultValue={valores.propiedadId ?? ""} className={inputClass}>
          <option value="">Propiedad (opcional)…</option>
          {propiedades.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo} — {p.titulo}
            </option>
          ))}
        </select>
      )}

      {(conContacto || valores.contactoId) && (
        <select name="contactoId" defaultValue={valores.contactoId ?? ""} className={inputClass}>
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
        defaultValue={valores.notas ?? ""}
        className={`sm:col-span-2 ${inputClass}`}
      />

      <MensajeError error={state?.error} />

      <div className="sm:col-span-2">
        <BotonGuardar pending={pending} texto={editando ? "Guardar cambios" : "Guardar en la agenda"} />
      </div>
    </form>
  );
}
