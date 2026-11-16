import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";
import { listarAreas, listarMaterial } from "../datos";
import { FilaArea } from "./fila-area";

// Áreas por tema de Capacitación: la CEO edita nombre, ícono y orden, y suma nuevas.
export default async function AreasPage() {
  const sesion = await obtenerSesion();
  if (!sesion || !esCEO(sesion.rol)) redirect("/capacitacion");
  const [areas, material] = await Promise.all([listarAreas(), listarMaterial()]);
  const cuenta = (clave: string) => material.filter((m) => m.areas.includes(clave)).length;
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/capacitacion/subir" className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold">
        ← Volver a Subir material
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-orion-navy dark:text-white">🗂️ Áreas de Capacitación</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Cambiá el nombre, el ícono o el orden, o sumá áreas nuevas. Qué materiales van en cada área se elige al subir o
        editar cada material.
      </p>
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white px-4 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
        {areas.map((a) => (
          <FilaArea key={a.clave} area={a} cantidad={cuenta(a.clave)} />
        ))}
        <FilaArea />
      </div>
    </div>
  );
}
