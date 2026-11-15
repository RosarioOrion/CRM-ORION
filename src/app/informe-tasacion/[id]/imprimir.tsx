"use client";

export function BotonImprimir() {
  return (
    <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-center gap-3 bg-[#0a1830] px-4 py-3 text-sm text-white">
      <span>Para guardarlo como PDF: Imprimir → destino “Guardar como PDF”.</span>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg bg-[#d4a537] px-4 py-1.5 font-semibold text-[#0a1830] hover:brightness-95"
      >
        🖨️ Imprimir / Guardar PDF
      </button>
      <button type="button" onClick={() => history.back()} className="text-white/70 underline">
        Volver
      </button>
    </div>
  );
}
