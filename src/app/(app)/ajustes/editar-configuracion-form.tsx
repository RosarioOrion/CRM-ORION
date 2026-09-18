"use client";

import { useActionState, useState } from "react";
import { guardarConfiguracion, type ConfiguracionState } from "./actions";

const initialState: ConfiguracionState = {};

export function EditarConfiguracionForm({
  nombreCrm,
  nombreEmpresa,
  filosofia,
  colorPrimario,
  colorSecundario,
  logo,
  sistemaComisiones,
  telefonoEmpresa,
  emailEmpresa,
  direccion,
}: {
  nombreCrm: string;
  nombreEmpresa: string | null;
  filosofia: string | null;
  colorPrimario: string | null;
  colorSecundario: string | null;
  logo: string | null;
  sistemaComisiones: string | null;
  telefonoEmpresa: string | null;
  emailEmpresa: string | null;
  direccion: string | null;
}) {
  const [state, formAction, pending] = useActionState(guardarConfiguracion, initialState);
  const [previewLogo, setPreviewLogo] = useState<string | null>(logo);
  const [quitarLogo, setQuitarLogo] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-6 max-w-xl">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Identidad del CRM
        </p>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Nombre del CRM
            </span>
            <input
              name="nombreCrm"
              defaultValue={nombreCrm}
              required
              placeholder="Orion"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-800"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Nombre de la inmobiliaria
            </span>
            <input
              name="nombreEmpresa"
              defaultValue={nombreEmpresa ?? ""}
              placeholder="Lumen Propiedades"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-800"
            />
          </label>

          <div className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Logo
            </span>
            {previewLogo && !quitarLogo && (
              <div className="mb-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewLogo}
                  alt="Logo actual"
                  className="h-14 w-14 rounded-lg border border-gray-200 object-contain dark:border-gray-700"
                />
                <label className="flex items-center gap-2 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    name="quitarLogo"
                    value="1"
                    checked={quitarLogo}
                    onChange={(e) => setQuitarLogo(e.target.checked)}
                  />
                  Quitar logo actual
                </label>
              </div>
            )}
            <input
              type="file"
              name="logo"
              accept="image/*"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                if (!archivo) return;
                setQuitarLogo(false);
                const lector = new FileReader();
                lector.onload = () => setPreviewLogo(lector.result as string);
                lector.readAsDataURL(archivo);
              }}
              className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-orion-navy file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-orion-navy-light"
            />
            <span className="text-xs text-gray-400">JPG o PNG, hasta 5MB.</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Color primario
              </span>
              <input
                type="color"
                name="colorPrimario"
                defaultValue={colorPrimario ?? "#0a1f44"}
                className="h-10 w-full cursor-pointer rounded-lg border border-gray-300 dark:border-gray-600"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Color secundario
              </span>
              <input
                type="color"
                name="colorSecundario"
                defaultValue={colorSecundario ?? "#c9a869"}
                className="h-10 w-full cursor-pointer rounded-lg border border-gray-300 dark:border-gray-600"
              />
            </label>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Datos de la empresa
        </p>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Teléfono
            </span>
            <input
              name="telefonoEmpresa"
              defaultValue={telefonoEmpresa ?? ""}
              placeholder="099 123 456"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Email
            </span>
            <input
              name="emailEmpresa"
              type="email"
              defaultValue={emailEmpresa ?? ""}
              placeholder="contacto@lumen.com.uy"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Dirección
            </span>
            <input
              name="direccion"
              defaultValue={direccion ?? ""}
              placeholder="Av. Ejemplo 1234, Montevideo"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-800"
            />
          </label>
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Filosofía de la inmobiliaria
        </p>
        <textarea
          name="filosofia"
          defaultValue={filosofia ?? ""}
          rows={4}
          placeholder="Misión, valores, forma de trabajar del equipo..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-800"
        />
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Sistema de comisiones
        </p>
        <textarea
          name="sistemaComisiones"
          defaultValue={sistemaComisiones ?? ""}
          rows={4}
          placeholder="Ej: 50% para el agente captador, 50% para el agente vendedor. Escala por volumen..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-800"
        />
        <p className="mt-1 text-xs text-gray-400">
          Por ahora es un texto libre de referencia — todavía no calcula comisiones automáticamente.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar configuración"}
      </button>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">Configuración actualizada correctamente.</p>}
    </form>
  );
}
