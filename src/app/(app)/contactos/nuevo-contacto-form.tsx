"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { crearContacto, revisarDuplicados, type ContactoState } from "./actions";
import type { Duplicado } from "@/lib/duplicados";
import {
  CATEGORIAS_CONTACTO,
  CATEGORIA_LABEL,
  ORIGENES_CONTACTO,
  ORIGEN_LABEL,
  ORIGEN_DETALLE_PLACEHOLDER,
  type OrigenContacto,
} from "@/lib/contactos";

const initialState: ContactoState = {};

export function NuevoContactoForm() {
  const [state, formAction, pending] = useActionState(
    crearContacto,
    initialState
  );
  const [abierto, setAbierto] = useState(false);
  // Se cierra solo cuando el contacto se guardó (no cuando aparece el aviso
  // de repetido o un error).
  const router = useRouter();
  const [ultimoOk, setUltimoOk] = useState<number | undefined>(undefined);
  if (state?.ok && state.ok !== ultimoOk) {
    setUltimoOk(state.ok);
    setAbierto(false);
  }
  // Se le agregó el rol a una ficha existente: abrirla.
  const irA = state?.irA;
  useEffect(() => {
    if (irA) router.push(irA);
  }, [irA, router]);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light"
      >
        <span className="text-base leading-none">+</span> Contacto nuevo
      </button>
    );
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-xs font-semibold text-gray-500 hover:text-orion-navy dark:text-gray-400 dark:hover:text-white"
        >
          Cancelar ✕
        </button>
      </div>
      <ContactoFormFields
        key={state?.intento ?? 0}
        formAction={formAction}
        pending={pending}
        error={state?.error}
        duplicados={state?.duplicados}
        valores={state?.valores}
      />
    </div>
  );
}

function ListaDuplicados({ lista }: { lista: Duplicado[] }) {
  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {lista.map((d) => (
        <li key={d.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{d.nombre}</span>
          <span className="text-xs text-amber-700 dark:text-amber-300">
            mismo {d.motivo}
            {d.archivado ? " · archivado" : ""}
          </span>
          {d.propio ? (
            <>
              <button
                type="submit"
                name="agregarRolA"
                value={d.id}
                className="rounded bg-amber-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                Es la misma persona: agregarle este rol
              </button>
              <Link
                href={`/contactos/${d.id}`}
                className="rounded border border-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
              >
                Abrir su ficha →
              </Link>
            </>
          ) : (
            <span className="text-xs text-amber-700 dark:text-amber-300">
              lo tiene cargado {d.agente}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function ContactoFormFields({
  formAction,
  pending,
  error,
  duplicados,
  valores,
}: {
  formAction: (formData: FormData) => void;
  pending: boolean;
  error?: string;
  duplicados?: Duplicado[];
  valores?: Record<string, string>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [origen, setOrigen] = useState<OrigenContacto>(
    (valores?.origen as OrigenContacto) || "OTRO"
  );
  // Aviso temprano: al salir del campo teléfono o email.
  const [aviso, setAviso] = useState<Duplicado[]>([]);
  async function revisar() {
    const f = formRef.current;
    if (!f) return;
    const tel = (f.elements.namedItem("telefono") as HTMLInputElement).value;
    const mail = (f.elements.namedItem("email") as HTMLInputElement).value;
    try {
      setAviso(await revisarDuplicados(tel, mail));
    } catch {
      // si falla, igual se revisa al guardar
    }
  }
  const hayDuplicados = !!duplicados?.length;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <h2 className="text-sm font-semibold text-orion-navy">
          Nuevo contacto
        </h2>
      </div>
      <input
        name="nombre"
        defaultValue={valores?.nombre}
        placeholder="Nombre completo"
        required
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      />
      <input
        name="telefono"
        defaultValue={valores?.telefono}
        onBlur={revisar}
        placeholder="Teléfono / WhatsApp"
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      />
      <input
        name="email"
        type="email"
        defaultValue={valores?.email}
        onBlur={revisar}
        placeholder="Email (opcional)"
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      />
      <select
        name="categoria"
        defaultValue={valores?.categoria || "OTRO"}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      >
        {CATEGORIAS_CONTACTO.map((cat) => (
          <option key={cat} value={cat}>
            {CATEGORIA_LABEL[cat]}
          </option>
        ))}
      </select>
      <select
        name="origen"
        value={origen}
        onChange={(e) => setOrigen(e.target.value as OrigenContacto)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      >
        {ORIGENES_CONTACTO.map((o) => (
          <option key={o} value={o}>
            {ORIGEN_LABEL[o]}
          </option>
        ))}
      </select>
      <input
        name="origenDetalle"
        defaultValue={valores?.origenDetalle}
        placeholder={ORIGEN_DETALLE_PLACEHOLDER[origen]}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      />
      <input
        name="notas"
        defaultValue={valores?.notas}
        placeholder="Notas"
        className="sm:col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      />
      {!hayDuplicados && aviso.length > 0 && (
        <div className="sm:col-span-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
          <p className="text-sm font-semibold">⚠️ Ojo: esta persona puede estar ya cargada</p>
          <ListaDuplicados lista={aviso} />
        </div>
      )}
      {hayDuplicados && (
        <div className="sm:col-span-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100">
          <p className="text-sm font-semibold">⚠️ Ya existe un contacto con estos datos</p>
          <p className="text-xs">
            Si es la misma persona, agregale el rol elegido a su ficha (se completan los datos que falten). Si es otra persona, guardalo igual.
          </p>
          <ListaDuplicados lista={duplicados!} />
        </div>
      )}
      {error && (
        <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="sm:col-span-2 flex flex-wrap gap-2">
        {hayDuplicados ? (
          <button
            type="submit"
            name="confirmarDuplicado"
            value="1"
            disabled={pending}
            className="rounded-lg border border-orion-navy px-4 py-2 text-sm font-semibold text-orion-navy transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-500 dark:text-gray-100"
          >
            {pending ? "Guardando…" : "Es otra persona: guardar igual"}
          </button>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Guardar contacto"}
          </button>
        )}
      </div>
    </form>
  );
}
