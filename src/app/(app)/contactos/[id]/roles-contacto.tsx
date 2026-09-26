"use client";

import { useState, useTransition } from "react";
import { guardarRoles } from "../actions";
import {
  CATEGORIAS_CONTACTO,
  CATEGORIA_LABEL,
  CATEGORIA_COLOR,
  type CategoriaContacto,
} from "@/lib/contactos";

/**
 * Roles del contacto (ficha única): la misma persona puede ser propietaria,
 * lead, colega... El primero es el principal.
 */
export function RolesContacto({
  contactoId,
  roles: iniciales,
}: {
  contactoId: string;
  roles: CategoriaContacto[];
}) {
  const [roles, setRoles] = useState<CategoriaContacto[]>(iniciales);
  const [pending, start] = useTransition();

  function guardar(nuevos: CategoriaContacto[]) {
    const lista = nuevos.length ? nuevos : (["OTRO"] as CategoriaContacto[]);
    setRoles(lista);
    start(() => guardarRoles(contactoId, lista));
  }

  const disponibles = CATEGORIAS_CONTACTO.filter((c) => c !== "OTRO" && !roles.includes(c));
  const soloOtro = roles.length === 1 && roles[0] === "OTRO";

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${pending ? "opacity-60" : ""}`}>
      {roles.map((r) => (
        <span
          key={r}
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${CATEGORIA_COLOR[r]}`}
        >
          {CATEGORIA_LABEL[r]}
          {!soloOtro && (
            <button
              type="button"
              title="Quitar rol"
              disabled={pending}
              onClick={() => guardar(roles.filter((x) => x !== r))}
              className="ml-0.5 opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          )}
        </span>
      ))}
      {disponibles.length > 0 && (
        <select
          value=""
          disabled={pending}
          onChange={(e) => {
            const nuevo = e.target.value as CategoriaContacto;
            if (!nuevo) return;
            guardar([...roles.filter((x) => x !== "OTRO"), nuevo]);
          }}
          className="rounded-lg border border-dashed border-gray-300 bg-white px-2 py-0.5 text-xs font-semibold text-gray-500 outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="">+ Rol</option>
          {disponibles.map((c) => (
            <option key={c} value={c}>
              {CATEGORIA_LABEL[c]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
