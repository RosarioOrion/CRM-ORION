import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { contactos, propiedades, busquedas, seguimientos, usuarios } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { desc, eq, inArray } from "drizzle-orm";
import { ORIGEN_LABEL, rolesDe } from "@/lib/contactos";
import { limpiarTitulo } from "@/lib/propiedades";
import { RolesContacto } from "./roles-contacto";
import { UnirContacto } from "./unir-contacto";
import { SeguimientoContacto } from "./seguimiento-contacto";
import { ahoraUY } from "@/lib/calendario";
import {
  estadoSeguimiento,
  numeroWhatsApp,
  textoAvisoFinal,
  DIAS_ENTRE_SEGUIMIENTOS,
} from "@/lib/seguimientos";
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
      estado: propiedades.estado,
      agenteId: propiedades.agenteId,
    })
    .from(propiedades)
    .where(eq(propiedades.duenoId, contacto.id));

  // --- Seguimiento (regla de contacto frío) ---
  const ahora = ahoraUY();
  const historial = await db
    .select()
    .from(seguimientos)
    .where(eq(seguimientos.contactoId, contacto.id))
    .orderBy(desc(seguimientos.fecha))
    .limit(50);
  const estadoSeg = estadoSeguimiento(historial, contacto.frioDesde, ahora);
  const propsActivas = propiedadesDelContacto.filter(
    (p) => p.estado === "ACTIVA" && p.agenteId === sesion.userId
  );
  const propsSuspendidas = propiedadesDelContacto.filter(
    (p) => p.estado === "PAUSADA" && p.agenteId === sesion.userId
  );
  const todasBusq = await db
    .select({
      id: busquedas.id,
      operacion: busquedas.operacion,
      tipo: busquedas.tipo,
      zona: busquedas.zona,
      activa: busquedas.activa,
    })
    .from(busquedas)
    .where(eq(busquedas.contactoId, contacto.id));
  const busqActivas = todasBusq.filter((b) => b.activa);
  const busqSuspendidas = todasBusq.filter((b) => !b.activa);
  const textoBusqueda = (b: (typeof todasBusq)[number]) =>
    `${b.operacion === "VENTA" ? "Compra" : "Alquiler"} · ${b.tipo} · ${b.zona}`;
  const idsPropHist = [...new Set(historial.map((h) => h.propiedadId).filter(Boolean))] as string[];
  const propHist = new Map<string, string>();
  if (idsPropHist.length) {
    const ps = await db
      .select({ id: propiedades.id, codigo: propiedades.codigo })
      .from(propiedades)
      .where(inArray(propiedades.id, idsPropHist));
    for (const p of ps) propHist.set(p.id, p.codigo);
  }
  const [yo] = await db.select({ nombre: usuarios.nombre }).from(usuarios).where(eq(usuarios.id, sesion.userId));
  const roles = rolesDe(contacto);
  const esPropietario = roles.some((r) => r.startsWith("PROPIETARIO"));
  // Si solo es propietario de alquiler, la propiedad nueva arranca como alquiler.
  const operacionNueva =
    roles.includes("PROPIETARIO_ALQUILER") && !roles.includes("PROPIETARIO_VENTA")
      ? "ALQUILER"
      : "VENTA";
  const numeroWa = numeroWhatsApp(contacto.telefono);
  const whatsappAviso = numeroWa
    ? `https://wa.me/${numeroWa}?text=${encodeURIComponent(
        textoAvisoFinal({
          nombre: contacto.nombre,
          agente: yo?.nombre ?? "",
          propiedades: propsActivas.map((p) => p.codigo),
          esComprador: roles.some((r) => r.startsWith("LEAD") || r === "INVERSOR"),
        })
      )}`
    : null;
  const proximaSugerida = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate() + DIAS_ENTRE_SEGUIMIENTOS
  );

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
                <RolesContacto
                  key={rolesDe(contacto).join(",")}
                  contactoId={contacto.id}
                  roles={rolesDe(contacto)}
                />
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

        <div className="-mt-2 mb-4">
          <UnirContacto contactoId={contacto.id} nombre={contacto.nombre} />
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

        {(propiedadesDelContacto.length > 0 || esPropietario) && (
          <div className="mb-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Propiedades a su nombre
              </p>
              {esPropietario && (
                <Link
                  href={`/propiedades?dueno=${contacto.id}&operacion=${operacionNueva}`}
                  className="flex items-center gap-1.5 rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orion-navy-light"
                >
                  <span className="text-sm leading-none">+</span> Publicar propiedad
                </Link>
              )}
            </div>
            {propiedadesDelContacto.length === 0 && (
              <p className="text-sm text-gray-400">Todavía no tiene propiedades cargadas.</p>
            )}
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

        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Seguimiento
          </p>
          <SeguimientoContacto
            key={`${historial.length}-${contacto.frioDesde?.getTime() ?? 0}`}
            contactoId={contacto.id}
            estado={estadoSeg}
            historial={historial.map((h) => ({
              id: h.id,
              fecha: h.fecha,
              canal: h.canal,
              respondio: h.respondio,
              avisoFinal: h.avisoFinal,
              nota: h.nota,
              proximaFecha: h.proximaFecha,
              propiedad: h.propiedadId ? propHist.get(h.propiedadId) ?? null : null,
            }))}
            propiedades={propsActivas.map((p) => ({ id: p.id, texto: `${p.codigo} — ${limpiarTitulo(p.titulo)}` }))}
            busquedas={busqActivas.map((b) => ({ id: b.id, texto: textoBusqueda(b) }))}
            suspendidas={propsSuspendidas.map((p) => ({ id: p.id, texto: `${p.codigo} — ${limpiarTitulo(p.titulo)}` }))}
            busquedasSuspendidas={busqSuspendidas.map((b) => ({ id: b.id, texto: textoBusqueda(b) }))}
            whatsappAviso={whatsappAviso}
            proximaSugerida={proximaSugerida}
          />
        </div>

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
