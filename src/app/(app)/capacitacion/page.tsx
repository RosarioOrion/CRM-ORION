import Link from "next/link";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { listarMaterial } from "./datos";
import { BuscadorDocumentos } from "./buscador-documentos";

export default async function CapacitacionPage() {
  const sesion = await obtenerSesion();
  if (!sesion) return null;
  const admin = esAdmin(sesion.rol);
  const material = await listarMaterial();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-orion-navy dark:text-white">
            Capacitación
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Biblioteca del equipo: tocá un material para leerlo o ver la clase.
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

      <BuscadorDocumentos documentos={material} />
    </div>
  );
}
