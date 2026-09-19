"use client";

import { useActionState, useState, useTransition } from "react";
import {
  crearNivelComision,
  actualizarNivelComision,
  eliminarNivelComision,
  type NivelState,
} from "./actions";

type Nivel = {
  id: string;
  clave: string;
  nombre: string;
  facturacionMinima: number;
  porcentaje: number;
};

const initialState: NivelState = {};

function FilaNivel({ nivel }: { nivel: Nivel }) {
  const [nombre, setNombre] = useState(nivel.nombre);
  const [facturacionMinima, setFacturacionMinima] = useState(String(nivel.facturacionMinima));
  const [porcentaje, setPorcentaje] = useState(String(nivel.porcentaje));
  const [pending, startTransition] = useTransition();
  const [guardado, setGuardado] = useState(false);

  function guardar() {
    startTransition(async () => {
      await actualizarNivelComision(nivel.id, {
        nombre,
        facturacionMinima: Number(facturacionMinima) || 0,
        porcentaje: Number(porcentaje) || 0,
      });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 1500);
    });
  }

  function borrar() {
    if (!confirm(`¿Borrar el escalón "${nivel.nombre}"?`)) return;
    startTransition(() => {
      eliminarNivelComision(nivel.id);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 p-2 dark:border-gray-700">
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="w-32 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
      />
      <span className="text-xs text-gray-400">desde USD</span>
      <input
        type="number"
        value={facturacionMinima}
        onChange={(e) => setFacturacionMinima(e.target.value)}
        className="w-24 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
      />
      <span className="text-xs text-gray-400">facturados →</span>
      <input
        type="number"
        value={porcentaje}
        onChange={(e) => setPorcentaje(e.target.value)}
        className="w-16 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
      />
      <span className="text-xs text-gray-400">%</span>
      <button
        type="button"
        onClick={guardar}
        disabled={pending}
        className="rounded bg-orion-navy px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        {guardado ? "✓ Guardado" : "Guardar"}
      </button>
      <button
        type="button"
        onClick={borrar}
        disabled={pending}
        className="ml-auto text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
      >
        Borrar
      </button>
    </div>
  );
}

export function NivelesComision({ niveles }: { niveles: Nivel[] }) {
  const [state, formAction, pending] = useActionState(crearNivelComision, initialState);
  const ordenados = [...niveles].sort((a, b) => a.facturacionMinima - b.facturacionMinima);

  return (
    <div>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        Escalones de comisión: a partir de cuánta facturación acumulada (suma
        histórica de comisiones cobradas) le corresponde cada % a un agente.
        Podés agregar, editar o borrar escalones libremente — el nivel de cada
        agente se sigue asignando a mano desde Usuarios, esto solo define las
        reglas y te avisa ahí cuando a alguien ya le tocaría subir.
      </p>

      <div className="flex flex-col gap-2">
        {ordenados.map((n) => (
          <FilaNivel key={n.id} nivel={n} />
        ))}
      </div>

      <form action={formAction} className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
        <input
          name="nombre"
          placeholder="Nombre del nuevo escalón"
          required
          className="w-40 rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900"
        />
        <span className="text-xs text-gray-400">desde USD</span>
        <input
          name="facturacionMinima"
          type="number"
          placeholder="0"
          className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900"
        />
        <span className="text-xs text-gray-400">facturados →</span>
        <input
          name="porcentaje"
          type="number"
          placeholder="%"
          required
          className="w-16 rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900"
        />
        <span className="text-xs text-gray-400">%</span>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Agregando…" : "+ Agregar escalón"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
    </div>
  );
}
