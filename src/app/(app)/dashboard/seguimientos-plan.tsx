"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ItemSeguimiento } from "@/lib/plan-del-dia";
import { enviarSeguimientoPlan, responderSeguimientoPlan, type RespuestaPlan } from "./actions";

const MAX = 5;

const OPCIONES: { valor: RespuestaPlan; label: string; soloDueno?: boolean }[] = [
  { valor: "DISPONIBLE", label: "Sigue disponible", soloDueno: true },
  { valor: "NO_DISPONIBLE", label: "Ya no está disponible", soloDueno: true },
  { valor: "CAMBIO_PRECIO", label: "Cambió el precio", soloDueno: true },
  { valor: "NO_RESPONDIO", label: "No respondió" },
];

const ETIQUETA: Record<RespuestaPlan, string> = {
  DISPONIBLE: "✓ Sigue disponible",
  NO_DISPONIBLE: "✓ Ya no está disponible: propiedad cerrada",
  CAMBIO_PRECIO: "✓ Precio actualizado",
  NO_RESPONDIO: "✓ Anotado sin respuesta",
};

const control =
  "rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-900 dark:text-white";

/**
 * "Seguimientos para hoy" con acciones en cada tarjeta: qué respondió,
 * qué decir y enviar por WhatsApp. La lista se guarda al abrir la página
 * para que las tarjetas resueltas no salten mientras se trabaja.
 */
export function SeguimientosPlan({ items: iniciales, verTodos }: { items: ItemSeguimiento[]; verTodos: string }) {
  const [items] = useState(iniciales);
  const [todos, setTodos] = useState(false);
  const visibles = todos ? items : items.slice(0, MAX);

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        ⏰ Seguimientos para hoy {items.length > 0 && `· ${items.length}`}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">No tenés seguimientos pendientes para hoy.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibles.map((it) => (
            <TarjetaSeguimiento key={it.id} item={it} />
          ))}
        </ul>
      )}
      {items.length > MAX && !todos && (
        <button
          type="button"
          onClick={() => setTodos(true)}
          className="mt-1 text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold"
        >
          Ver los {items.length} →
        </button>
      )}
      {items.length > 0 && (
        <Link href={verTodos} className="ml-3 mt-1 inline-block text-xs text-gray-400 hover:underline">
          Ir a Contactos
        </Link>
      )}
    </div>
  );
}

function TarjetaSeguimiento({ item: it }: { item: ItemSeguimiento }) {
  const a = it.accion;
  const esDueno = a.propiedades.length > 0;
  const opciones = OPCIONES.filter((o) => esDueno || !o.soloDueno);

  const [respuesta, setRespuesta] = useState<RespuestaPlan | "">("");
  const [propiedadId, setPropiedadId] = useState(a.propiedades[0]?.id ?? "");
  const prop = a.propiedades.find((p) => p.id === propiedadId);
  const [precio, setPrecio] = useState("");
  const [moneda, setMoneda] = useState<"USD" | "UYU">(prop?.moneda === "UYU" ? "UYU" : "USD");
  const [mensaje, setMensaje] = useState(a.mensaje);
  const [verMensaje, setVerMensaje] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [guardado, setGuardado] = useState<RespuestaPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar() {
    if (!respuesta) return setError("Elegí qué respondió.");
    if (respuesta === "NO_DISPONIBLE" && esDueno) {
      const cuales = a.propiedades.map((p) => p.codigo).join(", ");
      if (!window.confirm(`¿Pasar ${cuales} a Cerrada? La podés reactivar desde la ficha.`)) return;
    }
    setError(null);
    startTransition(async () => {
      const r = await responderSeguimientoPlan(
        a.contactoId,
        respuesta,
        respuesta === "CAMBIO_PRECIO" ? { propiedadId, precio: Number(precio), moneda } : undefined
      );
      if (r.error) setError(r.error);
      else setGuardado(respuesta);
    });
  }

  function enviar() {
    if (!a.whatsapp) return;
    setError(null);
    // Se abre antes de esperar al servidor: si no, el navegador bloquea la ventana.
    window.open(`https://wa.me/${a.whatsapp}?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener,noreferrer");
    startTransition(async () => {
      const r = await enviarSeguimientoPlan(a.contactoId);
      if (r.error) setError(r.error);
      else setEnviado(true);
    });
  }

  const borde = guardado
    ? "border-green-300 dark:border-green-800"
    : it.urgente
    ? "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-900/20"
    : "border-gray-200 dark:border-gray-700";

  return (
    <li className={`rounded-lg border px-3 py-2 ${borde}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <Link href={it.href} className="text-sm font-semibold text-gray-800 hover:underline dark:text-gray-100">
          {it.titulo}
        </Link>
        {esDueno && (
          <span className="text-[11px] text-gray-400">{a.propiedades.map((p) => p.codigo).join(" · ")}</span>
        )}
      </div>
      <p className={`text-xs ${it.urgente && !guardado ? "text-red-700 dark:text-red-300" : "text-gray-500 dark:text-gray-400"}`}>
        {it.detalle}
        {enviado && !guardado && " · 💬 Mensaje enviado"}
      </p>

      {guardado ? (
        <p className="mt-1 text-xs font-semibold text-green-700 dark:text-green-400">{ETIQUETA[guardado]}</p>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value as RespuestaPlan | "")}
              className={control}
              aria-label="¿Qué respondió?"
            >
              <option value="">¿Qué respondió?</option>
              {opciones.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.label}
                </option>
              ))}
            </select>
            {respuesta === "CAMBIO_PRECIO" && (
              <>
                {a.propiedades.length > 1 && (
                  <select value={propiedadId} onChange={(e) => setPropiedadId(e.target.value)} className={control}>
                    {a.propiedades.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo}
                      </option>
                    ))}
                  </select>
                )}
                <select value={moneda} onChange={(e) => setMoneda(e.target.value as "USD" | "UYU")} className={control}>
                  <option value="USD">USD</option>
                  <option value="UYU">$</option>
                </select>
                <input
                  type="number"
                  min={1}
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  placeholder={prop?.precio ? `Antes ${prop.precio.toLocaleString("es-UY")}` : "Precio nuevo"}
                  className={`${control} w-32`}
                  aria-label="Precio nuevo"
                />
              </>
            )}
            <button
              type="button"
              onClick={guardar}
              disabled={pending || !respuesta}
              className="rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              Guardar
            </button>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setVerMensaje((v) => !v)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-300"
              aria-expanded={verMensaje}
            >
              Qué decir {verMensaje ? "▴" : "▾"}
            </button>
            {a.whatsapp ? (
              <button
                type="button"
                onClick={enviar}
                disabled={pending}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {enviado ? "Reenviar" : "Enviar"}
              </button>
            ) : (
              <Link href={it.href} className="text-xs font-semibold text-red-600 hover:underline dark:text-red-400">
                Sin celular
              </Link>
            )}
          </div>
          {verMensaje && (
            <div className="mt-2">
              {(a.avisoFinal || a.version) && (
                <p className="mb-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  {a.avisoFinal ? "⚠️ Toca el aviso final (3º sin respuesta)" : a.version}
                </p>
              )}
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
          )}
        </>
      )}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </li>
  );
}
