"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { actualizarDatosContacto, type DatosContactoState } from "../actions";

const initialState: DatosContactoState = {};

const campo =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-700 dark:bg-gray-800 dark:text-white";

// Botón "Editar datos" de la ficha: abre un formulario para cambiar nombre,
// teléfono y email. Si el teléfono o el email nuevo ya lo tiene otro
// contacto, avisa antes de guardar.
export function EditarDatosContacto({
  contactoId,
  nombre,
  telefono,
  email,
}: {
  contactoId: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    actualizarDatosContacto.bind(null, contactoId),
    initialState
  );
  const [abierto, setAbierto] = useState(false);
  // Controlados: al enviar, React vacía los campos no controlados, y si
  // aparece el aviso de repetido se perdería lo que se escribió.
  const [valores, setValores] = useState({
    nombre,
    telefono: telefono ?? "",
    email: email ?? "",
  });
  const cambiar = (k: keyof typeof valores) => (e: ChangeEvent<HTMLInputElement>) =>
    setValores((v) => ({ ...v, [k]: e.target.value }));
  // Se cierra solo cuando se guardó (no cuando aparece un aviso o un error).
  const [ultimoOk, setUltimoOk] = useState<number | undefined>(undefined);
  if (state?.ok && state.ok !== ultimoOk) {
    setUltimoOk(state.ok);
    setAbierto(false);
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-orion-navy hover:text-orion-navy dark:border-gray-600 dark:text-gray-300 dark:hover:text-white"
      >
        ✏️ Editar datos
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700 sm:grid-cols-3"
    >
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
          Nombre
        </label>
        <input name="nombre" value={valores.nombre} onChange={cambiar("nombre")} required minLength={2} className={campo} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
          Teléfono
        </label>
        <input name="telefono" type="tel" value={valores.telefono} onChange={cambiar("telefono")} className={campo} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
          Email
        </label>
        <input name="email" type="email" value={valores.email} onChange={cambiar("email")} className={campo} />
      </div>

      {state?.duplicados && state.duplicados.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200 sm:col-span-3">
          <p className="font-semibold">Ya hay otro contacto con ese dato:</p>
          <ul className="mt-1 flex flex-col gap-1">
            {state.duplicados.map((d) => (
              <li key={d.id}>
                {d.propio ? (
                  <Link href={`/contactos/${d.id}`} className="font-semibold underline">
                    {d.nombre}
                  </Link>
                ) : (
                  <span className="font-semibold">{d.nombre}</span>
                )}{" "}
                <span className="text-xs">
                  · mismo {d.motivo}
                  {d.propio ? "" : ` · de ${d.agente}`}
                  {d.archivado ? " · archivado" : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs">
            Si es la misma persona, podés unirlos con “Unir con otra ficha repetida”.
          </p>
          <button
            type="submit"
            name="confirmarDuplicado"
            value="1"
            disabled={pending}
            className="mt-2 rounded bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            Guardar igual
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 sm:col-span-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setValores({ nombre, telefono: telefono ?? "", email: email ?? "" });
            setAbierto(false);
          }}
          className="text-sm text-gray-500 hover:underline dark:text-gray-400"
        >
          Cancelar
        </button>
        {state?.error && (
          <span className="text-xs font-semibold text-red-600 dark:text-red-400">{state.error}</span>
        )}
      </div>
    </form>
  );
}
