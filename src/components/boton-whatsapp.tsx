"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { datosParaWhatsApp } from "@/app/(app)/mensajes/actions";
import { completarMensaje } from "@/lib/plantillas-whatsapp";
import { numeroWhatsApp } from "@/lib/seguimientos";

// Botón WhatsApp con menú de mensajes preestablecidos (se editan en
// /mensajes). Los mensajes se piden una sola vez por página, al abrir el menú.
let cache: ReturnType<typeof datosParaWhatsApp> | null = null;
function cargarDatos() {
  cache ??= datosParaWhatsApp().catch((e) => {
    cache = null;
    throw e;
  });
  return cache;
}

type Datos = Awaited<ReturnType<typeof datosParaWhatsApp>>;

export function BotonWhatsApp({
  telefono,
  nombre,
  propiedad,
  codigoPropiedad,
  className,
}: {
  telefono: string | null | undefined;
  /** Nombre del contacto (se usa {nombre} = primer nombre). */
  nombre?: string | null;
  /** Título de la propiedad, si se envía desde una. */
  propiedad?: string | null;
  /** Código de la propiedad, para armar {link} a la web. */
  codigoPropiedad?: string | null;
  className?: string;
}) {
  const wa = numeroWhatsApp(telefono);
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", cerrar);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", cerrar);
    };
  }, [abierto]);

  if (!wa) return null;

  function abrirMenu() {
    setAbierto((a) => !a);
    if (!datos) {
      cargarDatos()
        .then(setDatos)
        .catch(() => setError(true));
    }
  }

  function enviar(texto?: string) {
    const mensaje = texto
      ? completarMensaje(texto, {
          nombre,
          agente: datos?.agente,
          inmobiliaria: datos?.inmobiliaria,
          propiedad,
          link: codigoPropiedad ? `${window.location.origin}/inmuebles/${codigoPropiedad}` : null,
        })
      : "";
    const url = `https://wa.me/${wa}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ""}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setAbierto(false);
  }

  const item =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700";

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={abrirMenu}
        className={
          className ??
          "rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300"
        }
      >
        💬 WhatsApp ▾
      </button>
      {abierto && (
        <div className="absolute left-0 z-40 mt-1 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <button type="button" className={item} onClick={() => enviar()}>
            💬 <span>Mensaje en blanco</span>
          </button>
          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
          {error ? (
            <p className="px-3 py-2 text-xs text-red-600">No se pudieron cargar los mensajes.</p>
          ) : !datos ? (
            <p className="px-3 py-2 text-xs text-gray-400">Cargando mensajes…</p>
          ) : datos.plantillas.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">Todavía no hay mensajes preestablecidos.</p>
          ) : (
            datos.plantillas.map((p) => (
              <button key={p.id} type="button" className={item} onClick={() => enviar(p.texto)}>
                <span>{p.emoji || "💬"}</span>
                <span className="truncate">{p.titulo}</span>
              </button>
            ))
          )}
          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
          <Link
            href="/mensajes"
            className="block px-3 py-1.5 text-xs text-gray-400 hover:text-orion-navy dark:hover:text-white"
          >
            Ver / editar mensajes →
          </Link>
        </div>
      )}
    </div>
  );
}
