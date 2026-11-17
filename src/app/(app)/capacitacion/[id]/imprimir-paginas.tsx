"use client";

import { useState } from "react";
import { leerRango, rangoLegible, type SeccionImprimible } from "@/lib/paginas-imprimibles";

// "🖨️ Imprimir": imprime solo algunas páginas del PDF (los ejercicios, la
// autoevaluación, el checklist o las que elija cada uno), sin imprimir el
// capítulo entero. Orion dibuja esas páginas en alta resolución y abre el
// cuadro de impresión del navegador (o "Guardar como PDF").

const DPI_ANCHO = 1650; // ~200 dpi en A4

export function ImprimirPaginas({
  url,
  titulo,
  totalPaginas,
  secciones,
}: {
  url: string;
  titulo: string;
  totalPaginas: number | null;
  secciones: SeccionImprimible[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [elegidas, setElegidas] = useState<string[]>(() => secciones.map((s) => s.clave));
  const [otras, setOtras] = useState("");
  const [estado, setEstado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = totalPaginas ?? 999;
  const paginas = [
    ...new Set([
      ...secciones.filter((s) => elegidas.includes(s.clave)).flatMap((s) => s.paginas),
      ...leerRango(otras, total),
    ]),
  ].sort((a, b) => a - b);

  async function imprimir() {
    setError(null);
    if (!paginas.length) {
      setError("Elegí qué imprimir.");
      return;
    }
    setEstado("Preparando…");
    const urls: string[] = [];
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      const tarea = pdfjs.getDocument({ url });
      const doc = await tarea.promise;
      try {
        for (const [i, n] of paginas.filter((n) => n <= doc.numPages).entries()) {
          setEstado(`Preparando página ${i + 1} de ${paginas.length}…`);
          const p = await doc.getPage(n);
          const base = p.getViewport({ scale: 1 });
          const vp = p.getViewport({ scale: DPI_ANCHO / base.width });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(vp.width);
          canvas.height = Math.floor(vp.height);
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await p.render({ canvasContext: ctx, canvas, viewport: vp }).promise;
          const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
          if (blob) urls.push(URL.createObjectURL(blob));
          p.cleanup();
        }
      } finally {
        await tarea.destroy();
      }
      if (!urls.length) throw new Error("sin páginas");

      // Se imprime desde un marco oculto: solo esas páginas, una por hoja.
      const marco = document.createElement("iframe");
      marco.setAttribute("aria-hidden", "true");
      marco.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
      document.body.appendChild(marco);
      const d = marco.contentDocument!;
      const t = titulo.replace(/[<>&"]/g, "");
      d.open();
      d.write(`<!doctype html><html><head><meta charset="utf-8"><title>${t}</title><style>
        @page { size: A4; margin: 0; }
        html, body { margin: 0; padding: 0; background: #fff; }
        img { display: block; width: 210mm; height: 297mm; object-fit: contain; break-after: page; page-break-after: always; }
        img:last-child { break-after: auto; page-break-after: auto; }
      </style></head><body>${urls.map((u) => `<img src="${u}">`).join("")}</body></html>`);
      d.close();
      await Promise.all(
        [...d.images].map((img) => (img.complete ? Promise.resolve() : new Promise((r) => (img.onload = img.onerror = r))))
      );
      const limpiar = () => {
        marco.remove();
        urls.forEach((u) => URL.revokeObjectURL(u));
      };
      marco.contentWindow!.addEventListener("afterprint", () => setTimeout(limpiar, 500));
      setTimeout(limpiar, 10 * 60_000);
      setEstado(null);
      marco.contentWindow!.focus();
      marco.contentWindow!.print();
    } catch {
      urls.forEach((u) => URL.revokeObjectURL(u));
      setEstado(null);
      setError("No se pudo preparar la impresión. Probá de nuevo.");
    }
  }

  const boton =
    "rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-orion-navy transition hover:border-orion-navy dark:border-gray-600 dark:text-white";

  return (
    <div className="relative">
      <button type="button" onClick={() => setAbierto((v) => !v)} className={boton}>
        🖨️ Imprimir{secciones.some((s) => s.clave === "ejercicios") ? " ejercicios" : ""}
      </button>
      {abierto && (
        <div className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-2 font-bold text-orion-navy dark:text-white">¿Qué querés imprimir?</p>
          {secciones.length > 0 ? (
            <div className="mb-3 flex flex-col gap-1.5">
              {secciones.map((s) => (
                <label key={s.clave} className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={elegidas.includes(s.clave)}
                    onChange={(e) =>
                      setElegidas((v) => (e.target.checked ? [...v, s.clave] : v.filter((x) => x !== s.clave)))
                    }
                  />
                  {s.nombre}
                  <span className="text-xs text-gray-400">
                    pág. {rangoLegible(s.paginas)}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="mb-3 text-xs text-gray-500">
              No encontré ejercicios marcados en este material. Elegí las páginas a mano.
            </p>
          )}
          <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            {secciones.length ? "Otras páginas (opcional)" : "Páginas"}
            <input
              value={otras}
              onChange={(e) => setOtras(e.target.value)}
              placeholder={totalPaginas ? `ej. 3, 8-9 (de 1 a ${totalPaginas})` : "ej. 3, 8-9"}
              className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </label>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {paginas.length
              ? `Se imprimen ${paginas.length} hoja(s): pág. ${rangoLegible(paginas)}.`
              : "Todavía no elegiste páginas."}
          </p>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={imprimir}
              disabled={!!estado || !paginas.length}
              className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white hover:bg-orion-navy-light disabled:opacity-50"
            >
              {estado ?? "🖨️ Imprimir"}
            </button>
            <button type="button" onClick={() => setAbierto(false)} className="text-xs text-gray-500 hover:underline">
              Cerrar
            </button>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            Se abre el cuadro de impresión de la computadora. Ahí también podés elegir “Guardar como PDF”.
          </p>
        </div>
      )}
    </div>
  );
}
