import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documentosCapacitacion, usuarios } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";
import { bloqueLabel, nombreMaterial } from "@/lib/manual-indice";
import { fechaCorta, pesoLegible, visorDeLink } from "@/lib/capacitacion";
import { VisorPdf } from "./visor-pdf";
import { asegurarColumnaTipo } from "../datos";

export default async function VerMaterialPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pagina?: string; q?: string }>;
}) {
  const { pagina: paginaParam, q } = await searchParams;
  const pagina = Number(paginaParam) > 0 ? Math.floor(Number(paginaParam)) : undefined;
  const sesion = await obtenerSesion();
  if (!sesion) notFound();
  const { id } = await params;
  await asegurarColumnaTipo();

  const [d] = await db
    .select({
      tipo: documentosCapacitacion.tipo,
      titulo: documentosCapacitacion.titulo,
      descripcion: documentosCapacitacion.descripcion,
      archivoNombre: documentosCapacitacion.archivoNombre,
      archivoPesoBytes: documentosCapacitacion.archivoPesoBytes,
      link: documentosCapacitacion.link,
      paginas: documentosCapacitacion.paginas,
      clase: documentosCapacitacion.clase,
      numero: documentosCapacitacion.numero,
      bloque: documentosCapacitacion.bloque,
      creadoEn: documentosCapacitacion.creadoEn,
      subidoPorNombre: usuarios.nombre,
    })
    .from(documentosCapacitacion)
    .innerJoin(usuarios, eq(documentosCapacitacion.subidoPorId, usuarios.id))
    .where(eq(documentosCapacitacion.id, id));
  if (!d) notFound();

  const esVideo = d.tipo === "VIDEO";
  // PDF subido a Orion → se sirve desde /api/capacitacion; si no, el link.
  const pdfPropio = d.archivoNombre ? `/api/capacitacion/${id}` : null;
  const visor = !pdfPropio && d.link ? visorDeLink(d.link) : null;
  const peso = pesoLegible(d.archivoPesoBytes);
  const boton =
    "rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-orion-navy transition hover:border-orion-navy dark:border-gray-600 dark:text-white";

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/capacitacion"
        className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold"
      >
        ← Volver a Capacitación
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-orion-navy dark:text-white">
            {esVideo ? "🎬" : "📄"} {nombreMaterial(d.clase, d.numero, d.titulo)}
          </h1>
          {bloqueLabel(d.bloque) && <p className="text-xs font-semibold text-orion-gold">{bloqueLabel(d.bloque)}</p>}
          <p className="mt-1 text-xs text-gray-400">
            {d.subidoPorNombre} · {fechaCorta(d.creadoEn.toISOString())}
            {d.paginas ? ` · ${d.paginas} pág.` : ""}
            {peso ? ` · ${peso}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {esCEO(sesion.rol) && (
            <Link href={`/capacitacion/${id}/editar`} className={boton}>
              ✏️ Editar
            </Link>
          )}
          {!pdfPropio && d.link && !visor && (
            <a href={d.link} target="_blank" rel="noopener noreferrer" className={boton}>
              🔗 Abrir en otra pestaña
            </a>
          )}
        </div>
      </div>

      {d.descripcion && (
        <p className="mb-4 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
          {d.descripcion}
        </p>
      )}

      {pdfPropio ? (
        <>
          {pagina && (
            <p className="mb-2 rounded-lg bg-orion-gold/15 px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
              🔎 {q ? <>“<strong>{q}</strong>” aparece en la </> : "Abriste la "}página <strong>{pagina}</strong> (marcada en dorado).{" "}
              {q && (
                <Link href={`/capacitacion?q=${encodeURIComponent(q)}`} className="font-semibold text-orion-navy hover:underline dark:text-orion-gold">
                  ← Volver a los resultados
                </Link>
              )}
            </p>
          )}
          <VisorPdf url={pdfPropio} titulo={d.titulo} paginaInicial={pagina} />
        </>
      ) : visor?.tipo === "video" ? (
        <video
          src={visor.src}
          controls
          controlsList="nodownload"
          className="w-full rounded-xl bg-black"
        />
      ) : visor?.tipo === "iframe" ? (
        <div
          className={`overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900 ${
            esVideo ? "aspect-video" : "h-[80vh]"
          }`}
        >
          <iframe
            src={visor.src}
            title={d.titulo}
            className="h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800">
          Este material no se puede mostrar dentro de Orion.
          {d.link && (
            <>
              {" "}
              <a
                href={d.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-orion-navy hover:underline dark:text-orion-gold"
              >
                Abrilo acá
              </a>
              .
            </>
          )}
        </div>
      )}
    </div>
  );
}
