import { db } from "@/db";
import { propiedades, contactos } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { NuevaPropiedadForm } from "./nueva-propiedad-form";

const ESTADO_LABEL: Record<string, string> = {
  ACTIVA: "Activa",
  PAUSADA: "Pausada",
  CERRADA: "Cerrada",
};

const ESTADO_COLOR: Record<string, string> = {
  ACTIVA: "bg-green-100 text-green-700",
  PAUSADA: "bg-yellow-100 text-yellow-700",
  CERRADA: "bg-gray-200 text-gray-600",
};

export default async function PropiedadesPage() {
  const sesion = await obtenerSesion();

  const [misPropiedades, misContactos] = await Promise.all([
    db
      .select()
      .from(propiedades)
      .where(eq(propiedades.agenteId, sesion!.userId))
      .orderBy(desc(propiedades.creadoEn)),
    db
      .select({ id: contactos.id, nombre: contactos.nombre })
      .from(contactos)
      .where(eq(contactos.agenteId, sesion!.userId)),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-orion-navy">Propiedades</h1>
        <p className="text-sm text-gray-500">
          {misPropiedades.length} propiedad(es)
        </p>
      </div>

      <div className="mb-6">
        <NuevaPropiedadForm contactos={misContactos} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {misPropiedades.length === 0 ? (
          <p className="col-span-full rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
            Todavía no hay propiedades cargadas.
          </p>
        ) : (
          misPropiedades.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded bg-orion-navy px-2 py-0.5 text-xs font-bold text-white">
                  {p.codigo}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    ESTADO_COLOR[p.estado]
                  }`}
                >
                  {ESTADO_LABEL[p.estado]}
                </span>
              </div>
              <p className="font-semibold text-gray-800">{p.titulo}</p>
              <p className="text-sm text-gray-500">
                {p.zona}
                {p.departamento ? ` — ${p.departamento}` : ""}
              </p>
              {(p.dormitorios || p.banos || p.m2Cubiertos || p.m2Terreno || p.hectareas) && (
                <p className="mt-1 text-xs text-gray-400">
                  {[
                    p.dormitorios ? `${p.dormitorios} dorm` : null,
                    p.banos ? `${p.banos} baños` : null,
                    p.m2Cubiertos ? `${p.m2Cubiertos} m²` : null,
                    p.m2Terreno ? `${p.m2Terreno} m² terreno` : null,
                    p.hectareas ? `${p.hectareas} ha` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {p.operacion === "VENTA" ? "Venta" : "Alquiler"} ·{" "}
                  {p.tipo}
                </span>
                {p.precio && (
                  <span className="font-bold text-orion-navy">
                    {p.moneda} {p.precio.toLocaleString("es-UY")}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
