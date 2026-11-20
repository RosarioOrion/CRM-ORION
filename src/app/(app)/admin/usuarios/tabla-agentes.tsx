"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  cambiarRolUsuario,
  cambiarEstadoUsuario,
  cambiarNivelComisionUsuario,
  cambiarPorcentajeLider,
  cambiarResponsable,
  eliminarUsuario,
} from "./actions";
import { entrarComo } from "./entrar-como-actions";

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
  rol: "AGENTE" | "TEAM_LEADER" | "ADMINISTRADOR" | "CEO";
  activo: boolean;
  teamLeaderId: string | null;
  nivelComision: string;
  porcentajeLider: number;
  propiedadesActivas: number;
  captaciones: number;
  visitasProgramadas: number;
  facturacionAcumulada: number;
};

const ROL_LABEL: Record<Agente["rol"], string> = {
  AGENTE: "Agente",
  TEAM_LEADER: "Líder",
  ADMINISTRADOR: "Administrador",
  CEO: "CEO",
};

// Quién puede ser responsable (tener gente a cargo) según el rol.
const PUEDE_SER_RESPONSABLE: Record<Agente["rol"], Agente["rol"][]> = {
  AGENTE: ["TEAM_LEADER", "ADMINISTRADOR", "CEO"],
  TEAM_LEADER: ["ADMINISTRADOR", "CEO"],
  ADMINISTRADOR: ["CEO"],
  CEO: [],
};

function formatoUsd(n: number) {
  return `USD ${Math.round(n).toLocaleString("es-UY")}`;
}

/**
 * Usuarios y sus equipos. La CEO gestiona todo (rol, responsable, estado,
 * nivel, eliminar); Administrador y Líder lo ven en solo lectura.
 */
export function TablaAgentes({
  agentes,
  usuarioActualId,
  niveles,
  puedeGestionar,
}: {
  agentes: Agente[];
  usuarioActualId: string;
  niveles: NivelConfig[];
  puedeGestionar: boolean;
}) {
  const [, startTransition] = useTransition();
  const [roles, setRoles] = useState<Record<string, Agente["rol"]>>(
    Object.fromEntries(agentes.map((a) => [a.id, a.rol]))
  );
  const [estados, setEstados] = useState<Record<string, boolean>>(
    Object.fromEntries(agentes.map((a) => [a.id, a.activo]))
  );
  const [responsables, setResponsables] = useState<Record<string, string>>(
    Object.fromEntries(agentes.map((a) => [a.id, a.teamLeaderId ?? ""]))
  );
  const [eliminados, setEliminados] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const nombre = new Map(agentes.map((a) => [a.id, a.nombre]));
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

  function handleResponsable(id: string, responsableId: string) {
    setResponsables((r) => ({ ...r, [id]: responsableId }));
    startTransition(async () => {
      const r = await cambiarResponsable(id, responsableId || null);
      if (r?.error) setError(r.error);
    });
  }

  function handleEliminar(a: Agente) {
    if (!window.confirm(`¿Eliminar a ${a.nombre}? No se puede deshacer.`)) return;
    setError(null);
    startTransition(async () => {
      const r = await eliminarUsuario(a.id);
      if (r.error) setError(r.error);
      else setEliminados((s) => new Set(s).add(a.id));
    });
  }

  function handleNivelChange(id: string, nivel: string) {
    setNivelesPorAgente((n) => ({ ...n, [id]: nivel }));
    startTransition(() => {
      cambiarNivelComisionUsuario(id, nivel);
    });
  }

  const sel = "rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800";
  return (
    <div>
    {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400 dark:border-gray-700">
          <tr>
            <th className="px-4 py-3 font-semibold">Agente</th>
            <th className="px-4 py-3 font-semibold">Rol</th>
            <th className="px-4 py-3 font-semibold">Responsable</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
            <th className="px-4 py-3 font-semibold">Nivel comisión</th>
            <th className="px-4 py-3 font-semibold text-right">Facturación acumulada</th>
            <th className="px-4 py-3 font-semibold text-right">Propiedades activas</th>
            <th className="px-4 py-3 font-semibold text-right">Captaciones</th>
            <th className="px-4 py-3 font-semibold text-right">Visitas programadas</th>
            {puedeGestionar && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {agentes.filter((a) => !eliminados.has(a.id)).map((a) => {
            const sugerido = nivelSugerido(a.facturacionAcumulada, niveles);
            const nivelActual = nivelesPorAgente[a.id];
            return (
              <tr key={a.id} className="border-b border-gray-100 last:border-0 dark:border-gray-700">
                <td className="px-4 py-3">
                  {puedeGestionar ? (
                    <Link
                      href={`/admin/usuarios/${a.id}`}
                      className="font-semibold text-orion-navy hover:underline dark:text-white"
                    >
                      {a.nombre}
                    </Link>
                  ) : (
                    <span className="font-semibold text-orion-navy dark:text-white">{a.nombre}</span>
                  )}
                  <p className="text-xs text-gray-400">
                    {a.email}
                    {a.telefono ? ` · ${a.telefono}` : ""}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {!puedeGestionar || roles[a.id] === "CEO" ? (
                    <span className="text-gray-600 dark:text-gray-300">{ROL_LABEL[roles[a.id]]}</span>
                  ) : (
                    <select
                      value={roles[a.id]}
                      onChange={(e) => handleRolChange(a.id, e.target.value as Agente["rol"])}
                      className={sel}
                    >
                      <option value="AGENTE">Agente</option>
                      <option value="TEAM_LEADER">Líder</option>
                      <option value="ADMINISTRADOR">Administrador</option>
                    </select>
                  )}
                </td>
                <td className="px-4 py-3">
                  {!puedeGestionar || roles[a.id] === "CEO" ? (
                    <span className="text-gray-600 dark:text-gray-300">
                      {responsables[a.id] ? nombre.get(responsables[a.id]) ?? "—" : "—"}
                    </span>
                  ) : (
                    <select
                      value={responsables[a.id]}
                      onChange={(e) => handleResponsable(a.id, e.target.value)}
                      className={sel}
                      aria-label={`Responsable de ${a.nombre}`}
                    >
                      <option value="">Sin asignar</option>
                      {agentes
                        .filter(
                          (r) =>
                            r.id !== a.id &&
                            !eliminados.has(r.id) &&
                            PUEDE_SER_RESPONSABLE[roles[a.id]].includes(roles[r.id])
                        )
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nombre} ({ROL_LABEL[roles[r.id]]})
                          </option>
                        ))}
                    </select>
                  )}
                </td>
                <td className="px-4 py-3">
                  {a.id === usuarioActualId || !puedeGestionar ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        estados[a.id]
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                          : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {estados[a.id] ? "Activo" : "Inactivo"}
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
                  {roles[a.id] === "AGENTE" ? (
                    // Agentes: el nivel es automático según lo facturado.
                    <span className="text-xs text-gray-700 dark:text-gray-200">
                      {sugerido ? `${sugerido.nombre} (${sugerido.porcentaje}%)` : "—"}
                      <span className="block text-[10px] text-gray-400">automático</span>
                    </span>
                  ) : (
                  <select
                    value={nivelActual}
                    onChange={(e) => handleNivelChange(a.id, e.target.value)}
                    disabled={!puedeGestionar}
                    className={`${sel} disabled:opacity-70`}
                  >
                    {niveles.map((n) => (
                      <option key={n.clave} value={n.clave}>
                        {n.nombre} ({n.porcentaje}%)
                      </option>
                    ))}
                  </select>
                  )}
                  {/* El % de líder lo cambia solo la CEO; el líder ve el suyo. */}
                  {!puedeGestionar && roles[a.id] === "TEAM_LEADER" && a.id === usuarioActualId && (
                    <span className="mt-1 block text-[10px] text-gray-500 dark:text-gray-400">
                      Como líder: {String(a.porcentajeLider).replace(".", ",")}% del equipo
                    </span>
                  )}
                  {puedeGestionar && roles[a.id] === "TEAM_LEADER" && (
                    <label className="mt-1 flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                      Como líder:
                      <input
                        type="number"
                        min={0}
                        max={40}
                        step={0.5}
                        defaultValue={a.porcentajeLider}
                        disabled={!puedeGestionar}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== a.porcentajeLider) startTransition(() => cambiarPorcentajeLider(a.id, v));
                        }}
                        className={`${sel} w-14 disabled:opacity-70`}
                      />
                      % del equipo
                    </label>
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
                {puedeGestionar && (
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {a.id !== usuarioActualId && roles[a.id] !== "CEO" && estados[a.id] && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm(`¿Entrar a Orion como ${a.nombre}? Vas a ver y usar Orion como esa persona; lo que hagas queda a su nombre.`)) return;
                          startTransition(async () => {
                            const r = await entrarComo(a.id);
                            if (r?.error) setError(r.error);
                          });
                        }}
                        className="mr-3 text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold"
                      >
                        Entrar como
                      </button>
                    )}
                    {a.id !== usuarioActualId && roles[a.id] !== "CEO" && (
                      <button
                        type="button"
                        onClick={() => handleEliminar(a)}
                        className="text-xs text-gray-400 hover:text-red-600"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </div>
  );
}
