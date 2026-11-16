import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";
import { fechaCorta, TIPO_MATERIAL_LABEL } from "@/lib/capacitacion";
import { listarAreas, listarMaterial } from "../datos";
import { bloqueLabel, nombreMaterial } from "@/lib/manual-indice";
import { NuevoDocumentoForm } from "../nuevo-documento-form";
import { EliminarDocumentoBoton } from "../eliminar-documento-boton";

export default async function SubirMaterialPage() {
  const sesion = await obtenerSesion();
  if (!sesion || !esCEO(sesion.rol)) redirect("/capacitacion");
  const [material, areas] = await Promise.all([listarMaterial(), listarAreas()]);
  const areaDe = new Map(areas.map((a) => [a.clave, a]));

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/capacitacion"
        className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold"
      >
        ← Volver a la biblioteca
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-orion-navy dark:text-white">Subir material</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Lo que subas acá aparece en la biblioteca de Capacitación para todo el equipo.
      </p>

      <div className="mb-3 flex justify-end">
        <Link href="/capacitacion/areas" className="text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold">
          🗂️ Editar áreas ({areas.length})
        </Link>
      </div>
      <NuevoDocumentoForm areas={areas} />

      <h2 className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Material cargado ({material.length})
      </h2>
      {material.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no subiste nada.</p>
      ) : (
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
          {material.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xl">{d.tipo === "VIDEO" ? "🎬" : "📄"}</span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/capacitacion/${d.id}`}
                  className="block truncate text-sm font-semibold text-orion-navy hover:underline dark:text-white"
                >
                  {nombreMaterial(d.clase, d.numero, d.titulo)}
                </Link>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {bloqueLabel(d.bloque) ?? "Sin bloque"}
                  {d.areas.length > 0 && " · "}
                  {d.areas.map((a) => areaDe.get(a)?.icono ?? "").join(" ")}
                </p>
                <p className="text-[11px] text-gray-400">
                  {TIPO_MATERIAL_LABEL[d.tipo]} · {fechaCorta(d.creadoEn)} · {d.subidoPorNombre}
                </p>
              </div>
              <Link
                href={`/capacitacion/${d.id}/editar`}
                className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-orion-navy hover:border-orion-navy dark:border-gray-600 dark:text-white"
              >
                ✏️ Editar
              </Link>
              <EliminarDocumentoBoton documentoId={d.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
