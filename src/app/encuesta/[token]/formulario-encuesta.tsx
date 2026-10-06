"use client";

import { useState, useTransition } from "react";
import {
  OPCIONES_GUSTO,
  OPCIONES_NO_GUSTO,
  OPCIONES_PRECIO,
  opcionesInteres,
  textosEncuesta,
} from "@/lib/encuestas";
import { responderEncuesta } from "../actions";

type Opcion = { clave: string; label: string; emoji?: string };

function Pregunta({
  titulo,
  ayuda,
  obligatoria,
  children,
}: {
  titulo: string;
  ayuda?: string;
  obligatoria?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="font-semibold">
        {titulo}
        {obligatoria && <span className="text-orion-gold"> *</span>}
      </p>
      {ayuda && <p className="mb-1 text-xs text-gray-500">{ayuda}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Estrellas({ valor, onChange }: { valor: number; onChange: (n: number) => void }) {
  return (
    <div className="flex justify-between gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
          className={`flex-1 rounded-xl py-2 text-3xl transition ${
            n <= valor ? "bg-amber-50" : "opacity-30 grayscale"
          }`}
        >
          ⭐
        </button>
      ))}
    </div>
  );
}

function Opciones({
  opciones,
  elegidas,
  onToggle,
  columnas,
}: {
  opciones: Opcion[];
  elegidas: string[];
  onToggle: (clave: string) => void;
  columnas?: boolean;
}) {
  return (
    <div className={columnas ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}>
      {opciones.map((o) => {
        const activa = elegidas.includes(o.clave);
        return (
          <button
            key={o.clave}
            type="button"
            onClick={() => onToggle(o.clave)}
            className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm transition ${
              activa
                ? "border-orion-navy bg-orion-navy text-white"
                : "border-gray-200 bg-white text-gray-700 active:bg-gray-50"
            }`}
          >
            {o.emoji && <span>{o.emoji}</span>}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function FormularioEncuesta({
  token,
  operacion,
  agente,
  nombre,
}: {
  token: string;
  operacion: string;
  agente: string;
  nombre: string;
}) {
  const [propiedad, setPropiedad] = useState(0);
  const [precio, setPrecio] = useState("");
  const [gusto, setGusto] = useState<string[]>([]);
  const [noGusto, setNoGusto] = useState<string[]>([]);
  const [interes, setInteres] = useState("");
  const [atencion, setAtencion] = useState(0);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [pending, startTransition] = useTransition();
  const textos = textosEncuesta(operacion);

  const alternar = (lista: string[], set: (l: string[]) => void) => (clave: string) =>
    set(lista.includes(clave) ? lista.filter((c) => c !== clave) : [...lista, clave]);
  const completa = propiedad > 0 && precio && interes && atencion > 0;

  if (listo) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="mb-2 text-4xl">🙌</p>
        <h2 className="mb-1 text-lg font-bold">¡Muchas gracias{nombre ? `, ${nombre}` : ""}!</h2>
        <p className="text-sm text-gray-600">
          Tus respuestas le llegaron a {agente}. Cualquier consulta, escribile por WhatsApp.
        </p>
      </div>
    );
  }

  function enviar() {
    setError(null);
    startTransition(async () => {
      const r = await responderEncuesta(token, {
        propiedad,
        precio,
        gusto,
        noGusto,
        interes,
        atencion,
        comentario,
      });
      if (r.ok) {
        setListo(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else setError(r.error ?? "No se pudo enviar. Probá de nuevo.");
    });
  }

  return (
    <div className="flex flex-col gap-3 pb-10">
      <Pregunta titulo="⭐ ¿Qué te pareció la propiedad?" obligatoria>
        <Estrellas valor={propiedad} onChange={setPropiedad} />
      </Pregunta>

      <Pregunta titulo={textos.precio} obligatoria>
        <Opciones opciones={OPCIONES_PRECIO} elegidas={[precio]} onToggle={setPrecio} columnas />
      </Pregunta>

      <Pregunta titulo="👍 ¿Qué fue lo que más te gustó?" ayuda="Podés marcar varias.">
        <Opciones opciones={OPCIONES_GUSTO} elegidas={gusto} onToggle={alternar(gusto, setGusto)} columnas />
      </Pregunta>

      <Pregunta titulo="👎 ¿Qué no te convenció?" ayuda="Podés marcar varias.">
        <Opciones
          opciones={OPCIONES_NO_GUSTO}
          elegidas={noGusto}
          onToggle={alternar(noGusto, setNoGusto)}
          columnas
        />
      </Pregunta>

      <Pregunta titulo={textos.interes} obligatoria>
        <Opciones opciones={opcionesInteres(operacion)} elegidas={[interes]} onToggle={setInteres} />
      </Pregunta>

      <Pregunta titulo={`⭐ ¿Cómo calificarías la atención de ${agente}?`} obligatoria>
        <Estrellas valor={atencion} onChange={setAtencion} />
      </Pregunta>

      <Pregunta titulo="💬 ¿Algo más que quieras contarnos?" ayuda="Opcional.">
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={3}
          maxLength={1000}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orion-navy"
        />
      </Pregunta>

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={enviar}
        disabled={!completa || pending}
        className="rounded-2xl bg-orion-navy py-4 text-base font-bold text-white shadow transition disabled:opacity-40"
      >
        {pending ? "Enviando…" : "Enviar respuestas"}
      </button>
      {!completa && (
        <p className="text-center text-xs text-gray-500">Completá las preguntas con * para enviar.</p>
      )}
    </div>
  );
}
