"use client";

import { useState } from "react";

/**
 * Tarjeta para ver la agenda de Orion dentro de Google Calendar (gratis, en
 * un solo sentido: lo que se agenda en Orion aparece en Google).
 * `compacto` = versión plegable para la Agenda.
 */
export function ConectarGoogleCalendar({
  url,
  compacto = false,
}: {
  url: string;
  compacto?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  const webcal = url.replace(/^https?:\/\//, "webcal://");
  const abrirEnGoogle = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.getElementById("orion-ics-url") as HTMLInputElement | null;
      input?.select();
      document.execCommand("copy");
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  const cuerpo = (
    <div className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
      <p>
        Todo lo que agendás en Orion (visitas, reuniones, captaciones, tasaciones,
        firmas, reuniones de equipo…) aparece solo en tu Google Calendar, como un
        calendario aparte llamado <span className="font-semibold">“Orion”</span>.
      </p>

      <div className="flex flex-wrap gap-2">
        <a
          href={abrirEnGoogle}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-orion-navy px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
        >
          📅 Conectar con Google Calendar
        </a>
        <a
          href={webcal}
          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          🍎 Calendario del iPhone / Mac
        </a>
      </div>

      <div>
        <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
          Si el botón no funciona, copiá tu enlace privado:
        </p>
        <div className="flex gap-2">
          <input
            id="orion-ics-url"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-2 py-1.5 text-xs text-gray-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"
          />
          <button
            type="button"
            onClick={copiar}
            className="shrink-0 rounded-lg bg-orion-gold px-3 py-1.5 text-xs font-semibold text-orion-navy transition hover:opacity-90"
          >
            {copiado ? "✓ Copiado" : "Copiar"}
          </button>
        </div>
      </div>

      <details className="text-xs text-gray-600 dark:text-gray-300">
        <summary className="cursor-pointer font-semibold">Cómo agregarlo a mano (paso a paso)</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            En la computadora, abrí <span className="font-semibold">calendar.google.com</span>{" "}
            (desde la app del celular no se puede agregar por enlace).
          </li>
          <li>
            A la izquierda, en <span className="font-semibold">Otros calendarios</span>, tocá{" "}
            <span className="font-semibold">+</span> → <span className="font-semibold">Desde URL</span>.
          </li>
          <li>Pegá el enlace y tocá <span className="font-semibold">Agregar calendario</span>.</li>
          <li>
            Listo: en unos minutos aparece “Orion” también en la app de Google Calendar del
            celular (si no se ve, activalo en Ajustes → Orion → Sincronizar).
          </li>
        </ol>
      </details>

      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
        ⏱ Google actualiza este calendario cada algunas horas (lo decide Google; a veces
        tarda hasta un día). Para algo urgente, usá el botón{" "}
        <span className="font-semibold">“+ Google Calendar”</span> de cada actividad en la
        Agenda, que lo agrega al instante. <br />
        🔒 El enlace es personal: no lo compartas. Si cambiás tu contraseña, el enlace
        cambia y tenés que volver a conectarlo.
      </p>
    </div>
  );

  if (compacto) {
    return (
      <details className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <summary className="cursor-pointer text-sm font-semibold text-orion-navy dark:text-white">
          📅 Ver mi agenda en Google Calendar
        </summary>
        <div className="mt-3">{cuerpo}</div>
      </details>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Google Calendar
      </p>
      {cuerpo}
    </div>
  );
}
