"use client";

import { useState } from "react";

// Barra del informe: descargar el PDF directo o imprimir.
// El PDF se arma en el navegador: cada bloque marcado con data-pdf se
// convierte en imagen y se acomoda en hojas A4 sin cortarlo por la mitad.

const A4 = { ancho: 210, alto: 297 };
const MARGEN = 12;

export function BotonImprimir({ nombreArchivo }: { nombreArchivo: string }) {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  async function descargar() {
    setError("");
    setGenerando(true);
    try {
      const [{ toCanvas }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
      const bloques = Array.from(document.querySelectorAll<HTMLElement>("[data-pdf]"));
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const anchoUtil = A4.ancho - MARGEN * 2;
      const altoUtil = A4.alto - MARGEN * 2;
      let y = MARGEN;
      let primera = true;
      for (const el of bloques) {
        const original = await toCanvas(el, { pixelRatio: 2, cacheBust: true });
        // Fondo blanco debajo (las esquinas redondeadas quedan transparentes y en JPEG saldrían negras),
        // sin pisar el fondo propio del bloque (la portada azul).
        const canvas = document.createElement("canvas");
        canvas.width = original.width;
        canvas.height = original.height;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(original, 0, 0);
        let ancho = anchoUtil;
        let alto = (canvas.height / canvas.width) * ancho;
        if (alto > altoUtil) {
          // Bloque más alto que una hoja: se achica para que entre.
          ancho = (altoUtil / alto) * ancho;
          alto = altoUtil;
        }
        const nuevaHoja = el.dataset.pdf === "salto" && !primera;
        if (nuevaHoja || y + alto > A4.alto - MARGEN) {
          pdf.addPage();
          y = MARGEN;
        }
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", MARGEN + (anchoUtil - ancho) / 2, y, ancho, alto);
        y += alto + 5;
        primera = false;
      }
      // Descarga con el nombre de la propiedad.
      const url = URL.createObjectURL(pdf.output("blob"));
      const a = document.createElement("a");
      a.href = url;
      // Sin tildes ni símbolos: algunos navegadores descartan el nombre si los tiene.
      a.download = `${nombreArchivo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w .-]/g, "").trim() || "Tasacion"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      console.error(e);
      setError("No se pudo armar el PDF. Probá con Imprimir → Guardar como PDF.");
    } finally {
      setGenerando(false);
    }
  }

  const boton = "rounded-lg px-4 py-1.5 font-semibold disabled:opacity-60";
  return (
    <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-center gap-3 bg-[#0a1830] px-4 py-3 text-sm text-white">
      <button type="button" onClick={descargar} disabled={generando} className={`${boton} bg-[#d4a537] text-[#0a1830] hover:brightness-95`}>
        {generando ? "Armando el PDF…" : "⬇️ Descargar PDF"}
      </button>
      <button type="button" onClick={() => window.print()} className={`${boton} border border-white/40 text-white hover:bg-white/10`}>
        🖨️ Imprimir
      </button>
      <button type="button" onClick={() => history.back()} className="text-white/70 underline">
        Volver
      </button>
      {error && <span className="w-full text-center text-xs text-red-300">{error}</span>}
    </div>
  );
}
