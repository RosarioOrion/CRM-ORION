"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { partesParaLeer, puntajeVoz, textoParaLeer } from "@/lib/lectura-voz";

// "🎧 Escuchar": lee el capítulo en voz alta con la voz que ya trae el
// celular o la computadora (gratis). Usa el texto que Orion extrajo del PDF.

type Pagina = { pagina: number; texto: string };
type Parte = { pagina: number; texto: string };

const VELOCIDADES = [0.8, 0.9, 1, 1.1, 1.25, 1.5];
const CLAVE_VOZ = "orion-escuchar-voz";
const CLAVE_VEL = "orion-escuchar-vel";

const leerPref = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const guardarPref = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // sin almacenamiento: no se recuerda
  }
};

export function Escuchar({
  paginas,
  paginaInicial,
}: {
  paginas: Pagina[];
  paginaInicial?: number;
}) {
  const partes = useMemo<Parte[]>(
    () =>
      paginas.flatMap((p) =>
        partesParaLeer(textoParaLeer(p.texto)).map((texto) => ({
          pagina: p.pagina,
          texto,
        })),
      ),
    [paginas],
  );
  const primeraDe = useCallback(
    (pag: number) => {
      const i = partes.findIndex((p) => p.pagina >= pag);
      return i < 0 ? 0 : i;
    },
    [partes],
  );

  const [soportado, setSoportado] = useState(true);
  const [voces, setVoces] = useState<SpeechSynthesisVoice[]>([]);
  const [vozUri, setVozUri] = useState("");
  const [vel, setVel] = useState(1);
  const [estado, setEstado] = useState<"parado" | "leyendo" | "pausa">(
    "parado",
  );
  const [indice, setIndice] = useState(() => primeraDe(paginaInicial ?? 1));
  const [abierto, setAbierto] = useState(false);

  // Refs para que el encadenado de partes use siempre lo último elegido.
  const indiceRef = useRef(indice);
  const leyendoRef = useRef(false);
  const vozRef = useRef<SpeechSynthesisVoice | null>(null);
  const velRef = useRef(vel);
  const actualRef = useRef<SpeechSynthesisUtterance | null>(null);
  const wakeRef = useRef<WakeLockSentinel | null>(null);

  // Voces disponibles (llegan de a poco en algunos navegadores).
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- detección del navegador
      setSoportado(false);
      return;
    }
    const cargar = () => {
      const es = window.speechSynthesis
        .getVoices()
        .filter((v) => puntajeVoz(v.lang, v.name) > 0)
        .sort(
          (a, b) => puntajeVoz(b.lang, b.name) - puntajeVoz(a.lang, a.name),
        );
      setVoces(es);
      const guardada = leerPref(CLAVE_VOZ);
      const elegida = es.find((v) => v.voiceURI === guardada) ?? es[0];
      if (elegida) {
        setVozUri(elegida.voiceURI);
        vozRef.current = elegida;
      }
    };
    cargar();
    window.speechSynthesis.addEventListener("voiceschanged", cargar);
    const v = Number(leerPref(CLAVE_VEL));
    if (VELOCIDADES.includes(v)) {
      setVel(v);
      velRef.current = v;
    }
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", cargar);
      leyendoRef.current = false;
      window.speechSynthesis.cancel();
    };
  }, []);

  const mantenerPantalla = useCallback(async (si: boolean) => {
    try {
      if (si && !wakeRef.current && "wakeLock" in navigator) {
        wakeRef.current = await navigator.wakeLock.request("screen");
        wakeRef.current.addEventListener(
          "release",
          () => (wakeRef.current = null),
        );
      } else if (!si && wakeRef.current) {
        await wakeRef.current.release();
        wakeRef.current = null;
      }
    } catch {
      // el navegador no deja: no pasa nada
    }
  }, []);

  const leerDesde = useCallback(
    (inicio: number) => {
      const synth = window.speechSynthesis;
      const leer = (i: number) => {
        if (i >= partes.length) {
          leyendoRef.current = false;
          setEstado("parado");
          indiceRef.current = 0;
          setIndice(0);
          void mantenerPantalla(false);
          return;
        }
        indiceRef.current = i;
        setIndice(i);
        const u = new SpeechSynthesisUtterance(partes[i].texto);
        u.lang = vozRef.current?.lang ?? "es-ES";
        if (vozRef.current) u.voice = vozRef.current;
        u.rate = velRef.current;
        u.onend = () => {
          if (actualRef.current !== u || !leyendoRef.current) return;
          leer(i + 1);
        };
        u.onerror = (e) => {
          if (actualRef.current !== u || !leyendoRef.current) return;
          if (e.error === "interrupted" || e.error === "canceled") return;
          leer(i + 1);
        };
        actualRef.current = u;
        synth.speak(u);
      };
      leer(inicio);
    },
    [partes, mantenerPantalla],
  );

  // Pausar = cortar y recordar dónde iba (pause() falla en varios celulares).
  const cortar = () => {
    leyendoRef.current = false;
    actualRef.current = null;
    window.speechSynthesis.cancel();
  };

  const reproducir = (desde = indiceRef.current) => {
    cortar();
    leyendoRef.current = true;
    setEstado("leyendo");
    void mantenerPantalla(true);
    // pequeño respiro: algunos navegadores ignoran speak() justo después de cancel()
    setTimeout(() => leyendoRef.current && leerDesde(desde), 60);
  };

  const pausar = () => {
    cortar();
    setEstado("pausa");
    void mantenerPantalla(false);
  };

  const detener = () => {
    cortar();
    setEstado("parado");
    indiceRef.current = primeraDe(paginaInicial ?? 1);
    setIndice(indiceRef.current);
    void mantenerPantalla(false);
  };

  const saltarPagina = (delta: number) => {
    const pagActual = partes[indiceRef.current]?.pagina ?? 1;
    const lista = [...new Set(partes.map((p) => p.pagina))];
    const pos = lista.indexOf(pagActual);
    const destino =
      lista[Math.min(lista.length - 1, Math.max(0, pos + delta))] ?? 1;
    const i = primeraDe(destino);
    if (estado === "leyendo") reproducir(i);
    else {
      indiceRef.current = i;
      setIndice(i);
    }
  };

  const cambiarVoz = (uri: string) => {
    setVozUri(uri);
    vozRef.current = voces.find((v) => v.voiceURI === uri) ?? null;
    guardarPref(CLAVE_VOZ, uri);
    if (estado === "leyendo") reproducir();
  };

  const cambiarVel = (v: number) => {
    setVel(v);
    velRef.current = v;
    guardarPref(CLAVE_VEL, String(v));
    if (estado === "leyendo") reproducir();
  };

  if (!partes.length) return null;

  const pagActual = partes[indice]?.pagina ?? 1;
  const totalPag = paginas[paginas.length - 1]?.pagina ?? 1;
  const progreso = Math.round((indice / partes.length) * 100);
  const boton =
    "rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-orion-navy transition hover:border-orion-navy disabled:opacity-40 dark:border-gray-600 dark:text-white";

  return (
    <div className="mb-4 rounded-xl border border-orion-gold/40 bg-orion-gold/10 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-bold text-orion-navy dark:text-white">
          🎧 Leer en voz alta
        </span>
        {!soportado ? (
          <span className="text-xs text-gray-500">
            Este navegador no puede leer en voz alta. Probá con Chrome, Edge o
            Safari.
          </span>
        ) : (
          <>
            {estado === "leyendo" ? (
              <button
                type="button"
                onClick={pausar}
                className={`${boton} bg-white dark:bg-gray-800`}
              >
                ⏸ Pausa
              </button>
            ) : (
              <button
                type="button"
                onClick={() => reproducir()}
                className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white hover:bg-orion-navy-light"
              >
                ▶{" "}
                {estado === "pausa"
                  ? "Seguir"
                  : indice > 0
                    ? `Desde la pág. ${pagActual}`
                    : "Escuchar"}
              </button>
            )}
            <button
              type="button"
              onClick={() => saltarPagina(-1)}
              className={boton}
              aria-label="Página anterior"
            >
              ⏮
            </button>
            <button
              type="button"
              onClick={() => saltarPagina(1)}
              className={boton}
              aria-label="Página siguiente"
            >
              ⏭
            </button>
            {estado !== "parado" && (
              <button
                type="button"
                onClick={detener}
                className={boton}
                aria-label="Detener"
              >
                ⏹
              </button>
            )}
            <span className="text-xs text-gray-600 dark:text-gray-300">
              Pág. {pagActual} de {totalPag}
              {estado !== "parado" && ` · ${progreso}%`}
            </span>
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              className="ml-auto text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold"
            >
              ⚙️ Voz y velocidad
            </button>
          </>
        )}
      </div>

      {soportado && abierto && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
            Voz
            <select
              value={vozUri}
              onChange={(e) => cambiarVoz(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              {voces.length === 0 && <option value="">La del sistema</option>}
              {voces.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
            Velocidad
            <select
              value={vel}
              onChange={(e) => cambiarVel(Number(e.target.value))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              {VELOCIDADES.map((v) => (
                <option key={v} value={v}>
                  {v === 1 ? "Normal" : `${String(v).replace(".", ",")}x`}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[11px] text-gray-500 sm:col-span-2">
            Usa la voz que trae tu celular o computadora (gratis). Mientras
            escuchás, Orion mantiene la pantalla encendida; en el celular, si la
            pantalla se bloquea o cambiás de app, la lectura puede cortarse.
          </p>
        </div>
      )}
    </div>
  );
}
