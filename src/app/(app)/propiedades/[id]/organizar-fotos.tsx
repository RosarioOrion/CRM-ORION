"use client";

import { useState } from "react";

type Foto = { indice: number; url: string };

/**
 * Organizar las fotos de la propiedad: cambiar el orden (la primera es la
 * portada en Orion, la web y los listados), elegir portada y borrar.
 * Se guarda junto con el resto de la edición: manda el orden en campos
 * ocultos del formulario `formId` ("Guardar cambios").
 * Funciona con botones (celular) y arrastrando (computadora).
 */
export function OrganizarFotos({ formId, fotos }: { formId: string; fotos: Foto[] }) {
  const [orden, setOrden] = useState<Foto[]>(fotos);
  const [borrar, setBorrar] = useState<Set<number>>(new Set());
  const [arrastrando, setArrastrando] = useState<number | null>(null);

  const huboCambios =
    borrar.size > 0 || orden.some((f, i) => f.indice !== fotos[i]?.indice);

  function mover(desde: number, hasta: number) {
    if (hasta < 0 || hasta >= orden.length || desde === hasta) return;
    const nuevo = [...orden];
    const [f] = nuevo.splice(desde, 1);
    nuevo.splice(hasta, 0, f);
    setOrden(nuevo);
  }

  function alternarBorrar(indice: number) {
    const s = new Set(borrar);
    if (s.has(indice)) s.delete(indice);
    else s.add(indice);
    setBorrar(s);
  }

  const btn =
    "flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80 disabled:opacity-30";

  // Primera foto que no se va a borrar = portada.
  const portada = orden.find((f) => !borrar.has(f.indice))?.indice;

  return (
    <div className="mb-3">
      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        La primera foto es la portada. Usá las flechas (o arrastrá) para ordenar, ★ para elegir portada y 🗑 para borrar.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {orden.map((f, pos) => {
          const marcada = borrar.has(f.indice);
          return (
            <div
              key={f.indice}
              draggable
              onDragStart={() => setArrastrando(pos)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (arrastrando !== null) mover(arrastrando, pos);
                setArrastrando(null);
              }}
              className={`relative overflow-hidden rounded-lg border-2 ${
                f.indice === portada ? "border-orion-gold" : "border-transparent"
              } ${arrastrando === pos ? "opacity-50" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.url}
                alt={`Foto ${pos + 1}`}
                loading="lazy"
                className={`h-32 w-full object-cover ${marcada ? "opacity-30 grayscale" : ""}`}
              />
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {f.indice === portada ? "★ Portada" : pos + 1}
              </span>
              {marcada && (
                <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs font-bold text-red-700">
                  Se borrará
                </span>
              )}
              <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                <div className="flex gap-1">
                  <button type="button" title="Mover antes" className={btn} disabled={pos === 0} onClick={() => mover(pos, pos - 1)}>
                    ◀
                  </button>
                  <button
                    type="button"
                    title="Mover después"
                    className={btn}
                    disabled={pos === orden.length - 1}
                    onClick={() => mover(pos, pos + 1)}
                  >
                    ▶
                  </button>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    title="Usar como portada"
                    className={btn}
                    disabled={pos === 0 || marcada}
                    onClick={() => mover(pos, 0)}
                  >
                    ★
                  </button>
                  <button
                    type="button"
                    title={marcada ? "No borrar" : "Borrar foto"}
                    className={`${btn} ${marcada ? "!bg-red-600" : ""}`}
                    onClick={() => alternarBorrar(f.indice)}
                  >
                    {marcada ? "↩" : "🗑"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <input
        type="hidden"
        form={formId}
        name="ordenFotos"
        value={JSON.stringify(orden.filter((f) => !borrar.has(f.indice)).map((f) => f.indice))}
      />
      <input type="hidden" form={formId} name="totalFotos" value={fotos.length} />
      {huboCambios && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
          Cambios en las fotos sin guardar{borrar.size ? ` · ${borrar.size} para borrar` : ""} — se guardan con
          “Guardar cambios”, abajo.
        </p>
      )}
    </div>
  );
}
