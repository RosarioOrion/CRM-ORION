import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { listarTitulosConCorchetes } from "./actions";
import { EjecutarMigracionBoton } from "./ejecutar-boton";

export default async function MigrarPage() {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "TEAM_LEADER") {
    redirect("/dashboard");
  }

  const titulosConCorchetes = await listarTitulosConCorchetes();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold text-orion-navy dark:text-white">
        Migración de base de datos
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Herramienta interna para preparar la base de datos para los nuevos
        estados de propiedad y la carga de fotos. Se puede ejecutar más de
        una vez sin riesgo (es idempotente).
      </p>

      <EjecutarMigracionBoton />

      <div className="mt-10">
        <h2 className="mb-2 text-lg font-semibold text-orion-navy dark:text-white">
          Propiedades con etiqueta entre corchetes en el título (
          {titulosConCorchetes.length})
        </h2>
        {titulosConCorchetes.length === 0 ? (
          <p className="text-sm text-gray-400">Ninguna.</p>
        ) : (
          <ul className="space-y-1 rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
            {titulosConCorchetes.map((t, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-4 border-b border-gray-100 py-1 last:border-0 dark:border-gray-700"
              >
                <span className="text-gray-700 dark:text-gray-200">
                  {t.titulo}
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {t.estado}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
