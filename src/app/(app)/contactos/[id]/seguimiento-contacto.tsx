"use client";

import { useActionState, useState, useTransition } from "react";
import { registrarSeguimiento, marcarFrio, borrarSeguimiento, type SeguimientoState } from "./seguimiento-actions";
import {
  CANALES,
  CANAL_LABEL,
  CANAL_ICONO,
  SIN_RESPUESTA_TOPE,
  type Canal,
  type EstadoSeguimiento,
} from "@/lib/seguimientos";

export type ItemHistorial = {
  id: string;
  fecha: Date;
  canal: string;
  respondio: boolean;
  avisoFinal: boolean;
  nota: string | null;
  proximaFecha: Date | null;
  propiedad: string | null;
};

type Opcion = { id: string; texto: string };

const fechaCorta = (d: Date) =>
  d.toLocaleDateString("es-UY", { weekday: "short", day: "2-digit", month: "2-digit" });

const aInputFecha = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const inicial: SeguimientoState = {};

export function SeguimientoContacto({
  contactoId,
  estado,
  historial,
  propiedades,
  busquedas,
  whatsappAviso,
  proximaSugerida,
}: {
  contactoId: string;
  estado: EstadoSeguimiento;
  historial: ItemHistorial[];
  /** Propiedades activas de este contacto (como dueño). */
  propiedades: Opcion[];
  /** Búsquedas activas de este contacto. */
  busquedas: Opcion[];
  /** Link de WhatsApp con el mensaje del aviso final ya escrito. */
  whatsappAviso: string | null;
  /** Fecha sugerida para el próximo seguimiento (hoy + 7 días). */
  proximaSugerida: Date;
}) {
  const [state, formAction, pending] = useActionState(registrarSeguimiento, inicial);
  const [respondio, setRespondio] = useState<"si" | "no" | "">("");
  const [sinProximo, setSinProximo] = useState(false);
  const [selProps, setSelProps] = useState<string[]>(propiedades.map((p) => p.id));
  const [selBusq, setSelBusq] = useState<string[]>(busquedas.map((b) => b.id));
  const [errorFrio, setErrorFrio] = useState<string | null>(null);
  const [ocupado, start] = useTransition();

  const siguienteEsAviso = estado.tipo === "SIN_RESPUESTA" && estado.siguienteEsAviso;

  function toggle(lista: string[], set: (v: string[]) => void, id: string) {
    set(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);
  }

  function confirmarFrio() {
    const partes = [
      selProps.length && `suspender ${selProps.length} propiedad(es)`,
      selBusq.length && `pausar ${selBusq.length} búsqueda(s)`,
    ].filter(Boolean);
    if (
      !window.confirm(
        `¿Marcar este contacto como frío${partes.length ? ` y ${partes.join(" y ")}` : ""}?`
      )
    )
      return;
    setErrorFrio(null);
    start(async () => {
      const r = await marcarFrio(contactoId, selProps, selBusq);
      if (!r.ok) setErrorFrio(r.error ?? "No se pudo.");
    });
  }

  // --- Estado -------------------------------------------------------------
  let banner: React.ReactNode = null;
  const caja = "mb-4 rounded-lg px-3 py-2 text-sm";
  switch (estado.tipo) {
    case "SIN_SEGUIMIENTOS":
      banner = (
        <p className={`${caja} bg-gray-50 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300`}>
          Todavía no registraste seguimientos con este contacto.
        </p>
      );
      break;
    case "AL_DIA":
      banner = (
        <p
          className={`${caja} ${
            estado.vencido
              ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
              : "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
          }`}
        >
          {estado.vencido ? "⏰ Seguimiento vencido" : "✅ Al día"}
          {estado.proxima && ` · Próximo seguimiento: ${fechaCorta(estado.proxima)}`}
        </p>
      );
      break;
    case "SIN_RESPUESTA":
      banner = (
        <div
          className={`${caja} ${
            estado.vencido
              ? "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200"
              : "bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100"
          }`}
        >
          <p className="font-semibold">
            {estado.vencido ? "⏰ " : "⚠️ "}
            {estado.sinRespuesta} de {SIN_RESPUESTA_TOPE} seguimientos sin respuesta
            {estado.proxima && ` · Próximo: ${fechaCorta(estado.proxima)}`}
          </p>
          {estado.siguienteEsAviso && (
            <>
              <p className="mt-1 text-xs">
                El próximo seguimiento es el <b>aviso final</b>: si no responde en 7 días, queda frío
                {propiedades.length ? " y se propone dar de baja la publicación" : ""}
                {!propiedades.length && busquedas.length ? " y se propone pausar su búsqueda" : ""}.
              </p>
              {whatsappAviso && (
                <a
                  href={whatsappAviso}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                >
                  💬 Enviar aviso final por WhatsApp
                </a>
              )}
            </>
          )}
        </div>
      );
      break;
    case "AVISO_ENVIADO":
      banner = (
        <p className={`${caja} bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100`}>
          ⚠️ <b>Aviso final enviado</b> el {fechaCorta(estado.avisoEl)}. Si no responde antes del{" "}
          {fechaCorta(estado.proxima)}, queda frío.
        </p>
      );
      break;
    case "NO_RESPONDIO_AVISO":
      banner = (
        <div className={`${caja} border border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-900/30 dark:text-red-100`}>
          <p className="font-semibold">⛔ No respondió al aviso final ({fechaCorta(estado.avisoEl)})</p>
          <p className="mt-1 text-xs">
            Según la regla, queda frío. Elegí qué suspender (podés destildar lo que no corresponda):
          </p>
          {propiedades.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold">Propiedades a suspender (pasan a Pausada):</p>
              {propiedades.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={selProps.includes(p.id)}
                    onChange={() => toggle(selProps, setSelProps, p.id)}
                  />
                  {p.texto}
                </label>
              ))}
            </div>
          )}
          {busquedas.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold">Búsquedas a pausar:</p>
              {busquedas.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={selBusq.includes(b.id)}
                    onChange={() => toggle(selBusq, setSelBusq, b.id)}
                  />
                  {b.texto}
                </label>
              ))}
            </div>
          )}
          <button
            type="button"
            disabled={ocupado}
            onClick={confirmarFrio}
            className="mt-3 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60"
          >
            {ocupado ? "…" : "❄️ Marcar frío y suspender lo elegido"}
          </button>
          <p className="mt-1 text-xs opacity-80">Si respondió por otro lado, registralo abajo como “Respondió”.</p>
          {errorFrio && <p className="mt-1 text-xs text-red-700">{errorFrio}</p>}
        </div>
      );
      break;
    case "FRIO":
      banner = (
        <p className={`${caja} bg-sky-50 text-sky-900 dark:bg-sky-900/30 dark:text-sky-100`}>
          ❄️ <b>Frío</b> desde el {fechaCorta(estado.desde)}. Si vuelve a responder, registralo como
          “Respondió” y deja de estar frío (las propiedades suspendidas se reactivan desde su ficha).
        </p>
      );
      break;
  }

  // --- Formulario -----------------------------------------------------------
  const campo =
    "rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-800";

  return (
    <div>
      {banner}

      <form
        key={state?.ok ?? 0}
        action={formAction}
        className="mb-4 grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-2 dark:border-gray-700"
      >
        <input type="hidden" name="contactoId" value={contactoId} />
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 sm:col-span-2">
          Registrar seguimiento
        </p>
        <select name="canal" defaultValue="WHATSAPP" className={campo}>
          {CANALES.map((c) => (
            <option key={c} value={c}>
              {CANAL_ICONO[c]} {CANAL_LABEL[c]}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1">
            <input type="radio" name="respondio" value="si" onChange={() => setRespondio("si")} /> Respondió
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name="respondio" value="no" onChange={() => setRespondio("no")} /> Sin respuesta
          </label>
        </div>
        {propiedades.length > 0 && (
          <select name="propiedadId" defaultValue="" className={`${campo} sm:col-span-2`}>
            <option value="">Propiedad (opcional)</option>
            {propiedades.map((p) => (
              <option key={p.id} value={p.id}>
                {p.texto}
              </option>
            ))}
          </select>
        )}
        <input name="nota" placeholder="¿Qué pasó? (opcional)" className={`${campo} sm:col-span-2`} />
        {siguienteEsAviso && respondio === "no" && (
          <label className="flex items-center gap-2 rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900 sm:col-span-2 dark:bg-amber-900/30 dark:text-amber-100">
            <input type="checkbox" name="esAviso" value="1" defaultChecked /> Este fue el aviso final
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Próximo seguimiento
          <input
            type="date"
            name="proximaFecha"
            defaultValue={aInputFecha(proximaSugerida)}
            disabled={sinProximo}
            className={campo}
          />
        </label>
        <label className="flex items-end gap-2 pb-2 text-xs text-gray-500">
          <input
            type="checkbox"
            name="sinProximo"
            value="1"
            checked={sinProximo}
            onChange={(e) => setSinProximo(e.target.checked)}
          />
          Sin próximo seguimiento (cerrado)
        </label>
        {state?.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Guardar seguimiento"}
          </button>
        </div>
      </form>

      {historial.length > 0 && (
        <ul className="flex flex-col gap-2">
          {historial.map((h) => {
            const canal = (CANALES as readonly string[]).includes(h.canal) ? (h.canal as Canal) : "OTRO";
            return (
              <li
                key={h.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-xs dark:border-gray-700"
              >
                <div>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">
                    {fechaCorta(h.fecha)} · {CANAL_ICONO[canal]} {CANAL_LABEL[canal]} ·{" "}
                    {h.respondio ? (
                      <span className="text-emerald-700 dark:text-emerald-300">Respondió</span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-300">Sin respuesta</span>
                    )}
                    {h.avisoFinal && <span className="ml-1 text-red-700 dark:text-red-300">· Aviso final</span>}
                  </p>
                  {h.propiedad && <p className="text-gray-500">🏢 {h.propiedad}</p>}
                  {h.nota && <p className="italic text-gray-500">{h.nota}</p>}
                  {h.proximaFecha && <p className="text-gray-400">Próximo: {fechaCorta(h.proximaFecha)}</p>}
                </div>
                <button
                  type="button"
                  title="Borrar (cargado por error)"
                  onClick={() => {
                    if (window.confirm("¿Borrar este seguimiento?"))
                      start(() => borrarSeguimiento(h.id, contactoId));
                  }}
                  className="text-gray-300 hover:text-red-600"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
