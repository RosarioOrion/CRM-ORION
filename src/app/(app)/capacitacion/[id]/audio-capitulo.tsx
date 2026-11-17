"use client";

import { useEffect, useRef, useState } from "react";
import { duracionLegible, type AudioCapitulo } from "@/lib/capacitacion-audio-tipos";

// Reproductor del audio grabado de un capítulo. Si hay varias partes, pasa
// sola a la siguiente. Recuerda en qué parte y minuto quedaste (en este
// navegador) y sigue sonando con la pantalla bloqueada.

const VELOCIDADES = [1, 1.25, 1.5, 0.9];

const leer = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const guardar = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // sin almacenamiento
  }
};

export function AudioDelCapitulo({
  documentoId,
  titulo,
  audios,
}: {
  documentoId: string;
  titulo: string;
  audios: AudioCapitulo[];
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const clave = `orion-audio-${documentoId}`;
  const [parte, setParte] = useState(0);
  const [vel, setVel] = useState(1);
  const [retomar, setRetomar] = useState<{ parte: number; seg: number } | null>(null);
  const seguir = useRef(false);
  const ultimoGuardado = useRef(0);

  // ¿Quedó a mitad la última vez?
  useEffect(() => {
    const g = leer(clave);
    if (!g) return;
    const [p, s] = g.split(":").map(Number);
    if (p >= 0 && p < audios.length && s > 20) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- dato guardado en el navegador
      setRetomar({ parte: p, seg: s });
    }
    const v = Number(leer("orion-audio-vel"));
    if (VELOCIDADES.includes(v)) setVel(v);
  }, [clave, audios.length]);

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = vel;
  }, [vel, parte]);

  // Título en la pantalla bloqueada / controles del celular.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: audios.length > 1 ? `${titulo} · Parte ${parte + 1}` : titulo,
      artist: "Manual Orion",
      album: "Capacitación Orion",
      artwork: [{ src: "/icons/orion-192.png", sizes: "192x192", type: "image/png" }],
    });
    navigator.mediaSession.setActionHandler("nexttrack", parte < audios.length - 1 ? () => irA(parte + 1, 0, true) : null);
    navigator.mediaSession.setActionHandler("previoustrack", parte > 0 ? () => irA(parte - 1, 0, true) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- irA no cambia de comportamiento
  }, [parte, titulo, audios.length]);

  function irA(p: number, seg: number, reproducir: boolean) {
    seguir.current = reproducir;
    if (p === parte && ref.current) {
      ref.current.currentTime = seg;
      if (reproducir) void ref.current.play();
    } else {
      pendiente.current = seg;
      setParte(p);
    }
  }
  const pendiente = useRef(0);

  const alCargar = () => {
    const a = ref.current;
    if (!a) return;
    a.playbackRate = vel;
    if (pendiente.current) {
      a.currentTime = pendiente.current;
      pendiente.current = 0;
    }
    if (seguir.current) void a.play();
  };

  const alAvanzar = () => {
    const a = ref.current;
    if (!a) return;
    const ahora = Date.now();
    if (ahora - ultimoGuardado.current > 5000) {
      ultimoGuardado.current = ahora;
      guardar(clave, `${parte}:${Math.floor(a.currentTime)}`);
    }
  };

  const alTerminar = () => {
    if (parte < audios.length - 1) irA(parte + 1, 0, true);
    else {
      guardar(clave, "0:0");
      seguir.current = false;
    }
  };

  const cambiarVel = () => {
    const v = VELOCIDADES[(VELOCIDADES.indexOf(vel) + 1) % VELOCIDADES.length];
    setVel(v);
    guardar("orion-audio-vel", String(v));
  };

  const total = audios.reduce((s, a) => s + (a.duracionSeg ?? 0), 0);
  const actual = audios[parte];

  return (
    <div className="mb-4 rounded-xl border border-orion-gold/50 bg-orion-navy p-4 text-white">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold">🎙️ Escuchá este capítulo</span>
        {duracionLegible(total) && <span className="text-xs text-white/60">· {duracionLegible(total)}</span>}
        <button
          type="button"
          onClick={cambiarVel}
          className="ml-auto rounded-md border border-white/30 px-2 py-0.5 text-xs font-semibold hover:bg-white/10"
          title="Velocidad"
        >
          {String(vel).replace(".", ",")}x
        </button>
      </div>
      {retomar && (
        <p className="mb-2 text-xs text-white/80">
          La última vez quedaste en {audios.length > 1 ? `la parte ${retomar.parte + 1}, ` : ""}minuto{" "}
          {Math.floor(retomar.seg / 60)}.{" "}
          <button
            type="button"
            onClick={() => {
              irA(retomar.parte, retomar.seg, true);
              setRetomar(null);
            }}
            className="font-semibold text-orion-gold underline"
          >
            ▶ Seguir desde ahí
          </button>
        </p>
      )}
      <audio
        ref={ref}
        key={actual.id}
        src={`/api/capacitacion/${documentoId}/audio/${actual.id}`}
        controls
        preload="metadata"
        onLoadedMetadata={alCargar}
        onTimeUpdate={alAvanzar}
        onPlay={() => setRetomar(null)}
        onEnded={alTerminar}
        className="w-full"
      />
      {audios.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {audios.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => irA(i, 0, true)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                i === parte ? "bg-orion-gold text-orion-navy" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Parte {i + 1}
              {duracionLegible(a.duracionSeg) ? ` · ${duracionLegible(a.duracionSeg)}` : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
