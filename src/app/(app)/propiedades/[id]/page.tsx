import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  propiedades,
  contactos,
  portalesPublicados,
  usuarios,
} from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { limpiarTitulo, ESTADO_LABEL, ESTADO_COLOR } from "@/lib/propiedades";
import { armarTarjetasPipeline } from "@/lib/pipeline-datos";
import { MapaUbicacion } from "@/components/mapa-ubicacion";
import { tituloPublico, precioTexto } from "@/lib/sitio";
import { PrepararMarketplace, type DatosMarketplace } from "./preparar-marketplace";
import { CambiarEstado } from "./cambiar-estado";
import { SubirFotosForm } from "./subir-fotos-form";
import { PipelineToggle } from "./pipeline-toggle";
import { RegistroPortales } from "./registro-portales";
import { CarruselFotos } from "./carrusel-fotos";
import { ReactivarPropiedad } from "./reactivar-propiedad";
import { OrganizarFotos } from "./organizar-fotos";
import { createHash } from "node:crypto";
import { EliminarPropiedad } from "./eliminar-propiedad";
import { MostrarEnWeb } from "./mostrar-en-web";
import { EditarPropiedad } from "./editar-propiedad";

type Propiedad = typeof propiedades.$inferSelect;

const CARACTERISTICAS: {
  key: keyof Propiedad;
  label: string;
  sufijo?: string;
}[] = [
  // Primero lo más importante (recuadro de datos al costado de las fotos).
  { key: "m2Cubiertos", label: "Superficie total", sufijo: "m²" },
  { key: "m2Privados", label: "Superficie privada", sufijo: "m²" },
  { key: "m2Terreno", label: "Terreno", sufijo: "m²" },
  { key: "hectareas", label: "Hectáreas", sufijo: "ha" },
  { key: "dormitorios", label: "Dormitorios" },
  { key: "banos", label: "Baños" },
  { key: "ambientes", label: "Ambientes" },
  { key: "cocheras", label: "Cocheras" },
  { key: "numeroPiso", label: "Piso" },
  { key: "orientacion", label: "Orientación" },
  { key: "disposicion", label: "Disposición" },
  { key: "estadoEdilicio", label: "Estado edilicio" },
  { key: "antiguedad", label: "Antigüedad", sufijo: "años" },
  { key: "bodegas", label: "Bodegas" },
  { key: "cantidadPisos", label: "Cantidad de pisos" },
  { key: "subtipo", label: "Subtipo" },
  { key: "acceso", label: "Acceso" },
  { key: "distanciaAsfalto", label: "Distancia al asfalto", sufijo: "km" },
  { key: "formaTerreno", label: "Forma del terreno" },
];

export default async function PropiedadDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editar?: string; guardado?: string; precio?: string; aviso?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const sesion = await obtenerSesion();
  if (!sesion) notFound();

  const [propiedad] = await db
    .select()
    .from(propiedades)
    .where(eq(propiedades.id, id));

  if (!propiedad) notFound();

  // Todos pueden ver cualquier propiedad, pero solo el agente a cargo la
  // edita. En las ajenas se oculta el contacto del dueño y se muestra el
  // agente a cargo para coordinar con él.
  const esPropia = propiedad.agenteId === sesion.userId;

  const [dueno, agenteACargo, portales] = await Promise.all([
    esPropia
      ? db.select().from(contactos).where(eq(contactos.id, propiedad.duenoId)).then((r) => r[0])
      : Promise.resolve(undefined),
    db
      .select({ nombre: usuarios.nombre, telefono: usuarios.telefono, email: usuarios.email })
      .from(usuarios)
      .where(eq(usuarios.id, propiedad.agenteId))
      .then((r) => r[0]),
    db
      .select({
        id: portalesPublicados.id,
        portal: portalesPublicados.portal,
        url: portalesPublicados.url,
        creadoEn: portalesPublicados.creadoEn,
      })
      .from(portalesPublicados)
      .where(eq(portalesPublicados.propiedadId, propiedad.id))
      .orderBy(desc(portalesPublicados.creadoEn)),
  ]);

  const ubicacion = [propiedad.direccion, propiedad.zona, propiedad.departamento, "Uruguay"]
    .filter(Boolean)
    .join(", ");

  let datosPipeline: import("./pipeline-toggle").TarjetaPipelineProps | null = null;
  if (esPropia && propiedad.estado === "ACTIVA") {
    [datosPipeline] = await armarTarjetasPipeline([propiedad], false);
  }

  // Para "Editar propiedad": mis contactos (posibles dueños), incluido el actual.
  const contactosEdicion = esPropia
    ? await db
        .select({ id: contactos.id, nombre: contactos.nombre })
        .from(contactos)
        .where(eq(contactos.agenteId, sesion.userId))
        .orderBy(contactos.nombre)
    : [];
  if (esPropia && propiedad.duenoId && !contactosEdicion.some((c) => c.id === propiedad.duenoId)) {
    const [d] = await db
      .select({ id: contactos.id, nombre: contactos.nombre })
      .from(contactos)
      .where(eq(contactos.id, propiedad.duenoId));
    if (d) contactosEdicion.unshift(d);
  }

  // Fotos: se sirven por /api/fotos (más liviano que meterlas en la página).
  // La huella (?v=) cambia si cambia la foto en esa posición.
  const fotosVista = propiedad.fotos.map((f, i) => ({
    indice: i,
    url: `/api/fotos/${propiedad.id}/${i}?v=${createHash("sha1").update(f).digest("hex").slice(0, 10)}`,
  }));

  // Datos listos para copiar en Facebook Marketplace (solo el agente a cargo).
  let datosMarketplace: DatosMarketplace | null = null;
  if (esPropia) {
    const m2 = propiedad.m2Cubiertos ?? propiedad.m2Privados ?? propiedad.m2Terreno;
    const tipoMk: Record<string, string> = { Apartamento: "Apartamento", Casa: "Casa" };
    const descripcionMk = [
      (propiedad.descripcion ?? "").replace(/\s*\[[^\]]*\]/g, "").trim(),
      `Ref. ${propiedad.codigo}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    datosMarketplace = {
      codigo: propiedad.codigo,
      titulo: tituloPublico(propiedad.titulo).slice(0, 99),
      operacion: propiedad.operacion === "VENTA" ? "En venta" : "En alquiler",
      tipo: tipoMk[propiedad.tipo] ?? propiedad.tipo,
      precio: propiedad.precio ? precioTexto(propiedad.precio, propiedad.moneda) : "",
      dormitorios: propiedad.dormitorios != null ? String(propiedad.dormitorios) : "",
      banos: propiedad.banos != null ? String(propiedad.banos) : "",
      metros: m2 ? String(m2) : "",
      ubicacion: [propiedad.direccion, propiedad.zona, propiedad.departamento].filter(Boolean).join(", "),
      descripcion: descripcionMk,
      fotos: fotosVista.map((f) => f.url),
    };
  }

  // Solo los campos del formulario (sin fotos ni fechas, que pesan o no se editan acá).
  const {
    fotos: _fotos,
    creadoEn: _creado,
    fechaInicioPipeline: _inicio,
    ...camposEditables
  } = propiedad;
  void _fotos;
  void _creado;
  void _inicio;
  const valoresEdicion = { ...camposEditables, titulo: limpiarTitulo(propiedad.titulo) };

  const caracteristicas = CARACTERISTICAS.map((c) => ({
    ...c,
    valor: propiedad[c.key],
  })).filter((c) => c.valor !== null && c.valor !== undefined && c.valor !== "");

  const editando = esPropia && sp.editar === "1";
  const FORM_ID = "form-editar-propiedad";
  const tarjeta =
    "rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800";
  const subtitulo = "mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400";

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={editando ? `/propiedades/${propiedad.id}` : "/propiedades"}
        className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold"
      >
        {editando ? "← Volver a la ficha (sin guardar)" : "← Volver a Propiedades"}
      </Link>

      {!esPropia && (
        <div className="mb-4 rounded-lg border border-orion-gold/40 bg-orion-gold/10 px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
          🔒 Propiedad de <strong>{agenteACargo?.nombre ?? "otro agente"}</strong> — solo lectura.
        </div>
      )}

      {/* 1. Título */}
      <div className={`${tarjeta} mb-4`}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded bg-orion-navy px-2 py-0.5 text-xs font-bold text-white">
            {propiedad.codigo}
          </span>
          {esPropia && !editando ? (
            <CambiarEstado propiedadId={propiedad.id} estadoActual={propiedad.estado} />
          ) : (
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${ESTADO_COLOR[propiedad.estado]}`}>
              {ESTADO_LABEL[propiedad.estado]}
            </span>
          )}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {propiedad.operacion === "VENTA" ? "Venta" : "Alquiler"} · {propiedad.tipo}
          </span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-orion-navy dark:text-white sm:text-2xl">
              {limpiarTitulo(propiedad.titulo)}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              📍 {propiedad.zona}
              {propiedad.departamento && !propiedad.zona.includes(propiedad.departamento)
                ? ` — ${propiedad.departamento}`
                : ""}
              {propiedad.direccion ? ` · ${propiedad.direccion}` : ""}
            </p>
          </div>
          {esPropia && !editando && (
            <div className="flex flex-wrap items-start gap-2">
              <Link
                href={`/propiedades/${propiedad.id}?editar=1`}
                className="rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 dark:bg-orion-gold dark:text-orion-navy"
              >
                ✏️ Editar propiedad
              </Link>
              <EliminarPropiedad propiedadId={propiedad.id} codigo={propiedad.codigo} />
            </div>
          )}
          {editando && (
            <span className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
              ✏️ Modo edición
            </span>
          )}
        </div>
      </div>

      {esPropia && !editando && propiedad.estado !== "ACTIVA" && (
        <ReactivarPropiedad propiedadId={propiedad.id} estadoLabel={ESTADO_LABEL[propiedad.estado]} />
      )}

      {sp.guardado === "1" && !editando && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100">
          <p className="font-semibold">✓ Cambios guardados.</p>
          {sp.aviso && <p className="text-xs">{sp.aviso}</p>}
          {sp.precio === "1" && (
            <p className="mt-1 text-xs">
              La web de Orion ya muestra el precio nuevo.
              {portales.length > 0 ? (
                <>
                  {" "}Acordate de cambiarlo también en:{" "}
                  {portales.map((p, i) => (
                    <span key={p.id}>
                      {i > 0 && ", "}
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                        {p.portal}
                      </a>
                    </span>
                  ))}
                  .
                </>
              ) : (
                " Si está publicada en otros portales, cambialo también ahí."
              )}
            </p>
          )}
        </div>
      )}

      {editando ? (
        <>
          {/* Modo edición: fotos + datos + descripción; al guardar vuelve a la vista. */}
          <div className={`${tarjeta} mb-4`}>
            <p className={subtitulo}>Fotos</p>
            {fotosVista.length > 0 && (
              <OrganizarFotos
                key={fotosVista.map((f) => f.url).join("|")}
                formId={FORM_ID}
                fotos={fotosVista}
              />
            )}
            <p className="mb-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
              Agregar fotos (se suben al momento; después podés ordenarlas):
            </p>
            <SubirFotosForm propiedadId={propiedad.id} />
          </div>
          <EditarPropiedad
            formId={FORM_ID}
            propiedadId={propiedad.id}
            contactos={contactosEdicion}
            valores={valoresEdicion}
          />
        </>
      ) : (
        <>
          {/* 2. Fotos + datos principales */}
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CarruselFotos fotos={fotosVista.map((f) => f.url)} />
            </div>
            <div className="flex flex-col gap-4">
              <div className={tarjeta}>
                {propiedad.precio ? (
                  <p className="text-2xl font-bold text-orion-navy dark:text-orion-gold">
                    {propiedad.moneda} {propiedad.precio.toLocaleString("es-UY")}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">Precio a consultar</p>
                )}
                {propiedad.gastosComunes ? (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    + Gastos comunes: $ {propiedad.gastosComunes.toLocaleString("es-UY")}/mes
                  </p>
                ) : null}
                <dl className="mt-3 divide-y divide-gray-100 text-sm dark:divide-gray-700">
                  <div className="flex justify-between gap-3 py-1.5">
                    <dt className="text-gray-500 dark:text-gray-400">Barrio</dt>
                    <dd className="text-right font-semibold text-gray-800 dark:text-gray-100">{propiedad.zona}</dd>
                  </div>
                  {caracteristicas
                    .filter((c) => c.key !== "gastosComunes")
                    .map((c) => (
                      <div key={c.key} className="flex justify-between gap-3 py-1.5">
                        <dt className="text-gray-500 dark:text-gray-400">{c.label}</dt>
                        <dd className="text-right font-semibold text-gray-800 dark:text-gray-100">
                          {String(c.valor)}
                          {c.sufijo ? ` ${c.sufijo}` : ""}
                        </dd>
                      </div>
                    ))}
                </dl>
                {(propiedad.extras.length > 0 || propiedad.mascotas) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {propiedad.mascotas && (
                      <span className="rounded-full bg-orion-bg px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        🐾 Admite mascotas
                      </span>
                    )}
                    {propiedad.extras.map((ex) => (
                      <span
                        key={ex}
                        className="rounded-full bg-orion-bg px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {esPropia && dueno && (
                <div className={tarjeta}>
                  <p className={subtitulo}>Dueño</p>
                  <Link
                    href={`/contactos/${dueno.id}`}
                    className="text-sm font-semibold text-orion-navy hover:underline dark:text-orion-gold"
                  >
                    {dueno.nombre}
                  </Link>
                  {dueno.telefono && <p className="text-sm text-gray-600 dark:text-gray-300">📞 {dueno.telefono}</p>}
                  {dueno.email && <p className="text-sm text-gray-600 dark:text-gray-300">✉️ {dueno.email}</p>}
                </div>
              )}
              {!esPropia && agenteACargo && (
                <div className={tarjeta}>
                  <p className={subtitulo}>Agente a cargo</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{agenteACargo.nombre}</p>
                  {agenteACargo.telefono && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">📞 {agenteACargo.telefono}</p>
                  )}
                  {agenteACargo.email && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">✉️ {agenteACargo.email}</p>
                  )}
                </div>
              )}
              {esPropia && (
                <MostrarEnWeb
                  propiedadId={propiedad.id}
                  codigo={propiedad.codigo}
                  publicada={propiedad.publicadaWeb}
                  visibleSegunEstado={propiedad.estado === "ACTIVA" || propiedad.estado === "RESERVADA"}
                />
              )}
            </div>
          </div>

          {/* 3. Descripción */}
          <div className={`${tarjeta} mb-4`}>
            <p className={subtitulo}>Descripción</p>
            {propiedad.descripcion ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                {propiedad.descripcion}
              </p>
            ) : (
              <p className="text-sm text-gray-400">
                Sin descripción.{esPropia ? " Agregala desde “Editar propiedad”." : ""}
              </p>
            )}
          </div>

          {/* 4. Mapa */}
          <div className={`${tarjeta} mb-4`}>
            <p className={subtitulo}>Ubicación</p>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              📍 {ubicacion.replace(/, Uruguay$/, "")}
            </p>
            <MapaUbicacion
              lat={propiedad.lat}
              lng={propiedad.lng}
              direccion={propiedad.direccion}
              zona={propiedad.zona}
              departamento={propiedad.departamento}
            />
          </div>

          {datosMarketplace && (
            <div className="mb-4">
              <PrepararMarketplace datos={datosMarketplace} />
            </div>
          )}

          {/* 5. Portales */}
          <div className={`${tarjeta} mb-4`}>
            <RegistroPortales
              propiedadId={propiedad.id}
              portalesIniciales={portales}
              soloLectura={!esPropia}
            />
          </div>

          {/* 6. Pipeline */}
          {datosPipeline && (
            <div className={`${tarjeta} mb-4`}>
              <PipelineToggle {...datosPipeline} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
