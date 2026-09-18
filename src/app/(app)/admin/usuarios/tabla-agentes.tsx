"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cambiarRolUsuario } from "./actions";

type Agente = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: "AGENTE" | "TEAM_LEADER" | "ADMINISTRADOR";
  propiedadesActivas: number;
  captaciones: number;
  visitasProgramadas: number;
};

const ROL_LABEL: Record<Agente["rol"], string> = {
  AGENTE: "Agente",
  TEAM_LEADER: "Team Leader",
  ADMINISTRADOR: "Administrador",
};

export function TablaAgentes({
  agentes,
  usuarioActualId,
}: {
  agentes: Agente[];
  usuarioActualId: string;
}) {
  const [, startTransition] = useTransition();
  const [roles, setRoles] = useState<Record<string, Agente["rol"]>>(
    Object.fromEntries(agentes.map((a) => [a.id, a.rol]))
  );

  function handleRolChange(id: string, rol: Agente["rol"]) {
    setRoles((r) => ({ ...r, [id]: rol }));
    startTransition(() => {
      cambiarRolUsuario(id, rol);
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400 dark:border-gray-700">
          <tr>
            <th className="px-4 py-3 font-semibold">Agente</th>
            <th className="px-4 py-3 font-semibold">Rol</th>
            <th className="px-4 py-3 font-semibold text-right">Propiedades activas</th>
            <th className="px-4 py-3 font-semibold text-right">Captaciones</th>
            <th className="px-4 py-3 font-semibold text-right">Visitas programadas</th>
          </tr>
        </thead>
        <tbody>
          {agentes.map((a) => (
            <tr key={a.id} className="border-b border-gray-100 last:border-0 dark:border-gray-700">
              <td className="px-4 py-3">
                <Link
                  href={`/admin/usuarios/${a.id}`}
                  className="font-semibold text-orion-navy hover:underline dark:text-white"
                >
                  {a.nombre}
                </Link>
                <p className="text-xs text-gray-400">
                  {a.email}
                  {a.telefono ? ` · ${a.telefono}` : ""}
                </p>
              </td>
              <td className="px-4 py-3">
                {a.id === usuarioActualId ? (
                  <span className="text-gray-500">{ROL_LABEL[roles[a.id]]}</span>
                ) : (
                  <select
                    value={roles[a.id]}
                    onChange={(e) => handleRolChange(a.id, e.target.value as Agente["rol"])}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                  >
                    <option value="AGENTE">Agente</option>
                    <option value="TEAM_LEADER">Team Leader</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                  </select>
                )}
              </td>
              <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                {a.propiedadesActivas}
              </td>
              <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                {a.captaciones}
              </td>
              <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                {a.visitasProgramadas}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
