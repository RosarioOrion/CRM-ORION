"use client";

import { useActionState, useState, useTransition } from "react";
import { completarMensaje, type Plantilla } from "@/lib/plantillas-whatsapp";
import {
  eliminarPlantilla,
  guardarPlantilla,
  moverPlantilla,
  type PlantillaState,
} from "./actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-900 dark:text-white";

// Ejemplo para la vista previa.
const EJEMPLO = {
  nombre: "María",
  agente: "Rosario Pereira",
  inmobiliaria: "Lumen",
  propiedad: "Apartamento 2 dormitorios en Pocitos",
  link: "https://…/inmuebles/O0012",
};

export function ListaMensajes({ plantillas, admin }: { plantillas: Plantilla[]; admin: boolean }) {
  const [editando, setEditando] = useState<string | null>(null); // id, "nuevo" o null
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      {admin && editando !== "nuevo" && (
        <button
          type="button"
          onClick={() => setEditando("nuevo")}
          className="self-start rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light"
        >
          + Nuevo mensaje
        </button>
      )}
      {editando === "nuevo" && <FormularioMensaje onListo={() => setEditando(null)} />}

      {plantillas.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-400 dark:border-gray-600 dark:bg-gray-800">
          Todavía no hay mensajes.
        </p>
      )}

      {plantillas.map((p, i) =>
        editando === p.id ? (
          <FormularioMensaje key={p.id} plantilla={p} onListo={() => setEditando(null)} />
        ) : (
          <div
            key={p.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="font-semibold text-orion-navy dark:text-white">
                {p.emoji || "💬"} {p.titulo}
              </p>
              <div className="flex shrink-0 items-center gap-1 text-xs">
                <BotonCopiar texto={completarMensaje(p.texto, EJEMPLO)} />
                {admin && (
                  <>
                    <button
                      type="button"
                      disabled={pending || i === 0}
                      onClick={() => startTransition(() => moverPlantilla(p.id, -1))}
                      className="rounded px-1.5 py-0.5 text-gray-400 hover:text-orion-navy disabled:opacity-30"
                      aria-label="Subir"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={pending || i === plantillas.length - 1}
                      onClick={() => startTransition(() => moverPlantilla(p.id, 1))}
                      className="rounded px-1.5 py-0.5 text-gray-400 hover:text-orion-navy disabled:opacity-30"
                      aria-label="Bajar"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditando(p.id)}
                      className="rounded px-2 py-0.5 font-semibold text-orion-navy hover:bg-gray-100 dark:text-orion-gold dark:hover:bg-gray-700"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (confirm(`¿Borrar el mensaje "${p.titulo}"?`)) {
                          startTransition(() => eliminarPlantilla(p.id));
                        }
                      }}
                      className="rounded px-1.5 py-0.5 text-gray-400 hover:text-red-500"
                      aria-label="Borrar"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{p.texto}</p>
          </div>
        )
      )}
    </div>
  );
}

function BotonCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(texto).then(() => {
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1500);
        });
      }}
      className="rounded px-2 py-0.5 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
    >
      {copiado ? "✓ Copiado" : "Copiar"}
    </button>
  );
}

function FormularioMensaje({ plantilla, onListo }: { plantilla?: Plantilla; onListo: () => void }) {
  const [texto, setTexto] = useState(plantilla?.texto ?? "Hola {nombre}, ¿cómo estás? ");
  const [state, formAction, pending] = useActionState(
    async (prev: PlantillaState, fd: FormData) => {
      const r = await guardarPlantilla(plantilla?.id ?? null, prev, fd);
      if (r.ok) onListo();
      return r;
    },
    {}
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border-2 border-orion-navy/30 bg-white p-4 dark:border-gray-600 dark:bg-gray-800"
    >
      <div className="flex gap-2">
        <input
          name="emoji"
          defaultValue={plantilla?.emoji ?? "💬"}
          className={`w-16 text-center ${inputClass}`}
          aria-label="Emoji"
        />
        <input
          name="titulo"
          defaultValue={plantilla?.titulo}
          placeholder="Nombre del mensaje (ej. Captación)"
          required
          className={inputClass}
        />
      </div>
      <textarea
        name="texto"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={6}
        required
        className={inputClass}
      />
      <div className="rounded-lg bg-green-50 p-3 text-sm text-gray-700 dark:bg-green-900/20 dark:text-gray-200">
        <p className="mb-1 text-xs font-semibold text-green-700 dark:text-green-300">
          Así le llega (ejemplo):
        </p>
        <p className="whitespace-pre-wrap">{completarMensaje(texto, EJEMPLO)}</p>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar mensaje"}
        </button>
        <button
          type="button"
          onClick={onListo}
          className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:text-orion-navy dark:text-gray-400"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
