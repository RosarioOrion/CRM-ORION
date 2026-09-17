import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  propiedades,
  contactos,
  pipelineAcciones,
  historialPrecios,
  portalesPublicados,
} from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { limpiarTitulo } from "@/lib/propiedades";
import {
  diasEnMercado,
  semanaActual,
  esSemanaFinal,
  accionesDeLaSemana,
  DURACION_CICLO,
} from "@/lib/pipeline";
import type { CategoriaPipeline } from "@/lib/pipeline";
import { CambiarEstado } from "./cambiar-estado";
import { SubirFotosForm } from "./subir-fotos-form";
import { PipelineToggle } from "./pipeline-toggle";
import { RegistroPortales } from "./registro-portales";
import { EditarDescripcion } from "./editar-descripcion";
import { eliminarFoto } from "../actions";

type Propiedad = typeof propiedades.$inferSelect;

const CARACTERISTICAS: {
  key: keyof Propiedad;
  label: string;
  sufijo?: string;
}[] = [
  { key: "m2Cubiertos", label: "Superficie total", sufijo: "m²" },
  { key: "m2Privados", label: "Superficie privada", sufijo: "m²" },
  { key: "m2Terreno", label: "Superficie de terreno", sufijo: "m²" },
  { key: "hectareas", label: "Hectáreas", sufijo: "ha" },
  { key: "dormitorios", label: "Dormitorios" },
  { key: "banos", label: "Baños" },
  { key: "ambientes", label: "Ambientes" },
  { key: "cocheras", label: "Cocheras" },
  { key: "bodegas", label: "Bodegas" },
  { key: "antiguedad", label: "Antigüedad", sufijo: "años" },
  { key: "numeroPiso", label: "Piso" },
  { key: "cantidadPisos", label: "Cantidad de pisos" },
  { key: "orientacion", label: "Orientación" },
  { key: "disposicion", label: "Disposición" },
  { key: "subtipo", label: "Subtipo" },
  { key: "gastosComunes", label: "Gastos comunes" },
  { key: "acceso", label: "Acceso" },
  { key: "distanciaAsfalto", label: "Distancia al asfalto", sufijo: "km" },
  { key: "formaTerreno", label: "Forma del terreno" },
  { key: "estadoEdilicio", label: "Estado edilicio" },
];

export default async function PropiedadDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sesion = await obtenerSesion();
  if (!sesion) notFound();

  const [propiedad] = await db
    .select()
    .from(propiedades)
    .where(eq(propiedades.id, id));

  if (!propiedad || propiedad.agenteId !== sesion.userId) notFound();

  const [dueno, portales] = await Promise.all([
    db.select().from(contactos).where(eq(contactos.id, propiedad.duenoId)).then((r) => r[0]),
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
  const mapaSrc = `https://www.google.com/maps?q=${encodeURIComponent(ubicacion)}&output=embed`;

  let datosPipeline: import("./pipeline-toggle").TarjetaPipelineProps | null = null;
  if (propiedad.estado === "ACTIVA") {
    const [acciones, ajustes] = await Promise.all([
      db
        .select()
        .from(pipelineAcciones)
        .where(eq(pipelineAcciones.propiedadId, propiedad.id))
        .orderBy(desc(pipelineAcciones.creadoEn)),
      db
        .select()
        .from(historialPrecios)
        .where(eq(historialPrecios.propiedadId, propiedad.id))
        .orderBy(desc(historialPrecios.creadoEn)),
    ]);

    const ahora = new Date();
    const dias = diasEnMercado(propiedad.fechaInicioPipeline, ahora);
    const semana = semanaActual(dias, propiedad.operacion);
    const esFinal = esSemanaFinal(semana, propiedad.operacion);
    const accionesSemana = accionesDeLaSemana(propiedad.operacion, semana);
    const accionesDeEsta = acciones.filter((a) => a.semana === semana);
    const hechasEstaSemana = accionesDeEsta.map((a) => a.categoria as CategoriaPipeline);
    const ultimaAccion = acciones[0];
    const diasSinContacto = ultimaAccion ? diasEnMercado(ultimaAccion.creadoEn, ahora) : null;
    const ultimoAjuste = ajustes[0];

    datosPipeline = {
      propiedadId: propiedad.id,
      codigo: propiedad.codigo,
      titulo: limpiarTitulo(propiedad.titulo),
      operacion: propiedad.operacion,
      precio: propiedad.precio,
      moneda: propiedad.moneda,
      dias,
      semana,
      totalSemanas: DURACION_CICLO[propiedad.operacion],
      esFinal,
      acciones: accionesSemana,
      hechasEstaSemana,
      diasSinContacto,
      ultimoAjustePrecio: ultimoAjuste
        ? { fecha: ultimoAjuste.creadoEn.toISOString(), precioAnterior: ultimoAjuste.precioAnterior }
        : null,
      fechaInicioPipeline: propiedad.fechaInicioPipeline.toISOString(),
    };
  }

  const caracteristicas = CARACTERISTICAS.map((c) => ({
    ...c,
    valor: propiedad[c.key],
  })).filter((c) => c.valor !== null && c.valor !== undefined && c.valor !== "");

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/propiedades"
        className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold"
      >
        ← Volver a Propiedades
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded bg-orion-navy px-2 py-0.5 text-xs font-bold text-white">
            {propiedad.codigo}
          </span>
          <CambiarEstado propiedadId={propiedad.id} estadoActual={propiedad.estado} />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {propiedad.operacion === "VENTA" ? "Venta" : "Alquiler"} · {propiedad.tipo}
          </span>
        </div>

        <h1 className="mb-1 text-xl font-bold text-orion-navy dark:text-white">
          {limpiarTitulo(propiedad.titulo)}
        </h1>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {propiedad.zona}
          {propiedad.departamento ? ` — ${propiedad.departamento}` : ""}
          {propiedad.direccion ? ` · ${propiedad.direccion}` : ""}
        </p>

        {propiedad.precio && (
          <p className="mb-4 text-2xl font-bold text-orion-navy dark:text-orion-gold">
            {propiedad.moneda} {propiedad.precio.toLocaleString("es-UY")}
          </p>
        )}

        {datosPipeline && <PipelineToggle {...datosPipeline} />}

        {caracteristicas.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Características
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {caracteristicas.map((c) => (
                <div key={c.key}>
                  <span className="text-xs text-gray-400">{c.label}: </span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {String(c.valor)}
                    {c.sufijo ? ` ${c.sufijo}` : ""}
                  </span>
                </div>
              ))}
              {propiedad.mascotas && (
                <div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Admite mascotas
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {propiedad.extras.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Extras
            </p>
            <div className="flex flex-wrap gap-2">
              {propiedad.extras.map((ex) => (
                <span
                  key={ex}
                  className="rounded-full bg-orion-bg px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                >
                  {ex}
                </span>
              ))}
            </div>
          </div>
        )}

        <EditarDescripcion propiedadId={propiedad.id} descripcionInicial={propiedad.descripcion} />

        {dueno && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Dueño
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              {dueno.nombre}
              {dueno.telefono ? ` · ${dueno.telefono}` : ""}
              {dueno.email ? ` · ${dueno.email}` : ""}
            </p>
          </div>
        )}

        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Ubicación
          </p>
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <iframe
              title="Ubicación en el mapa"
              src={mapaSrc}
              width="100%"
              height="260"
              style={{ border: 0 }}
              loading="lazy"
            />
          </div>
        </div>

        <RegistroPortales propiedadId={propiedad.id} portalesIniciales={portales} />

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Fotos
          </p>
          {propiedad.fotos.length > 0 && (
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {propiedad.fotos.map((foto) => (
                <div key={foto} className="group relative overflow-hidden rounded-lg">
                  <img
                    src={foto}
                    alt="Foto de la propiedad"
                    className="h-32 w-full object-cover"
                  />
                  <form
                    action={async () => {
                      "use server";
                      await eliminarFoto(propiedad.id, foto);
                    }}
                    className="absolute right-1 top-1 opacity-0 transition group-hover:opacity-100"
                  >
                    <button
                      type="submit"
                      className="rounded-full bg-black/60 px-2 py-0.5 text-xs text-white hover:bg-black/80"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
          <SubirFotosForm propiedadId={propiedad.id} />
        </div>
      </div>
    </div>
  );
}
