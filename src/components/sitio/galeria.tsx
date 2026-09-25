"use client";

import { useState } from "react";

/** Galería de fotos de la ficha pública: foto grande, flechas y miniaturas. */
export function Galeria({ urls, alt, tipo }: { urls: string[]; alt: string; tipo: string }) {
  const [i, setI] = useState(0);

  if (urls.length === 0) {
    return (
      <div className="flex aspect-[16/10] w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[#16295c] to-[#0f1f45] text-white/70">
        <span className="text-5xl">🏠</span>
        <span className="mt-2 text-xs uppercase tracking-widest">{tipo}</span>
        <span className="mt-1 text-xs">Fotos próximamente</span>
      </div>
    );
  }

  const ir = (d: number) => setI((prev) => (prev + d + urls.length) % urls.length);

  return (
    <div>
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[i]} alt={`${alt} — foto ${i + 1}`} className="h-full w-full object-contain" />
        {urls.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => ir(-1)}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-orion-navy shadow hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => ir(1)}
              aria-label="Foto siguiente"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-orion-navy shadow hover:bg-white"
            >
              ›
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
              {i + 1} / {urls.length}
            </span>
          </>
        )}
      </div>

      {urls.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {urls.map((u, n) => (
            <button
              key={u}
              type="button"
              onClick={() => setI(n)}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                n === i ? "ring-orion-gold" : "ring-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
