import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { contactos, propiedades } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { ORIGEN_LABEL } from "@/lib/contactos";
import { limpiarTitulo } from "@/lib/propiedades";
import { CambiarCategoria } from "./cambiar-categoria";
import { AccionesContacto } from "./acciones-contacto";
import { FormularioDetalles } from "./formulario-detalles";

function soloDigitos(telefono: string) {
  return telefono.replace(/[^\d]/g, "");
}

export default async function ContactoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sesion = await obtenerSesion();
  if (!sesion) notFound();

  const [contacto] = await db.select().from(contactos).where(eq(contactos.id, id));

  if (!contacto || contacto.agenteId !== sesion.userId) notFound();

  const propiedadesDelContacto = await db
    .select({
      id: propiedades.id,
      codigo: propiedades.codigo,
      titulo: propiedades.titulo,
    })
    .from(propiedades)
    .where(eq(propiedades.duenoId, contacto.id));

  const inicial = contacto.nombre.trim().charAt(0).toUpperCase() || "?";
  const whatsappHref = contacto.telefono
    ? `https://wa.me/${soloDigitos(contacto.telefono)}`
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/contactos"
        className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold"
      >
        ← Volver a Contactos
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orion-navy text-xl font-bold text-white dark:bg-orion-gold dark:text-orion-navy">
              {inicial}
            </div>
            <div>
              <h1 className="text-xl font-bold text-orion-navy dark:text-white">
                {contacto.nombre}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <CambiarCategoria contactoId={contacto.id} categoriaActual={contacto.categoria} />
                {contacto.archivado && (
                  <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    Archivado
                  </span>
                )}
              </div>
            </div>
          </div>

          <AccionesContacto contactoId={contacto.id} archivado={contacto.archivado} />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Teléfono
            </p>
            {contacto.telefono ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-700 dark:text-gray-200">{contacto.telefono}</p>
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300"
                  >
                    Abrir WhatsApp
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">—</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Email</p>
            <p className="text-sm text-gray-700 dark:text-gray-200">{contacto.email || "—"}</p>
          </div>
        </div>

        {propiedadesDelContacto.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Propiedades a su nombre
            </p>
            <div className="flex flex-col gap-1">
              {propiedadesDelContacto.map((p) => (
                <Link
                  key={p.id}
                  href={`/propiedades/${p.id}`}
                  className="text-sm text-orion-navy hover:underline dark:text-orion-gold"
                >
                  {p.codigo} — {limpiarTitulo(p.titulo)}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Origen y notas
          </p>
          <p className="mb-3 text-xs text-gray-400">
            Actual: {ORIGEN_LABEL[contacto.origen as keyof typeof ORIGEN_LABEL] ?? contacto.origen}
            {contacto.origenDetalle ? ` — ${contacto.origenDetalle}` : ""}
          </p>
          <FormularioDetalles
            contactoId={contacto.id}
            origenActual={contacto.origen}
            origenDetalleActual={contacto.origenDetalle}
            notasActuales={contacto.notas}
          />
        </div>
      </div>
    </div>
  );
}
