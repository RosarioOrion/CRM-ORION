"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cambiarRolUsuario, cambiarEstadoUsuario, cambiarNivelComisionUsuario } from "./actions";

// Nota: no importamos src/lib/comisiones.ts acá porque ese archivo toca la
// base (drizzle/postgres) a nivel de módulo, y esto es un componente
// cliente — así que la lógica de "nivel sugerido" está duplicada, chica,
// acá también (mismo criterio: el escalón más alto cuya facturación
// mínima ya se alcanzó).
type NivelConfig = {
  id: string;
  clave: string;
  nombre: string;
  facturacionMinima: number;
  porcentaje: number;
};

function nivelSugerido(facturacion: number, niveles: NivelConfig[]): NivelConfig | null {
  if (niveles.length === 0) return null;
  const alcanzados = niveles.filter((n) => facturacion >= n.facturacionMinima);
  return alcanzados.length > 0 ? alcanzados[alcanzados.length - 1] : niveles[0];
}

type Agente = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: "AGENTE" | "TEAM_LEADER" | "ADMINISTRADOR";
  activo: boolean;
  nivelComision: string;
  propiedadesActivas: number;
  captaciones: number;
  visitasProgramadas: number;
  facturacionAcumulada: number;
};

const ROL_LABEL: Record<Agente["rol"], string> = {
  AGENTE: "Agente",
  TEAM_LEADER: "Team Leader",
  ADMINISTRADOR: "Administrador",
};

function formatoUsd(n: number) {
  return `USD ${Math.round(n).toLocaleString("es-UY")}`;
}

export function TablaAgentes({
  agentes,
  usuarioActualId,
  niveles,
}: {
  agentes: Agente[];
  usuarioActualId: string;
  niveles: NivelConfig[];
}) {
  const [, startTransition] = useTransition();
  const [roles, setRoles] = useState<Record<string, Agente["rol"]>>(
    Object.fromEntries(agentes.map((a) => [a.id, a.rol]))
  );
  const [estados, setEstados] = useState<Record<string, boolean>>(
    Object.fromEntries(agentes.map((a) => [a.id, a.activo]))
  );
  const [nivelesPorAgente, setNivelesPorAgente] = useState<Record<string, string>>(
    Object.fromEntries(agentes.map((a) => [a.id, a.nivelComision]))
  );

  function handleRolChange(id: string, rol: Agente["rol"]) {
    setRoles((r) => ({ ...r, [id]: rol }));
    startTransition(() => {
      cambiarRolUsuario(id, rol);
    });
  }

  function handleEstadoToggle(id: string, activo: boolean) {
    setEstados((e) => ({ ...e, [id]: activo }));
    startTransition(() => {
      cambiarEstadoUsuario(id, activo);
    });
  }

  function handleNivelChange(id: string, nivel: string) {
    setNivelesPorAgente((n) => ({ ...n, [id]: nivel }));
    startTransition(() => {
      cambiarNivelComisionUsuario(id, nivel);
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400 dark:border-gray-700">
          <tr>
            <th className="px-4 py-3 font-semibold">Agente</th>
            <th className="px-4 py-3 font-semibold">Rol</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
            <th className="px-4 py-3 font-semibold">Nivel comisión</th>
            <th className="px-4 py-3 font-semibold text-right">Facturación acumulada</th>
            <th className="px-4 py-3 font-semibold text-right">Propiedades activas</th>
            <th className="px-4 py-3 font-semibold text-right">Captaciones</th>
            <th className="px-4 py-3 font-semibold text-right">Visitas programadas</th>
          </tr>
        </thead>
        <tbody>
          {agentes.map((a) => {
            const sugerido = nivelSugerido(a.facturacionAcumulada, niveles);
            const nivelActual = nivelesPorAgente[a.id];
            const sugerirCambio = sugerido && sugerido.clave !== nivelActual;
            return (
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
                <td className="px-4 py-3">
                  {a.id === usuarioActualId ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                      Activo
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEstadoToggle(a.id, !estados[a.id])}
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold transition ${
                        estados[a.id]
                          ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-400"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {estados[a.id] ? "Activo" : "Inactivo"}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={nivelActual}
                    onChange={(e) => handleNivelChange(a.id, e.target.value)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                  >
                    {niveles.map((n) => (
                      <option key={n.clave} value={n.clave}>
                        {n.nombre} ({n.porcentaje}%)
                      </option>
                    ))}
                  </select>
                  {sugerirCambio && (
                    <p className="mt-1 text-[11px] text-orion-gold">
                      💡 Le correspondería {sugerido!.nombre}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                  {formatoUsd(a.facturacionAcumulada)}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
