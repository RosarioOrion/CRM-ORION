import { db } from "@/db";
import { kaizenTareas, kaizenCompletados, usuarios } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { lunesDeSemana } from "@/lib/kaizen";
import { KaizenChecklist } from "./kaizen-checklist";
import { KaizenAdmin } from "./kaizen-admin";

export default async function KaizenPage() {
  const sesion = await obtenerSesion();
  if (!sesion) return null;

  const semana = lunesDeSemana(new Date());
  const admin = esAdmin(sesion.rol);

  const tareas = await db
    .select({
      id: kaizenTareas.id,
      dia: kaizenTareas.dia,
      orden: kaizenTareas.orden,
      texto: kaizenTareas.texto,
    })
    .from(kaizenTareas)
    .where(eq(kaizenTareas.activa, true))
    .orderBy(kaizenTareas.dia, kaizenTareas.orden);

  const misCompletados = await db
    .select({ tareaId: kaizenCompletados.tareaId })
    .from(kaizenCompletados)
    .where(
      and(
        eq(kaizenCompletados.agenteId, sesion.userId),
        eq(kaizenCompletados.semanaInicio, semana)
      )
    );

  let equipo: { nombre: string; completadas: number; total: number }[] = [];
  if (admin) {
    const agentes = await db
      .select({ id: usuarios.id, nombre: usuarios.nombre })
      .from(usuarios)
      .where(eq(usuarios.activo, true))
      .orderBy(usuarios.nombre);
    const completadosSemana = await db
      .select({ agenteId: kaizenCompletados.agenteId, tareaId: kaizenCompletados.tareaId })
      .from(kaizenCompletados)
      .where(eq(kaizenCompletados.semanaInicio, semana));
    const total = tareas.length;
    equipo = agentes.map((a) => ({
      nombre: a.nombre,
      completadas: completadosSemana.filter((c) => c.agenteId === a.id).length,
      total,
    }));
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-orion-navy dark:text-white">Kaizen 5S</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Checklist semanal de mejora continua, un foco distinto cada día. Se reinicia todas las
        semanas.
      </p>

      <KaizenChecklist tareas={tareas} completadasIds={misCompletados.map((c) => c.tareaId)} />

      {admin && (
        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-orion-navy dark:text-white">
            Avance del equipo esta semana
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Agente</th>
                  <th className="px-4 py-3 font-semibold text-right">Progreso</th>
                </tr>
              </thead>
              <tbody>
                {equipo.map((a) => (
                  <tr
                    key={a.nombre}
                    className="border-b border-gray-100 last:border-0 dark:border-gray-700"
                  >
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{a.nombre}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                      {a.completadas} / {a.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8">
            <KaizenAdmin tareas={tareas} />
          </div>
        </div>
      )}
    </div>
  );
}
