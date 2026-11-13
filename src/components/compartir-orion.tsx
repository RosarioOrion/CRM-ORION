"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";

// "Compartir Orion": código QR y link para entrar (alguien del equipo que
// usa otro celular o computadora) o para sumarse al equipo (la cuenta nueva
// queda pendiente hasta que un administrador la aprueba en Usuarios).

const OPCIONES = {
  entrar: {
    label: "Entrar",
    ruta: "/login",
    ayuda: "Para alguien del equipo que quiere abrir Orion en otro celular o computadora.",
    mensaje: "Entrá a Orion desde acá:",
  },
  sumarse: {
    label: "Sumarse al equipo",
    ruta: "/registro",
    ayuda: "Para un agente nuevo: crea su cuenta y queda pendiente hasta que la apruebes en Usuarios.",
    mensaje: "Creá tu cuenta en Orion, el CRM del equipo:",
  },
} as const;

type Opcion = keyof typeof OPCIONES;

export function CompartirOrion() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        <span>📲</span>
        <span>Compartir Orion</span>
      </button>
      {/* Fuera del menú lateral: el menú se mueve con transform y encerraría la ventana. */}
      {abierto && createPortal(<VentanaCompartir onCerrar={() => setAbierto(false)} />, document.body)}
    </>
  );
}

function VentanaCompartir({ onCerrar }: { onCerrar: () => void }) {
  const [opcion, setOpcion] = useState<Opcion>("entrar");
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const o = OPCIONES[opcion];
  const link = typeof window === "undefined" ? o.ruta : `${window.location.origin}${o.ruta}`;

  useEffect(() => {
    let vigente = true;
    QRCode.toDataURL(link, { width: 480, margin: 2, color: { dark: "#0a1830", light: "#ffffff" } })
      .then((url) => vigente && setQr(url))
      .catch(() => vigente && setQr(null));
    return () => {
      vigente = false;
    };
  }, [link]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onCerrar]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("Copiá el link:", link);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${o.mensaje} ${link}`)}`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-label="Compartir Orion"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl bg-white p-5 text-gray-900 shadow-2xl dark:bg-gray-800 dark:text-white"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-orion-navy dark:text-white">📲 Compartir Orion</h2>
          <button type="button" onClick={onCerrar} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
          {(Object.keys(OPCIONES) as Opcion[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setOpcion(k)}
              className={`rounded-md px-2 py-1.5 text-xs font-semibold ${
                opcion === k ? "bg-white text-orion-navy shadow dark:bg-gray-900 dark:text-white" : "text-gray-500"
              }`}
            >
              {OPCIONES[k].label}
            </button>
          ))}
        </div>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{o.ayuda}</p>

        <div className="mx-auto mb-3 flex aspect-square w-56 items-center justify-center rounded-lg border border-gray-200 bg-white p-2">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={`Código QR para ${o.label.toLowerCase()} en Orion`} className="h-full w-full" />
          ) : (
            <span className="text-xs text-gray-400">Generando código…</span>
          )}
        </div>
        <p className="mb-3 text-center text-xs text-gray-500 dark:text-gray-400">
          Escaneá con la cámara del celular. Una vez adentro, desde el menú del navegador podés “Agregar a la pantalla
          de inicio” para tenerlo como app.
        </p>

        <p className="mb-3 truncate rounded-lg bg-gray-50 px-3 py-2 text-center text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-300">
          {link}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={copiar}
            className="rounded-lg border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200"
          >
            {copiado ? "¡Copiado!" : "Copiar link"}
          </button>
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-green-600 px-2 py-2 text-center text-xs font-semibold text-white hover:bg-green-700"
          >
            WhatsApp
          </a>
          <a
            href={qr ?? undefined}
            download={`orion-${opcion}.png`}
            aria-disabled={!qr}
            className="rounded-lg bg-orion-navy px-2 py-2 text-center text-xs font-semibold text-white"
          >
            Bajar QR
          </a>
        </div>
      </div>
    </div>
  );
}
