import Link from "next/link";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";
import { listarAreas, listarMaterial } from "./datos";
import { BuscadorDocumentos } from "./buscador-documentos";
import { LeccionFilosofia } from "./leccion-filosofia";
import { IndicePorBloque, IndicePorTema, PestanasIndice, type Vista } from "./indice";
import { CajaBusqueda, ResultadosBusqueda } from "./busqueda";

export default async function CapacitacionPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; area?: string; q?: string }>;
}) {
  const sesion = await obtenerSesion();
  if (!sesion) return null;
  const admin = esCEO(sesion.rol);
  const { vista: vistaParam, area, q: qParam } = await searchParams;
  const q = (qParam ?? "").trim();
  const vista: Vista = vistaParam === "bloque" || vistaParam === "todo" ? vistaParam : "tema";
  const [material, areas] = await Promise.all([listarMaterial(), listarAreas()]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-orion-navy dark:text-white">
            Capacitación
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manual Orion y material del equipo: buscá por tema, seguí el orden del manual o mirá todo.
          </p>
        </div>
        {admin && (
          <Link
            href="/capacitacion/subir"
            className="flex items-center gap-2 rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light"
          >
            ⬆ Subir material
          </Link>
        )}
      </div>

      {!area && !q && <LeccionFilosofia esCeo={admin} />}

      <CajaBusqueda q={q} />
      {q ? (
        <ResultadosBusqueda q={q} material={material} />
      ) : (
        <>
          <PestanasIndice vista={vista} />
          {vista === "tema" && <IndicePorTema areas={areas} material={material} area={area ?? null} />}
          {vista === "bloque" && <IndicePorBloque material={material} />}
          {vista === "todo" && <BuscadorDocumentos documentos={material} />}
        </>
      )}
    </div>
  );
}
