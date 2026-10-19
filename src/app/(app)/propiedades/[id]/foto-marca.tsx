"use client";

import { useState } from "react";

const FORMATOS = [
  { clave: "cuadrado", label: "Cuadrado", uso: "Feed · 1080×1080", aspecto: "aspect-square" },
  { clave: "vertical", label: "Vertical", uso: "Historias · 1080×1920", aspecto: "aspect-[9/16]" },
  { clave: "horizontal", label: "Horizontal", uso: "Mail / informe · 1200×630", aspecto: "aspect-[40/21]" },
] as const;

// Foto principal con la marca de Orion en los tres tamaños. La imagen se
// genera en el momento, así que siempre tiene el precio y los datos actuales.
// `version` cambia cuando cambian esos datos, para no mostrar una vieja.
export function FotoMarca({ propiedadId, version }: { propiedadId: string; version: string }) {
  const [copiado, setCopiado] = useState<string | null>(null);

  async function copiarLink(clave: string) {
    const url = `${window.location.origin}/api/foto-marca/${propiedadId}/${clave}?v=${version}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copiá el link:", url);
    }
    setCopiado(clave);
    setTimeout(() => setCopiado(null), 2000);
  }

  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-orion-navy dark:text-white">📸 Foto con marca</p>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Foto principal con logo, precio y datos. Sin teléfono ni mail, para que los portales no bajen el
        aviso. Si cambiás el precio, se actualiza sola.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {FORMATOS.map((f) => {
          const src = `/api/foto-marca/${propiedadId}/${f.clave}?v=${version}`;
          return (
            <div key={f.clave} className="flex flex-col gap-2">
              <a href={src} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Foto con marca – ${f.label}`}
                  loading="lazy"
                  className={`${f.aspecto} ${
                    f.clave === "vertical" ? "mx-auto h-72 w-auto" : "w-full"
                  } rounded-lg border border-gray-200 bg-gray-100 object-cover dark:border-gray-700 dark:bg-gray-900`}
                />
              </a>
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{f.label}</p>
                <p className="text-[11px] text-gray-400">{f.uso}</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`${src}&descargar=1`}
                  className="flex-1 rounded-lg bg-orion-navy px-3 py-1.5 text-center text-xs font-semibold text-white"
                >
                  Descargar
                </a>
                <button
                  type="button"
                  onClick={() => copiarLink(f.clave)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200"
                >
                  {copiado === f.clave ? "¡Copiado!" : "Copiar link"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
