import Link from "next/link";
import { db } from "@/db";
import { tasaciones, usuarios } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export default async function TasacionesPage() {
  const sesion = await obtenerSesion();
  if (!sesion) return null;
  const admin = esAdmin(sesion.rol);

  const columnas = {
    id: tasaciones.id,
    tipo: tasaciones.tipo,
    direccion: tasaciones.direccion,
    zona: tasaciones.zona,
    m2: tasaciones.m2,
    valorEstimado: tasaciones.valorEstimado,
    ajusteManual: tasaciones.ajusteManual,
    creadoEn: tasaciones.creadoEn,
    agenteNombre: usuarios.nombre,
  };

  const filas = admin
    ? await db
        .select(columnas)
        .from(tasaciones)
        .innerJoin(usuarios, eq(tasaciones.agenteId, usuarios.id))
        .orderBy(desc(tasaciones.creadoEn))
    : await db
        .select(columnas)
        .from(tasaciones)
        .innerJoin(usuarios, eq(tasaciones.agenteId, usuarios.id))
        .where(eq(tasaciones.agenteId, sesion.userId))
        .orderBy(desc(tasaciones.creadoEn));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-orion-navy dark:text-white">
            Tasaciones
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filas.length} tasación{filas.length === 1 ? "" : "es"}
          </p>
        </div>
        <Link
          href="/tasaciones/nueva"
          className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light"
        >
          + Nueva tasación
        </Link>
      </div>

      {filas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:bg-gray-800 dark:border-gray-700">
          Todavía no hay tasaciones cargadas.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-orion-bg text-xs uppercase text-gray-400 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Dirección</th>
                <th className="px-4 py-2 text-left">m²</th>
                {admin && <th className="px-4 py-2 text-left">Agente</th>}
                <th className="px-4 py-2 text-left">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
              {filas.map((t) => (
                <tr key={t.id} className="hover:bg-orion-bg/50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-2">
                    <Link href={`/tasaciones/${t.id}`} className="block">
                      {new Date(t.creadoEn).toLocaleDateString("es-UY", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/tasaciones/${t.id}`} className="block capitalize">
                      {t.tipo}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/tasaciones/${t.id}`} className="block">
                      {t.direccion || "—"}
                      {t.zona ? <span className="text-gray-400"> · {t.zona}</span> : null}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/tasaciones/${t.id}`} className="block">
                      {t.m2}
                    </Link>
                  </td>
                  {admin && (
                    <td className="px-4 py-2">
                      <Link href={`/tasaciones/${t.id}`} className="block">
                        {t.agenteNombre}
                      </Link>
                    </td>
                  )}
                  <td className="px-4 py-2 font-semibold text-orion-navy dark:text-orion-gold">
                    <Link href={`/tasaciones/${t.id}`} className="block">
                      USD {(t.ajusteManual ?? t.valorEstimado).toLocaleString("es-UY")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
