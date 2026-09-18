"use client";

import { useActionState, useEffect, useState } from "react";
import { crearReservaVenta, type ReservaVentaState } from "./actions";

const initialState: ReservaVentaState = {};

const inputClass =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-700 dark:bg-gray-900 dark:text-white";

export function NuevaReservaVentaForm() {
  const [state, formAction, pending] = useActionState(crearReservaVenta, initialState);
  const [abierto, setAbierto] = useState(false);
  const [precioCierre, setPrecioCierre] = useState("");
  const [porcentaje, setPorcentaje] = useState("3");

  useEffect(() => {
    if (state?.ok && !pending) {
      setAbierto(false);
      const form = document.getElementById("form-nueva-reserva-venta") as HTMLFormElement | null;
      form?.reset();
      setPrecioCierre("");
      setPorcentaje("3");
    }
  }, [state?.ok, pending]);

  const sugerido =
    precioCierre && porcentaje
      ? Math.round((Number(precioCierre) * Number(porcentaje)) / 100)
      : 0;

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light"
      >
        <span className="text-base leading-none">+</span> Nueva reserva de venta
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
        id="form-nueva-reserva-venta"
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
          <h2 className="text-sm font-semibold text-orion-navy dark:text-white">
            Vendedor (propietario)
          </h2>
        </div>
        <input name="vendedorNombre" placeholder="Nombre completo" className={inputClass} />
        <input name="vendedorTelefono" placeholder="Teléfono" className={inputClass} />
        <input
          name="vendedorCedula"
          placeholder="Cédula"
          className={`sm:col-span-2 ${inputClass}`}
        />

        <div className="sm:col-span-2 mt-2">
          <h2 className="text-sm font-semibold text-orion-navy dark:text-white">Comprador</h2>
        </div>
        <input name="compradorNombre" placeholder="Nombre completo" className={inputClass} />
        <input name="compradorTelefono" placeholder="Teléfono" className={inputClass} />
        <input
          name="compradorCedula"
          placeholder="Cédula"
          className={`sm:col-span-2 ${inputClass}`}
        />

        <div className="sm:col-span-2 mt-2">
          <h2 className="text-sm font-semibold text-orion-navy dark:text-white">Operación</h2>
        </div>
        <input
          name="precioCierre"
          type="number"
          min="0"
          placeholder="Precio cierre USD *"
          required
          value={precioCierre}
          onChange={(e) => setPrecioCierre(e.target.value)}
          className={inputClass}
        />
        <input
          name="porcentajePorParte"
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={porcentaje}
          onChange={(e) => setPorcentaje(e.target.value)}
          placeholder="% por parte"
          className={inputClass}
        />
        <input
          name="comisionVendedor"
          type="number"
          min="0"
          placeholder="Com. vendedor (auto, editable)"
          defaultValue={sugerido || undefined}
          key={`cv-${sugerido}`}
          className={inputClass}
        />
        <input
          name="comisionComprador"
          type="number"
          min="0"
          placeholder="Com. comprador (auto, editable)"
          defaultValue={sugerido || undefined}
          key={`cc-${sugerido}`}
          className={inputClass}
        />
        <input
          name="senaUsd"
          type="number"
          min="0"
          placeholder="Seña USD (opcional)"
          className={inputClass}
        />
        <div />

        <label className="text-xs text-gray-500 dark:text-gray-400">
          Fecha reserva
          <input name="fechaReserva" type="date" className={`mt-1 w-full ${inputClass}`} />
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Fecha boleto
          <input name="fechaBoleto" type="date" className={`mt-1 w-full ${inputClass}`} />
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400 sm:col-span-2">
          Fecha escritura
          <input name="fechaEscritura" type="date" className={`mt-1 w-full ${inputClass}`} />
        </label>

        <input
          name="escribanoVendedor"
          placeholder="Escribano vendedor (opcional)"
          className={inputClass}
        />
        <input
          name="escribanoComprador"
          placeholder="Escribano comprador (opcional)"
          className={inputClass}
        />

        <p className="sm:col-span-2 rounded-lg bg-orion-gold/10 px-3 py-2 text-xs text-orion-navy dark:text-orion-gold">
          Cuando la reserva pase a estado <strong>Boleto</strong> o <strong>Escriturada</strong>,
          se calculan y reparten las comisiones automáticamente.
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
