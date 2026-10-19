"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { DuenoLunes } from "@/lib/seguimiento-lunes";
import { registrarEnvioLunes, registrarRespuestaLunes } from "../actions";

const tarjeta =
  "rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800";

export function ListaLunes({
  pendientes: pendientesServidor,
  paraDecidir,
  hechos: hechosServidor,
}: {
  pendientes: DuenoLunes[];
  paraDecidir: DuenoLunes[];
  hechos: DuenoLunes[];
}) {
  // Los que se mandan en esta pantalla quedan visibles (con "anotar
  // respuesta") hasta recargar, en vez de saltar a la lista de abajo.
  // Al registrar un envío el servidor vuelve a armar la lista y ese dueño
  // pasa a "ya enviados"; se mantiene la lista con la que se arrancó para
  // que el progreso y el orden no salten.
  const [pendientes] = useState(pendientesServidor);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  const enLista = new Set(pendientes.map((d) => d.contactoId));
  const hechos = hechosServidor.filter((d) => !enLista.has(d.contactoId));
  const [saltados, setSaltados] = useState<Set<string>>(new Set());
  const actual = pendientes.find((d) => !enviados.has(d.contactoId) && !saltados.has(d.contactoId));
  const total = pendientes.length;

  return (
    <div className="flex flex-col gap-6">
      {total > 0 ? (
        <div className={tarjeta}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-orion-navy dark:text-white">
              {enviados.size} de {total} enviados
            </span>
            {!actual && <span className="text-green-600 dark:text-green-400">¡Listo por esta semana! 🎉</span>}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-orion-gold transition-all"
              style={{ width: `${(enviados.size / total) * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800">
          No hay seguimientos pendientes esta semana. 🙌
        </p>
      )}

      {pendientes.length > 0 && (
        <div className="flex flex-col gap-3">
          {pendientes.map((d) => (
            <TarjetaDueno
              key={d.contactoId}
              dueno={d}
              activo={actual?.contactoId === d.contactoId}
              enviado={enviados.has(d.contactoId)}
              saltado={saltados.has(d.contactoId)}
              onEnviado={() => setEnviados((s) => new Set(s).add(d.contactoId))}
              onSaltar={() => setSaltados((s) => new Set(s).add(d.contactoId))}
              onRetomar={() =>
                setSaltados((s) => {
                  const n = new Set(s);
                  n.delete(d.contactoId);
                  return n;
                })
              }
            />
          ))}
        </div>
      )}

      {paraDecidir.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Para decidir — {paraDecidir.length}
          </h2>
          <div className="flex flex-col gap-2">
            {paraDecidir.map((d) => (
              <div key={d.contactoId} className={`${tarjeta} flex flex-wrap items-center justify-between gap-2`}>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">❄️ {d.nombre}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {d.propiedades.map((p) => p.codigo).join(", ")} · {d.paraDecidir}
                  </p>
                </div>
                <Link
                  href={`/contactos/${d.contactoId}`}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200"
                >
                  Ver contacto
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {hechos.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Ya enviados esta semana — {hechos.length}
          </h2>
          <div className="flex flex-col gap-2">
            {hechos.map((d) => (
              <div key={d.contactoId} className={tarjeta}>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">✓ {d.nombre}</p>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  {d.propiedades.map((p) => p.codigo).join(", ")}
                </p>
                <AnotarRespuesta propiedadIds={d.propiedades.map((p) => p.id)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TarjetaDueno({
  dueno: d,
  activo,
  enviado,
  saltado,
  onEnviado,
  onSaltar,
  onRetomar,
}: {
  dueno: DuenoLunes;
  activo: boolean;
  enviado: boolean;
  saltado: boolean;
  onEnviado: () => void;
  onSaltar: () => void;
  onRetomar: () => void;
}) {
  const [mensaje, setMensaje] = useState(d.mensaje);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function enviar() {
    if (!d.whatsapp) return;
    setError(null);
    // Se abre antes de esperar al servidor: si no, el navegador bloquea la ventana.
    window.open(`https://wa.me/${d.whatsapp}?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener,noreferrer");
    startTransition(async () => {
      const r = await registrarEnvioLunes(
        d.propiedades.map((p) => p.id),
        d.avisoFinal
      );
      if (r.error) setError(r.error);
      else onEnviado();
    });
  }

  const encabezado = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
        {enviado ? "✓ " : ""}
        {d.nombre}
      </span>
      {d.propiedades.map((p) => (
        <Link
          key={p.id}
          href={`/propiedades/${p.id}`}
          className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
            p.atrasado
              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
          }`}
          title={p.titulo}
        >
          {p.codigo}
          {p.atrasado ? " · atrasado" : ""}
        </Link>
      ))}
      {d.avisoFinal && (
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          ⚠️ Aviso final (3º sin respuesta)
        </span>
      )}
    </div>
  );

  if (enviado) {
    return (
      <div className={`${tarjeta} border-green-300 dark:border-green-800`}>
        {encabezado}
        <p className="mb-2 mt-1 text-xs text-green-700 dark:text-green-400">Enviado y registrado.</p>
        <AnotarRespuesta propiedadIds={d.propiedades.map((p) => p.id)} />
      </div>
    );
  }

  if (!activo) {
    return (
      <div className={`${tarjeta} flex flex-wrap items-center justify-between gap-2 opacity-70`}>
        {encabezado}
        {saltado && (
          <button
            type="button"
            onClick={onRetomar}
            className="text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold"
          >
            Retomar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`${tarjeta} border-orion-gold ring-1 ring-orion-gold`}>
      {encabezado}
      <textarea
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        rows={5}
        className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {d.whatsapp ? (
          <button
            type="button"
            onClick={enviar}
            disabled={pending}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {pending ? "Registrando…" : "💬 Enviar por WhatsApp"}
          </button>
        ) : (
          <Link
            href={`/contactos/${d.contactoId}`}
            className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-600 dark:border-red-800 dark:text-red-400"
          >
            Sin celular: cargalo en el contacto
          </Link>
        )}
        <button
          type="button"
          onClick={onSaltar}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300"
        >
          Saltar
        </button>
        {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
      </div>
    </div>
  );
}

function AnotarRespuesta({ propiedadIds }: { propiedadIds: string[] }) {
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState("");
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (listo) return <p className="text-xs text-green-700 dark:text-green-400">Respuesta anotada ✓</p>;
  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold"
      >
        ¿Respondió? Anotar respuesta
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="¿Qué respondió? (sigue disponible, bajó el precio…)"
        className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const r = await registrarRespuestaLunes(propiedadIds, nota);
            if (r.error) setError(r.error);
            else setListo(true);
          })
        }
        className="rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
