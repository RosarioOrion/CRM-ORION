import { db } from "@/db";
import { novedades, usuarios } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { NuevaNovedadForm } from "./nueva-novedad-form";
import { EliminarNovedadBoton } from "./eliminar-novedad-boton";

export default async function NovedadesPage() {
  const sesion = await obtenerSesion();
  if (!sesion) return null;
  const admin = esAdmin(sesion.rol);

  const filas = await db
    .select({
      id: novedades.id,
      titulo: novedades.titulo,
      cuerpo: novedades.cuerpo,
      destacada: novedades.destacada,
      creadoEn: novedades.creadoEn,
      autorNombre: usuarios.nombre,
    })
    .from(novedades)
    .innerJoin(usuarios, eq(novedades.autorId, usuarios.id))
    .orderBy(desc(novedades.destacada), desc(novedades.creadoEn));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-orion-navy dark:text-white">
        Novedades
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Cartelera del equipo — avisos y novedades de la inmobiliaria.
      </p>

      {admin && (
        <div className="mb-6">
          <NuevaNovedadForm />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {filas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:bg-gray-800 dark:border-gray-700">
            Todavía no hay novedades publicadas.
          </p>
        ) : (
          filas.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 shadow-sm dark:bg-gray-800 ${
                n.destacada
                  ? "border-orion-gold bg-orion-gold/5 dark:border-orion-gold"
                  : "border-gray-200 bg-white dark:border-gray-700"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {n.destacada && (
                      <span className="rounded bg-orion-gold px-1.5 py-0.5 text-[10px] font-semibold text-orion-navy">
                        Destacada
                      </span>
                    )}
                    <p className="font-semibold text-orion-navy dark:text-white">
                      {n.titulo}
                    </p>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
                    {n.cuerpo}
                  </p>
                  <p className="mt-2 text-[11px] text-gray-400">
                    {n.autorNombre} ·{" "}
                    {new Date(n.creadoEn).toLocaleDateString("es-UY", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {admin && <EliminarNovedadBoton novedadId={n.id} />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
