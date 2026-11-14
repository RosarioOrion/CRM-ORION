import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { busquedas, contactos, propiedades, seguimientos, usuarios } from "@/db/schema";
import { CATEGORIA_COLOR, CATEGORIA_LABEL, ORIGEN_LABEL, rolesDe } from "@/lib/contactos";
import { limpiarTitulo, ESTADO_LABEL } from "@/lib/propiedades";
import { CANAL_LABEL, esCanal } from "@/lib/seguimientos";

type Contacto = typeof contactos.$inferSelect;

const fecha = (d: Date) =>
  d.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "2-digit" });

/**
 * Ficha de un contacto de otro agente, para su jefe (CEO, Administrador o
 * Líder de su equipo). Solo lectura. Teléfono y email solo con `verDatos`
 * (la CEO); el resto los ve ocultos.
 */
export async function ContactoSoloLectura({ contacto, verDatos }: { contacto: Contacto; verDatos: boolean }) {
  const [agente, props, busq, segs] = await Promise.all([
    db.select({ nombre: usuarios.nombre }).from(usuarios).where(eq(usuarios.id, contacto.agenteId)).then((r) => r[0]),
    db
      .select({ id: propiedades.id, codigo: propiedades.codigo, titulo: propiedades.titulo, estado: propiedades.estado })
      .from(propiedades)
      .where(eq(propiedades.duenoId, contacto.id)),
    db
      .select({ operacion: busquedas.operacion, tipo: busquedas.tipo, zona: busquedas.zona, activa: busquedas.activa })
      .from(busquedas)
      .where(eq(busquedas.contactoId, contacto.id)),
    db
      .select({
        fecha: seguimientos.fecha,
        canal: seguimientos.canal,
        respondio: seguimientos.respondio,
        nota: seguimientos.nota,
      })
      .from(seguimientos)
      .where(eq(seguimientos.contactoId, contacto.id))
      .orderBy(desc(seguimientos.fecha))
      .limit(15),
  ]);
  const titulo = "mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/contactos?agente=${contacto.agenteId}`} className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold">
        ← Volver a los contactos de {agente?.nombre ?? "este agente"}
      </Link>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-4 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-900/20 dark:text-sky-200">
          👁️ Contacto de <b>{agente?.nombre}</b>. Solo lectura{verDatos ? "" : "; el teléfono y el email no se muestran"}.
        </p>
        <h1 className="text-xl font-bold text-orion-navy dark:text-white">{contacto.nombre}</h1>
        <div className="mt-1 flex flex-wrap gap-1">
          {rolesDe(contacto).map((r) => (
            <span key={r} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${CATEGORIA_COLOR[r]}`}>
              {CATEGORIA_LABEL[r]}
            </span>
          ))}
          {contacto.archivado && (
            <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">Archivado</span>
          )}
        </div>

        <div className="my-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className={titulo}>Teléfono</p>
            <p className="text-sm text-gray-700 dark:text-gray-200">{verDatos ? contacto.telefono || "—" : "📵 Oculto"}</p>
          </div>
          <div>
            <p className={titulo}>Email</p>
            <p className="text-sm text-gray-700 dark:text-gray-200">{verDatos ? contacto.email || "—" : "📵 Oculto"}</p>
          </div>
          <div>
            <p className={titulo}>Origen</p>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              {ORIGEN_LABEL[contacto.origen as keyof typeof ORIGEN_LABEL] ?? contacto.origen}
              {contacto.origenDetalle ? ` — ${contacto.origenDetalle}` : ""}
            </p>
          </div>
          <div>
            <p className={titulo}>Cargado el</p>
            <p className="text-sm text-gray-700 dark:text-gray-200">{fecha(contacto.creadoEn)}</p>
          </div>
        </div>

        {props.length > 0 && (
          <div className="mb-5">
            <p className={titulo}>Propiedades a su nombre</p>
            {props.map((p) => (
              <Link key={p.id} href={`/propiedades/${p.id}`} className="block text-sm text-orion-navy hover:underline dark:text-orion-gold">
                {p.codigo} — {limpiarTitulo(p.titulo)} · {ESTADO_LABEL[p.estado]}
              </Link>
            ))}
          </div>
        )}

        {busq.length > 0 && (
          <div className="mb-5">
            <p className={titulo}>Búsquedas</p>
            {busq.map((b, i) => (
              <p key={i} className="text-sm text-gray-700 dark:text-gray-200">
                {b.operacion === "VENTA" ? "Compra" : "Alquiler"} · {b.tipo} · {b.zona}
                {b.activa ? "" : " (pausada)"}
              </p>
            ))}
          </div>
        )}

        <div className="mb-5">
          <p className={titulo}>Seguimiento</p>
          {segs.length === 0 ? (
            <p className="text-sm text-gray-400">Sin seguimientos registrados.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm dark:divide-gray-700">
              {segs.map((s, i) => (
                <li key={i} className="py-1.5 text-gray-700 dark:text-gray-200">
                  <span className="text-xs text-gray-400">{fecha(s.fecha)}</span> ·{" "}
                  {esCanal(s.canal) ? CANAL_LABEL[s.canal] : s.canal} · {s.respondio ? "respondió" : "sin respuesta"}
                  {s.nota ? ` — ${s.nota}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        {contacto.notas && (
          <div>
            <p className={titulo}>Notas</p>
            <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-200">{contacto.notas}</p>
          </div>
        )}
      </div>
    </div>
  );
}
