"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  TIPOS_EVENTO,
  TIPO_EVENTO_LABEL,
  TIPO_EVENTO_PUNTO,
  TIPO_EVENTO_ETIQUETA,
  type EventoCalendario,
} from "@/lib/calendario";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const dos = (n: number) => String(n).padStart(2, "0");
const claveDia = (a: number, m: number, d: number) => `${a}-${dos(m + 1)}-${dos(d)}`;

function hoyClave() {
  const h = new Date();
  return claveDia(h.getFullYear(), h.getMonth(), h.getDate());
}

export function Calendario({ eventos }: { eventos: EventoCalendario[] }) {
  const hoy = hoyClave();
  const [anio, setAnio] = useState(() => new Date().getFullYear());
  const [mes, setMes] = useState(() => new Date().getMonth());
  const [seleccionado, setSeleccionado] = useState<string>(hoy);

  const porDia = useMemo(() => {
    const mapa = new Map<string, EventoCalendario[]>();
    for (const e of eventos) {
      if (!mapa.has(e.dia)) mapa.set(e.dia, []);
      mapa.get(e.dia)!.push(e);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => (a.hora ?? "99").localeCompare(b.hora ?? "99"));
    }
    return mapa;
  }, [eventos]);

  // Celdas del mes: semanas que arrancan en lunes.
  const primerDia = new Date(anio, mes, 1);
  const offset = (primerDia.getDay() + 6) % 7; // lunes = 0
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const celdas: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];
  while (celdas.length % 7 !== 0) celdas.push(null);

  function mover(delta: number) {
    const d = new Date(anio, mes + delta, 1);
    setAnio(d.getFullYear());
    setMes(d.getMonth());
  }

  function irAHoy() {
    const d = new Date();
    setAnio(d.getFullYear());
    setMes(d.getMonth());
    setSeleccionado(hoy);
  }

  const eventosDia = porDia.get(seleccionado) ?? [];
  const [sa, sm, sd] = seleccionado.split("-").map(Number);
  const tituloDia = new Date(sa, sm - 1, sd).toLocaleDateString("es-UY", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {/* Calendario */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => mover(-1)}
            className="rounded-lg px-3 py-1.5 text-lg text-orion-navy hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-orion-navy dark:text-white">
              {MESES[mes]} {anio}
            </h2>
            <button
              type="button"
              onClick={irAHoy}
              className="rounded-md border border-orion-gold/60 px-2 py-0.5 text-[11px] font-semibold text-orion-gold hover:bg-orion-gold/10"
            >
              Hoy
            </button>
          </div>
          <button
            type="button"
            onClick={() => mover(1)}
            className="rounded-lg px-3 py-1.5 text-lg text-orion-navy hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {DIAS_SEMANA.map((d) => (
            <div
              key={d}
              className="pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400"
            >
              {d}
            </div>
          ))}

          {celdas.map((d, i) => {
            if (d === null) return <div key={`v${i}`} />;
            const clave = claveDia(anio, mes, d);
            const lista = porDia.get(clave) ?? [];
            const tipos = TIPOS_EVENTO.filter((t) => lista.some((e) => e.tipo === t));
            const esHoy = clave === hoy;
            const esSel = clave === seleccionado;

            return (
              <button
                key={clave}
                type="button"
                onClick={() => setSeleccionado(clave)}
                className={[
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-sm transition sm:aspect-auto sm:h-14",
                  esSel
                    ? "bg-orion-navy text-white dark:bg-orion-gold dark:text-orion-navy"
                    : lista.length > 0
                      ? "bg-orion-gold/10 text-gray-800 hover:bg-orion-gold/20 dark:text-gray-100"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
                  esHoy && !esSel ? "ring-2 ring-orion-gold" : "",
                ].join(" ")}
              >
                <span className={esHoy ? "font-bold" : ""}>{d}</span>
                <span className="flex h-1.5 gap-0.5">
                  {tipos.map((t) => (
                    <span
                      key={t}
                      className={`h-1.5 w-1.5 rounded-full ${TIPO_EVENTO_PUNTO[t]} ${esSel ? "ring-1 ring-white" : ""}`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-3 dark:border-gray-700">
          {TIPOS_EVENTO.map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
              <span className={`h-2 w-2 rounded-full ${TIPO_EVENTO_PUNTO[t]}`} />
              {TIPO_EVENTO_LABEL[t]}
            </span>
          ))}
        </div>
      </div>

      {/* Detalle del día */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold first-letter:uppercase text-orion-navy dark:text-white">
            {tituloDia}
          </h3>
          <Link
            href={`/agenda?fecha=${seleccionado}`}
            className="shrink-0 rounded-lg bg-orion-navy px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-orion-navy-light dark:bg-orion-gold dark:text-orion-navy"
          >
            + Agendar este día
          </Link>
        </div>
        <p className="mb-3 text-xs text-gray-400">
          {eventosDia.length === 0
            ? "Nada agendado"
            : `${eventosDia.length} actividad(es)`}
        </p>

        {eventosDia.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400 dark:border-gray-700">
            Día libre.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {eventosDia.map((e) => (
              <li key={e.id}>
                <Link
                  href={e.href}
                  className="block rounded-lg border border-gray-100 p-3 transition hover:border-orion-gold/60 hover:bg-orion-gold/5 dark:border-gray-700"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-orion-navy px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {e.hora ?? "Sin hora"}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${TIPO_EVENTO_ETIQUETA[e.tipo]}`}>
                      {TIPO_EVENTO_LABEL[e.tipo]}
                    </span>
                    {e.agente && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        {e.tipo === "REUNION_EQUIPO" ? "Organiza" : "Agente"}: {e.agente}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {e.titulo}
                  </p>
                  {e.detalle && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{e.detalle}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
