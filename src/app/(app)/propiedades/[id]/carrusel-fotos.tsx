"use client";

import { useRef, useState } from "react";

/** Foto principal con flechas (y deslizar en el celular) + miniaturas. */
export function CarruselFotos({ fotos }: { fotos: string[] }) {
  const [i, setI] = useState(0);
  const toque = useRef<number | null>(null);

  if (fotos.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-400 dark:bg-gray-900">
        Sin fotos cargadas
      </div>
    );
  }

  const ir = (n: number) => setI((n + fotos.length) % fotos.length);
  const flecha =
    "absolute top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl text-white transition hover:bg-black/70";

  return (
    <div>
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") ir(i - 1);
          if (e.key === "ArrowRight") ir(i + 1);
        }}
        onTouchStart={(e) => (toque.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (toque.current === null) return;
          const dx = e.changedTouches[0].clientX - toque.current;
          if (Math.abs(dx) > 40) ir(dx < 0 ? i + 1 : i - 1);
          toque.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fotos[i]} alt={`Foto ${i + 1}`} className="h-full w-full object-contain" />
        {fotos.length > 1 && (
          <>
            <button type="button" aria-label="Foto anterior" onClick={() => ir(i - 1)} className={`${flecha} left-2`}>
              ‹
            </button>
            <button type="button" aria-label="Foto siguiente" onClick={() => ir(i + 1)} className={`${flecha} right-2`}>
              ›
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
              {i + 1} / {fotos.length}
            </span>
          </>
        )}
      </div>
      {fotos.length > 1 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {fotos.map((f, n) => (
            <button
              key={f}
              type="button"
              onClick={() => setI(n)}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 ${
                n === i ? "border-orion-gold" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f} alt={`Miniatura ${n + 1}`} loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
