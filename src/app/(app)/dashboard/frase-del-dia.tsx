import Link from "next/link";
import { etiquetaCategoria, type Frase } from "@/lib/frase-del-dia";

/** Tarjeta "Frase del día" del Inicio. */
export function FraseDelDia({ frase, esCeo }: { frase: Frase; esCeo: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-orion-navy p-5 text-white shadow-sm">
      <div className="pointer-events-none absolute -right-6 -top-6 text-8xl opacity-10">✨</div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orion-gold">✨ Frase del día</p>
      <p className="mt-2 font-serif text-lg italic leading-snug sm:text-xl">“{frase.texto}”</p>
      {frase.autor && (
        <p className="mt-1 text-sm text-white/80">
          — <span className="font-semibold">{frase.autor}</span>
          {frase.obra && <span className="italic">, {frase.obra}</span>}
        </p>
      )}
      {frase.accion && (
        <p className="mt-3 text-sm text-white/85">
          <span className="font-semibold text-orion-gold">🎯 Acción de hoy:</span> {frase.accion}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        {frase.fuente ? (
          <Link href={frase.fuente.href} className="font-semibold text-orion-gold hover:underline">
            📖 {frase.fuente.nombre} →
          </Link>
        ) : etiquetaCategoria(frase.categoria) ? (
          <span className="text-white/60">{etiquetaCategoria(frase.categoria)}</span>
        ) : (
          <span />
        )}
        {esCeo && (
          <Link href="/capacitacion/frases" className="text-white/60 hover:text-white hover:underline">
            ✏️ Frases
          </Link>
        )}
      </div>
    </div>
  );
}
