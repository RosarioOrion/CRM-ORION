"use client";

import { useActionState, useEffect, useState } from "react";
import { crearReservaAlquiler, type ReservaAlquilerState } from "./actions";

const initialState: ReservaAlquilerState = {};

const inputClass =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-700 dark:bg-gray-900 dark:text-white";

export function NuevaReservaAlquilerForm() {
  const [state, formAction, pending] = useActionState(crearReservaAlquiler, initialState);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (state?.ok && !pending) {
      setAbierto(false);
      const form = document.getElementById(
        "form-nueva-reserva-alquiler"
      ) as HTMLFormElement | null;
      form?.reset();
    }
  }, [state?.ok, pending]);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light"
      >
        <span className="text-base leading-none">+</span> Nueva reserva de alquiler
      </button>
    );
  }

  return (
    <div className="mb-6">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-xs font-semibold text-gray-500 hover:text-orion-navy dark:text-gray-400 dark:hover:text-white"
        >
          Cancelar ✕
        </button>
      </div>
      <form
        id="form-nueva-reserva-alquiler"
        action={formAction}
        className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 dark:bg-gray-800 dark:border-gray-700"
      >
        <div className="sm:col-span-2">
          <h2 className="text-sm font-semibold text-orion-navy dark:text-white">
            Datos de la propiedad
          </h2>
        </div>
        <input
          name="nombrePropiedad"
          placeholder="Nombre / dirección de la propiedad *"
          required
          className={`sm:col-span-2 ${inputClass}`}
        />
        <input name="codigoExterno" placeholder="Código (opcional)" className={inputClass} />
        <input
          name="linkPublicacion"
          placeholder="Link de la publicación (opcional)"
          className={inputClass}
        />

        <div className="sm:col-span-2 mt-2">
          <h2 className="text-sm font-semibold text-orion-navy dark:text-white">Propietario</h2>
        </div>
        <input name="propietarioNombre" placeholder="Nombre completo" className={inputClass} />
        <input name="propietarioTelefono" placeholder="Teléfono" className={inputClass} />
        <input
          name="propietarioCedula"
          placeholder="Cédula"
          className={`sm:col-span-2 ${inputClass}`}
        />

        <div className="sm:col-span-2 mt-2">
          <h2 className="text-sm font-semibold text-orion-navy dark:text-white">
            Cliente / Inquilino
          </h2>
        </div>
        <input name="inquilinoNombre" placeholder="Nombre completo" className={inputClass} />
        <input name="inquilinoTelefono" placeholder="Teléfono" className={inputClass} />
        <input
          name="inquilinoCedula"
          placeholder="Cédula"
          className={`sm:col-span-2 ${inputClass}`}
        />

        <div className="sm:col-span-2 mt-2">
          <h2 className="text-sm font-semibold text-orion-navy dark:text-white">Contrato</h2>
        </div>
        <input
          name="precioMensual"
          type="number"
          min="0"
          placeholder="Precio mensual"
          className={inputClass}
        />
        <select name="moneda" defaultValue="UYU" className={inputClass}>
          <option value="UYU">UYU</option>
          <option value="USD">USD</option>
        </select>
        <input
          name="duracionMeses"
          type="number"
          min="0"
          placeholder="Duración (meses)"
          className={inputClass}
        />
        <input
          name="comisionTotalUsd"
          type="number"
          min="0"
          placeholder="Monto comisión total USD"
          className={inputClass}
        />

        <label className="text-xs text-gray-500 dark:text-gray-400">
          Fecha reserva
          <input name="fechaReserva" type="date" className={`mt-1 w-full ${inputClass}`} />
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Fecha firma
          <input name="fechaFirma" type="date" className={`mt-1 w-full ${inputClass}`} />
        </label>

        <input name="garantia" placeholder="Garantía (opcional)" className={inputClass} />
        <input name="escribano" placeholder="Escribano (opcional)" className={inputClass} />

        <p className="sm:col-span-2 rounded-lg bg-orion-gold/10 px-3 py-2 text-xs text-orion-navy dark:text-orion-gold">
          La firma la marca un team leader o administrador. Cuando la reserva pase a{" "}
          <strong>Firmada</strong>, se reparte la comisión automáticamente.
        </p>

        <textarea
          name="notas"
          placeholder="Notas (opcional)"
          rows={2}
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
            {pending ? "Guardando…" : "Guardar reserva"}
          </button>
        </div>
      </form>
    </div>
  );
}
