import Link from "next/link";
import { db } from "@/db";
import { tasaciones, usuarios } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { equipoVisible, esSupervisor } from "@/lib/permisos";
import { eq, desc, inArray } from "drizzle-orm";
import { categoriaDe, type Categoria } from "@/lib/tasacion-pro";

const CATEGORIAS: { valor: Categoria; label: string }[] = [
  { valor: "APARTAMENTO", label: "Apartamentos y oficinas" },
  { valor: "CASA", label: "Casas, dúplex y PH" },
  { valor: "TERRENO", label: "Terrenos" },
  { valor: "CHACRA", label: "Chacras" },
  { valor: "CAMPO", label: "Campos" },
  { valor: "COMERCIAL", label: "Locales y galpones" },
];

const sinTildes = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Tasaciones: también es la base de datos del equipo (buscar por tipo y
// barrio). Las tasaciones de todos aparecen como "Tasación previa" en
// "Sugerir comparables".
export default async function TasacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string }>;
}) {
  const { q: qParam, tipo: tipoParam } = await searchParams;
  const q = (qParam ?? "").trim();
  const tipoFiltro = CATEGORIAS.some((c) => c.valor === tipoParam) ? (tipoParam as Categoria) : "";
  const sesion = await obtenerSesion();
  if (!sesion) return null;
  // CEO: todas; Administrador y Líder: las de su equipo; agente: las suyas.
  const admin = esSupervisor(sesion.rol);
  const visibles = (await equipoVisible(sesion.userId, sesion.rol)).map((u) => u.id);

  const columnas = {
    id: tasaciones.id,
    tipo: tasaciones.tipo,
    direccion: tasaciones.direccion,
    zona: tasaciones.zona,
    m2: tasaciones.m2,
    promedioUsdM2: tasaciones.promedioUsdM2,
    detalle: tasaciones.detalle,
    valorEstimado: tasaciones.valorEstimado,
    ajusteManual: tasaciones.ajusteManual,
    creadoEn: tasaciones.creadoEn,
    agenteNombre: usuarios.nombre,
  };

  const todas = await db
    .select(columnas)
    .from(tasaciones)
    .innerJoin(usuarios, eq(tasaciones.agenteId, usuarios.id))
    .where(inArray(tasaciones.agenteId, visibles))
    .orderBy(desc(tasaciones.creadoEn));
  const filas = todas.filter(
    (t) =>
      (!tipoFiltro || categoriaDe(t.tipo) === tipoFiltro) &&
      (!q || sinTildes([t.zona, t.direccion, t.tipo, t.detalle?.departamento].filter(Boolean).join(" ")).includes(sinTildes(q)))
  );
  const unidadDe = (tipo: string) => {
    const c = categoriaDe(tipo);
    return c === "CHACRA" || c === "CAMPO" ? "ha" : "m²";
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-orion-navy dark:text-white">
            Tasaciones
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filas.length === 1 ? "1 tasación" : `${filas.length} tasaciones`}
            {filas.length !== todas.length && ` de ${todas.length}`} · base del equipo: también aparecen como
            comparables en “Sugerir comparables”.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
        <Link
          href="/tasaciones/rentabilidad"
          className="rounded-lg border border-orion-navy px-4 py-2 text-sm font-semibold text-orion-navy transition hover:bg-orion-navy/5 dark:border-orion-gold dark:text-orion-gold"
        >
          📈 Rentabilidad
        </Link>
        <Link
          href="/tasaciones/nueva"
          className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light"
        >
          + Nueva tasación
        </Link>
        </div>
      </div>

      <form action="/tasaciones" method="GET" className="mb-4 flex flex-wrap items-center gap-2">
        <select
          name="tipo"
          defaultValue={tipoFiltro}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="">Todos los tipos</option>
          {CATEGORIAS.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Barrio, localidad o dirección…"
          className="w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
        <button type="submit" className="rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white">
          Buscar
        </button>
        {(q || tipoFiltro) && (
          <Link href="/tasaciones" className="text-xs text-gray-500 hover:underline">
            Limpiar
          </Link>
        )}
      </form>

      {filas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:bg-gray-800 dark:border-gray-700">
          {q || tipoFiltro ? "No hay tasaciones con esa búsqueda." : "Todavía no hay tasaciones cargadas."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-orion-bg text-xs uppercase text-gray-400 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Dirección</th>
                <th className="px-4 py-2 text-left">Superficie</th>
                <th className="px-4 py-2 text-left">USD por unidad</th>
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
                      {t.m2} {unidadDe(t.tipo)}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                    <Link href={`/tasaciones/${t.id}`} className="block">
                      USD {Math.round(t.promedioUsdM2).toLocaleString("es-UY")}/{unidadDe(t.tipo)}
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
