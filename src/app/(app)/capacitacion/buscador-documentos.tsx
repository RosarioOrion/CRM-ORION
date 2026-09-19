"use client";

import { useMemo, useState } from "react";
import { EliminarDocumentoBoton } from "./eliminar-documento-boton";

type Documento = {
  id: string;
  titulo: string;
  descripcion: string | null;
  archivo: string | null;
  archivoNombre: string | null;
  archivoPesoBytes: number | null;
  link: string | null;
  paginas: number | null;
  creadoEn: string;
  subidoPorNombre: string;
};

function pesoLegible(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BuscadorDocumentos({
  admin,
  documentos,
}: {
  admin: boolean;
  documentos: Documento[];
}) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return documentos;
    return documentos.filter((d) =>
      `${d.titulo} ${d.descripcion ?? ""}`.toLowerCase().includes(q)
    );
  }, [busqueda, documentos]);

  return (
    <div>
      <div className="mb-2">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por título o descripción…"
          className="w-full max-w-md rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
        />
        <p className="mt-1 text-xs text-gray-400">
          Búsqueda por palabra clave. El buscador inteligente con IA (preguntar
          en lenguaje natural) todavía no está disponible.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {filtrados.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:bg-gray-800 dark:border-gray-700">
            {documentos.length === 0
              ? "Todavía no hay documentos de capacitación."
              : "No hay documentos que coincidan con la búsqueda."}
          </p>
        ) : (
          filtrados.map((d) => {
            const peso = pesoLegible(d.archivoPesoBytes);
            return (
              <div
                key={d.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-orion-navy dark:text-white">
                      {d.titulo}
                    </p>
                    {d.descripcion && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
                        {d.descripcion}
                      </p>
                    )}
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                      <span>{d.subidoPorNombre}</span>
                      <span>·</span>
                      <span>
                        {new Date(d.creadoEn).toLocaleDateString("es-UY", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                      {d.paginas ? (
                        <>
                          <span>·</span>
                          <span>{d.paginas} pág.</span>
                        </>
                      ) : null}
                      {peso ? (
                        <>
                          <span>·</span>
                          <span>{peso}</span>
                        </>
                      ) : null}
                    </p>
                    <div className="mt-2">
                      {d.archivo ? (
                        <a
                          href={d.archivo}
                          download={d.archivoNombre ?? `${d.titulo}.pdf`}
                          className="text-sm text-orion-navy hover:underline dark:text-orion-gold"
                        >
                          ⬇ Descargar PDF
                        </a>
                      ) : d.link ? (
                        <a
                          href={d.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-orion-navy hover:underline dark:text-orion-gold"
                        >
                          🔗 Abrir link
                        </a>
                      ) : null}
                    </div>
                  </div>
                  {admin && <EliminarDocumentoBoton documentoId={d.id} />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
