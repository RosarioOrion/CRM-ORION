"use client";

import { useEffect, useState } from "react";

export type DatosMarketplace = {
  codigo: string;
  titulo: string;
  operacion: string;
  tipo: string;
  precio: string;
  dormitorios: string;
  banos: string;
  metros: string;
  ubicacion: string;
  descripcion: string;
  fotos: string[];
};

// --- ZIP sin compresión (las fotos ya son JPEG) ---------------------------
const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = TABLA_CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function armarZip(archivos: { nombre: string; datos: Uint8Array }[]): Blob {
  const enc = new TextEncoder();
  const u16 = (v: number) => [v & 255, (v >> 8) & 255];
  const u32 = (v: number) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
  const partes: BlobPart[] = [];
  const central: BlobPart[] = [];
  let offset = 0;
  let tamCentral = 0;
  for (const a of archivos) {
    const nombre = enc.encode(a.nombre);
    const crc = crc32(a.datos);
    const local = new Uint8Array([
      ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
      ...u32(crc), ...u32(a.datos.length), ...u32(a.datos.length), ...u16(nombre.length), ...u16(0),
    ]);
    partes.push(local, nombre, a.datos as BlobPart);
    const cab = new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
      ...u32(crc), ...u32(a.datos.length), ...u32(a.datos.length), ...u16(nombre.length),
      ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset),
    ]);
    central.push(cab, nombre);
    tamCentral += cab.length + nombre.length;
    offset += local.length + nombre.length + a.datos.length;
  }
  const fin = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(archivos.length), ...u16(archivos.length),
    ...u32(tamCentral), ...u32(offset), ...u16(0),
  ]);
  return new Blob([...partes, ...central, fin], { type: "application/zip" });
}

function Campo({ etiqueta, valor, largo }: { etiqueta: string; valor: string; largo?: boolean }) {
  const [copiado, setCopiado] = useState(false);
  if (!valor) return null;
  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sin permiso de portapapeles: el texto igual queda seleccionable.
    }
  }
  return (
    <div className={`rounded-lg border border-gray-200 p-2 dark:border-gray-700 ${largo ? "sm:col-span-2" : ""}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{etiqueta}</span>
        <button
          type="button"
          onClick={copiar}
          className="rounded border border-orion-navy/30 px-2 py-0.5 text-[11px] font-semibold text-orion-navy hover:bg-orion-navy/10 dark:text-orion-gold"
        >
          {copiado ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
      <p className={`select-all text-sm text-gray-800 dark:text-gray-100 ${largo ? "max-h-40 overflow-y-auto whitespace-pre-line" : ""}`}>
        {valor}
      </p>
    </div>
  );
}

/** Todo lo necesario para publicar a mano en Facebook Marketplace, listo para copiar. */
export function PrepararMarketplace({ datos }: { datos: DatosMarketplace }) {
  const [abierto, setAbierto] = useState(false);
  const [bajando, setBajando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // En el celular: las fotos se bajan apenas se abre el panel, así el botón
  // "Guardar en la galería" abre el menú de compartir al instante (el
  // celular solo lo permite justo después de tocar el botón).
  const [archivosCel, setArchivosCel] = useState<File[] | null>(null);
  const [esCelular, setEsCelular] = useState(false);
  const [guardadas, setGuardadas] = useState(false);

  useEffect(() => {
    if (!abierto || archivosCel || datos.fotos.length === 0) return;
    const movil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setEsCelular(movil);
    if (!movil) return;
    let cancelado = false;
    (async () => {
      try {
        const lista: File[] = [];
        for (let i = 0; i < datos.fotos.length; i++) {
          const r = await fetch(datos.fotos[i]);
          if (!r.ok) throw new Error();
          const blob = await r.blob();
          const tipo = blob.type || "image/jpeg";
          const ext = tipo.includes("png") ? "png" : tipo.includes("webp") ? "webp" : "jpg";
          lista.push(new File([blob], `${datos.codigo}-${String(i + 1).padStart(2, "0")}.${ext}`, { type: tipo }));
        }
        if (!cancelado) setArchivosCel(lista);
      } catch {
        if (!cancelado) setError("No se pudieron preparar las fotos. Cerrá y volvé a abrir el panel.");
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [abierto, archivosCel, datos.fotos, datos.codigo]);

  async function guardarEnGaleria() {
    if (!archivosCel) return;
    setError(null);
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: archivosCel })) {
      try {
        await nav.share({ files: archivosCel });
        setGuardadas(true);
      } catch {
        // La persona cerró el menú: no es un error.
      }
      return;
    }
    // Sin menú de compartir: se descargan una por una (quedan en Descargas / galería).
    for (const f of archivosCel) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(f);
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise((r) => setTimeout(r, 400));
    }
    setGuardadas(true);
  }

  async function descargarFotos() {
    setError(null);
    try {
      const archivos: { nombre: string; datos: Uint8Array }[] = [];
      for (let i = 0; i < datos.fotos.length; i++) {
        setBajando(`Preparando fotos… ${i + 1} de ${datos.fotos.length}`);
        const r = await fetch(datos.fotos[i]);
        if (!r.ok) throw new Error();
        const tipo = r.headers.get("content-type") ?? "image/jpeg";
        const ext = tipo.includes("png") ? "png" : tipo.includes("webp") ? "webp" : "jpg";
        archivos.push({
          nombre: `${datos.codigo}-${String(i + 1).padStart(2, "0")}.${ext}`,
          datos: new Uint8Array(await r.arrayBuffer()),
        });
      }
      const zip = armarZip(archivos);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zip);
      a.download = `${datos.codigo}-fotos-marketplace.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    } catch {
      setError("No se pudieron preparar las fotos. Probá de nuevo.");
    } finally {
      setBajando(null);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2 rounded-lg bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
      >
        🛒 {abierto ? "Ocultar datos para Marketplace" : "Preparar para Marketplace"}
      </button>

      {abierto && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            Abrí Marketplace → <b>Crear publicación</b> → <b>Propiedad en venta o alquiler</b> y copiá cada
            dato. Las fotos bajan en el mismo orden que la ficha.
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Campo etiqueta="Venta o alquiler" valor={datos.operacion} />
            <Campo etiqueta="Tipo de propiedad" valor={datos.tipo} />
            <Campo etiqueta="Título" valor={datos.titulo} largo />
            <Campo etiqueta="Precio" valor={datos.precio} />
            <Campo etiqueta="Ubicación" valor={datos.ubicacion} />
            <Campo etiqueta="Dormitorios" valor={datos.dormitorios} />
            <Campo etiqueta="Baños" valor={datos.banos} />
            <Campo etiqueta="Metros cuadrados" valor={datos.metros} />
            <Campo etiqueta="Descripción" valor={datos.descripcion} largo />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {esCelular && datos.fotos.length > 0 && (
              <button
                type="button"
                disabled={!archivosCel}
                onClick={guardarEnGaleria}
                className="rounded-lg bg-orion-gold px-3 py-1.5 text-xs font-semibold text-orion-navy disabled:opacity-60"
              >
                {archivosCel
                  ? `📲 Guardar las ${archivosCel.length} fotos en la galería`
                  : "Preparando fotos para el celular…"}
              </button>
            )}
            {datos.fotos.length > 0 && esCelular ? null : datos.fotos.length > 0 ? (
              <button
                type="button"
                disabled={!!bajando}
                onClick={descargarFotos}
                className="rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {bajando ?? `⬇️ Descargar las ${datos.fotos.length} fotos (.zip)`}
              </button>
            ) : (
              <span className="text-xs text-gray-400">Esta propiedad no tiene fotos.</span>
            )}
            <a
              href="https://www.facebook.com/marketplace/create/rental"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-[#1877F2] underline"
            >
              Abrir Marketplace
            </a>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          {esCelular && (
            <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
              {guardadas
                ? "✓ Listo. En Facebook elegí las fotos desde la galería (quedan en el mismo orden)."
                : "En el menú que se abre tocá “Guardar imágenes” (iPhone) o “Guardar en Fotos / Galería” (Android). También podés compartirlas directo a Facebook."}
            </p>
          )}
          <p className="mt-3 text-[11px] text-gray-400">
            Cuando la publiques, pegá el link en “Publicada en” (más abajo) para que quede registrada.
          </p>
        </div>
      )}
    </div>
  );
}
