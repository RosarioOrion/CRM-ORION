"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

// Visor de PDF propio: Orion dibuja cada página en la pantalla (con pdf.js),
// así el documento se lee DENTRO del CRM en compu y celular, en vez de que
// el navegador lo descargue o lo abra como un archivo aparte.

const ZOOMS = [0.75, 1, 1.25, 1.5, 2, 2.5];

export function VisorPdf({ url, titulo }: { url: string; titulo: string }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [completo, setCompleto] = useState(false);
  const [ancho, setAncho] = useState(0);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelado = false;
    let tarea: { destroy: () => Promise<void> } | null = null;
    (async () => {
      // La versión "legacy" funciona también en celulares viejos.
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      const t = pdfjs.getDocument({ url });
      tarea = t;
      const d = await t.promise;
      if (!cancelado) setDoc(d);
    })().catch(() => {
      if (!cancelado) setError(true);
    });
    return () => {
      cancelado = true;
      tarea?.destroy();
    };
  }, [url]);

  // Ancho disponible: las páginas se dibujan a ese ancho (× zoom).
  useEffect(() => {
    if (!scroller) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.floor(e.contentRect.width)));
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [scroller]);

  // Esc cierra la pantalla completa.
  useEffect(() => {
    if (!completo) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCompleto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [completo]);

  const i = ZOOMS.indexOf(zoom);
  const botonBarra =
    "rounded-md px-2.5 py-1 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-40";

  return (
    <div
      className={
        completo
          ? "fixed inset-0 z-50 flex flex-col bg-gray-800"
          : "flex h-[80vh] flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-800 dark:border-gray-700"
      }
    >
      <div className="flex items-center gap-1 bg-gray-900 px-2 py-1.5 text-white">
        <p className="min-w-0 flex-1 truncate px-1 text-xs text-gray-300">
          {completo ? titulo : doc ? `${doc.numPages} página(s)` : ""}
        </p>
        <button type="button" className={botonBarra} onClick={() => setZoom(ZOOMS[i - 1])} disabled={i <= 0} aria-label="Achicar">
          −
        </button>
        <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
        <button type="button" className={botonBarra} onClick={() => setZoom(ZOOMS[i + 1])} disabled={i >= ZOOMS.length - 1} aria-label="Agrandar">
          +
        </button>
        <button type="button" className={`${botonBarra} ml-1`} onClick={() => setCompleto(!completo)}>
          {completo ? "✕ Cerrar" : "⛶ Pantalla completa"}
        </button>
      </div>

      <div
        ref={setScroller}
        className="flex-1 overflow-auto p-2 sm:p-4"
        onContextMenu={(e) => e.preventDefault()}
      >
        {error ? (
          <p className="p-6 text-center text-sm text-gray-300">No se pudo abrir el documento. Probá recargar la página.</p>
        ) : !doc || !ancho ? (
          <p className="p-6 text-center text-sm text-gray-300">Abriendo documento…</p>
        ) : (
          <div className="mx-auto flex w-max flex-col items-center gap-3">
            {Array.from({ length: doc.numPages }, (_, n) => (
              <PaginaPdf
                key={n}
                doc={doc}
                numero={n + 1}
                // Restamos el padding para que al 100% entre justo.
                ancho={Math.max(200, Math.min(ancho - 8, 1000)) * zoom}
                root={scroller}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Una página: se dibuja solo cuando está cerca de la pantalla (ahorra memoria en el celu). */
function PaginaPdf({
  doc,
  numero,
  ancho,
  root,
}: {
  doc: PDFDocumentProxy;
  numero: number;
  ancho: number;
  root: HTMLElement | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(numero <= 2);
  const [proporcion, setProporcion] = useState(1.414); // alto/ancho (A4 hasta saberlo)

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      root,
      rootMargin: "1200px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!visible) {
      // Lejos de la pantalla: se libera la memoria del dibujo.
      canvas.width = 0;
      canvas.height = 0;
      return;
    }
    let tarea: RenderTask | null = null;
    let cancelado = false;
    doc.getPage(numero).then((pagina) => {
      if (cancelado) return;
      const base = pagina.getViewport({ scale: 1 });
      setProporcion(base.height / base.width);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = pagina.getViewport({ scale: (ancho / base.width) * dpr });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      tarea = pagina.render({ canvas, viewport });
      tarea.promise.catch(() => {}); // cancelado por zoom o scroll
    });
    return () => {
      cancelado = true;
      tarea?.cancel();
    };
  }, [doc, numero, ancho, visible]);

  return (
    <div
      ref={ref}
      className="bg-white shadow-lg"
      style={{ width: ancho, height: Math.round(ancho * proporcion) }}
    >
      <canvas ref={canvasRef} className="block h-full w-full select-none" />
    </div>
  );
}
