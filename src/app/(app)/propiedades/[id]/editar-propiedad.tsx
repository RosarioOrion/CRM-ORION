"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { editarPropiedad, type EditarPropiedadState } from "../actions";
import { PropiedadFormFields, type ValoresPropiedad } from "../nueva-propiedad-form";

const inicialState: EditarPropiedadState = {};

/**
 * Modo edición de la ficha: datos, características y descripción.
 * Las fotos (orden y borrados) viajan en el mismo formulario (`formId`).
 * Al guardar vuelve a la vista de la ficha.
 */
export function EditarPropiedad({
  propiedadId,
  valores,
  contactos,
  formId,
}: {
  propiedadId: string;
  valores: ValoresPropiedad;
  contactos: { id: string; nombre: string }[];
  formId: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(editarPropiedad, inicialState);
  const vista = `/propiedades/${propiedadId}`;

  const ok = state?.ok;
  useEffect(() => {
    if (!ok) return;
    const sp = new URLSearchParams({ guardado: "1" });
    if (state.portales) sp.set("precio", "1");
    if (state.aviso) sp.set("aviso", state.aviso);
    router.push(`${vista}?${sp.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  // Si se van a borrar fotos, pedir confirmación antes de guardar.
  function accion(fd: FormData) {
    const total = Number(fd.get("totalFotos") ?? 0);
    let quedan = total;
    try {
      quedan = (JSON.parse(String(fd.get("ordenFotos") ?? "[]")) as number[]).length;
    } catch {
      // sin cambios de fotos
    }
    const borra = total - quedan;
    if (borra > 0 && !window.confirm(`Se van a borrar ${borra} foto(s). Esto no se puede deshacer. ¿Guardar?`)) return;
    formAction(fd);
  }

  return (
    <PropiedadFormFields
      formId={formId}
      contactos={contactos}
      formAction={accion}
      pending={pending}
      error={state?.error}
      inicial={valores}
      titulo="Datos, características y descripción"
      textoBoton="Guardar cambios"
      extraArriba={<input type="hidden" name="propiedadId" value={propiedadId} />}
      extraAbajo={
        <label className="sm:col-span-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
          <input type="checkbox" name="actualizarTextos" value="1" defaultChecked className="mt-0.5" />
          <span>
            Si cambio el precio, actualizarlo también donde esté escrito en el título y la descripción (queda
            registrado en el historial de precios).
          </span>
        </label>
      }
      botonesExtra={
        <Link
          href={vista}
          className="ml-2 inline-block rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancelar
        </Link>
      }
    />
  );
}
