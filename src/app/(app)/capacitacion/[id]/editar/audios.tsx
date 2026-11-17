"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AUDIO_MAX_BYTES,
  AUDIO_TROZO_BYTES,
  duracionLegible,
  type AudioCapitulo,
} from "@/lib/capacitacion-audio-tipos";

// "🎙️ Audio del capítulo" (solo la CEO): subir la grabación (una o varias
// partes), ver cuánto dura y borrarla. Se sube de a pedazos de 4 MB.

const MB = 1024 * 1024;

function duracionDe(archivo: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(archivo);
    const a = new Audio();
    const listo = (v: number | null) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    a.preload = "metadata";
    a.onloadedmetadata = () => listo(Number.isFinite(a.duration) ? a.duration : null);
    a.onerror = () => listo(null);
    setTimeout(() => listo(null), 8000);
    a.src = url;
  });
}

export function AudiosCapitulo({ documentoId, audios }: { documentoId: string; audios: AudioCapitulo[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progreso, setProgreso] = useState<{ nombre: string; pct: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subir(archivo: File) {
    setError(null);
    if (archivo.size > AUDIO_MAX_BYTES) {
      setError(
        `“${archivo.name}” pesa ${(archivo.size / MB).toFixed(0)} MB y el máximo es ${AUDIO_MAX_BYTES / MB} MB. ` +
          "Grabalo en calidad normal (no alta) o dividilo en partes."
      );
      return;
    }
    setProgreso({ nombre: archivo.name, pct: 0 });
    try {
      const duracionSeg = await duracionDe(archivo);
      const r = await fetch(`/api/capacitacion/${documentoId}/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: archivo.name, mime: archivo.type || "audio/mpeg", peso: archivo.size, duracionSeg }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo empezar la subida.");
      const base = `/api/capacitacion/${documentoId}/audio/${j.audioId}`;
      for (let desde = 0; desde < archivo.size; desde += AUDIO_TROZO_BYTES) {
        const trozo = archivo.slice(desde, desde + AUDIO_TROZO_BYTES);
        let intento = 0;
        for (;;) {
          const rt = await fetch(`${base}?desde=${desde}`, { method: "PUT", body: trozo }).catch(() => null);
          if (rt?.ok) break;
          if (++intento >= 3) {
            const jt = rt ? await rt.json().catch(() => ({})) : {};
            throw new Error(jt.error || "Se cortó la conexión. Probá de nuevo.");
          }
          await new Promise((res) => setTimeout(res, 1500 * intento));
        }
        setProgreso({ nombre: archivo.name, pct: Math.round((Math.min(archivo.size, desde + AUDIO_TROZO_BYTES) / archivo.size) * 100) });
      }
      const rf = await fetch(`${base}?fin=1`, { method: "PUT" });
      if (!rf.ok) throw new Error((await rf.json().catch(() => ({}))).error || "No se pudo terminar la subida.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el audio.");
    } finally {
      setProgreso(null);
    }
  }

  async function subirVarios(archivos: FileList | null) {
    if (!archivos) return;
    // Varias partes juntas: en orden de nombre ("parte 1", "parte 2"…).
    const lista = [...archivos].sort((a, b) => a.name.localeCompare(b.name, "es", { numeric: true }));
    for (const a of lista) await subir(a);
    if (input.current) input.current.value = "";
  }

  async function borrar(a: AudioCapitulo) {
    if (!window.confirm(`¿Borrar el audio “${a.nombre}”?`)) return;
    await fetch(`/api/capacitacion/${documentoId}/audio/${a.id}`, { method: "DELETE" });
    router.refresh();
  }

  const total = audios.reduce((s, a) => s + (a.duracionSeg ?? 0), 0);

  return (
    <div id="audio" className="mt-6 flex scroll-mt-6 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div>
        <h2 className="text-base font-bold text-orion-navy dark:text-white">🎙️ Audio del capítulo</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Subí tu grabación (.m4a, .mp3, .ogg…). Lo ideal es un audio por capítulo; si es muy largo, podés subirlo en
          varias partes y se escuchan seguidas. Máximo {AUDIO_MAX_BYTES / MB} MB por archivo.
        </p>
      </div>

      {audios.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100 dark:divide-gray-700 dark:border-gray-700">
          {audios.map((a, i) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <span className="font-semibold text-orion-navy dark:text-white">
                {audios.length > 1 ? `Parte ${i + 1}` : "Audio"}
              </span>
              <span className="min-w-0 flex-1 truncate text-gray-600 dark:text-gray-300">{a.nombre}</span>
              <span className="text-xs text-gray-400">
                {[duracionLegible(a.duracionSeg), `${(a.peso / MB).toFixed(1)} MB`].filter(Boolean).join(" · ")}
              </span>
              <audio controls preload="none" src={`/api/capacitacion/${documentoId}/audio/${a.id}`} className="h-8 w-full sm:w-64" />
              <button type="button" onClick={() => borrar(a)} className="text-xs text-gray-400 hover:text-red-600">
                Borrar
              </button>
            </li>
          ))}
        </ul>
      )}
      {audios.length > 1 && total > 0 && <p className="text-xs text-gray-400">Duración total: {duracionLegible(total)}</p>}

      {progreso ? (
        <div className="text-sm text-gray-600 dark:text-gray-300">
          Subiendo “{progreso.nombre}”… {progreso.pct}%
          <div className="mt-1 h-2 rounded bg-gray-100 dark:bg-gray-700">
            <div className="h-2 rounded bg-orion-gold transition-all" style={{ width: `${progreso.pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-gray-400">No cierres esta página hasta que termine.</p>
        </div>
      ) : (
        <label className="self-start cursor-pointer rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white hover:bg-orion-navy-light">
          {audios.length ? "+ Agregar otra parte" : "⬆️ Subir audio"}
          <input
            ref={input}
            type="file"
            accept="audio/*,.m4a,.mp3,.ogg,.opus,.aac,.wav,.amr"
            multiple
            className="hidden"
            onChange={(e) => subirVarios(e.target.files)}
          />
        </label>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
