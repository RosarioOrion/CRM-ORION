"use client";

import { useEffect, useState } from "react";
import {
  clavePublicaPush,
  guardarSuscripcion,
  quitarSuscripcion,
  enviarPrueba,
} from "@/app/(app)/recordatorios/actions";

type Estado = "cargando" | "no-soportado" | "iphone-sin-instalar" | "bloqueado" | "apagado" | "activo";

function base64ABytes(base64: string) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function registrarSW() {
  return navigator.serviceWorker.register("/sw.js");
}

function detectarEstadoInicial(): Estado {
  if (typeof window === "undefined") return "cargando";
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalada =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (esIOS && !instalada) return "iphone-sin-instalar";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "no-soportado";
  }
  if (Notification.permission === "denied") return "bloqueado";
  return "cargando";
}

/**
 * Tarjeta para activar los recordatorios (notificaciones) en ESTE
 * dispositivo. `compacto` = versión banner para la Agenda, que se oculta
 * sola cuando ya están activos.
 */
export function ActivarRecordatorios({ compacto = false }: { compacto?: boolean }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const inicial = detectarEstadoInicial();
      if (inicial !== "cargando") {
        if (!cancelado) setEstado(inicial);
        return;
      }
      try {
        const reg = await registrarSW();
        const sub = await reg.pushManager.getSubscription();
        if (sub && Notification.permission === "granted") {
          // Re-guardar por si se borró del servidor.
          await guardarSuscripcion(sub.toJSON() as never);
          if (!cancelado) setEstado("activo");
        } else if (!cancelado) {
          setEstado("apagado");
        }
      } catch {
        if (!cancelado) setEstado("no-soportado");
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  async function activar() {
    setOcupado(true);
    setMensaje(null);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "apagado");
        return;
      }
      const reg = await registrarSW();
      await navigator.serviceWorker.ready;
      const clave = await clavePublicaPush();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ABytes(clave),
        }));
      const r = await guardarSuscripcion(sub.toJSON() as never);
      if (!r.ok) {
        setMensaje(r.error ?? "No se pudo activar.");
        return;
      }
      setEstado("activo");
      await enviarPrueba();
      setMensaje("¡Listo! Te mandamos una notificación de prueba.");
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : "No se pudo activar.");
    } finally {
      setOcupado(false);
    }
  }

  async function desactivar() {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await quitarSuscripcion(sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("apagado");
      setMensaje(null);
    } finally {
      setOcupado(false);
    }
  }

  async function probar() {
    setOcupado(true);
    try {
      const n = await enviarPrueba();
      setMensaje(n > 0 ? "Notificación de prueba enviada." : "No se encontró este dispositivo; desactivá y volvé a activar.");
    } finally {
      setOcupado(false);
    }
  }

  if (estado === "cargando") return null;
  if (compacto && (estado === "activo" || estado === "no-soportado")) return null;

  const boton =
    "rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60";

  return (
    <div
      className={`rounded-xl border p-4 text-sm ${
        compacto
          ? "border-orion-gold/50 bg-orion-gold/5"
          : "border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
      }`}
    >
      <p className="font-semibold text-orion-navy dark:text-white">🔔 Recordatorios en el celular</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Orion te avisa 1 hora antes de cada visita, reunión, captación o firma de tu Agenda
        (y de las reuniones de equipo). Se activa en cada dispositivo por separado.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {estado === "apagado" && (
          <button
            type="button"
            onClick={activar}
            disabled={ocupado}
            className={`${boton} bg-orion-navy text-white hover:bg-orion-navy-light`}
          >
            {ocupado ? "Activando…" : "Activar en este dispositivo"}
          </button>
        )}
        {estado === "activo" && (
          <>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              ✅ Activos en este dispositivo
            </span>
            <button
              type="button"
              onClick={probar}
              disabled={ocupado}
              className={`${boton} border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200`}
            >
              Enviar prueba
            </button>
            <button
              type="button"
              onClick={desactivar}
              disabled={ocupado}
              className={`${boton} text-gray-500 hover:text-red-600`}
            >
              Desactivar
            </button>
          </>
        )}
        {estado === "iphone-sin-instalar" && (
          <p className="text-xs text-gray-600 dark:text-gray-300">
            En iPhone primero instalá Orion: en Safari tocá <b>Compartir</b> →{" "}
            <b>Agregar a pantalla de inicio</b>, abrí Orion desde ese ícono y activalos acá.
          </p>
        )}
        {estado === "bloqueado" && (
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Las notificaciones están bloqueadas para Orion en este dispositivo. Habilitalas en la
            configuración del navegador (ícono del candado junto a la dirección → Notificaciones →
            Permitir) y recargá la página.
          </p>
        )}
        {estado === "no-soportado" && (
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Este navegador no permite notificaciones. Probá desde Chrome o desde la app instalada.
          </p>
        )}
      </div>

      {mensaje && <p className="mt-2 text-xs text-orion-navy dark:text-orion-gold">{mensaje}</p>}
    </div>
  );
}
