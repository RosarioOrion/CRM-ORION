"use client";

import { useActionState } from "react";
import { crearCuenta, type RegistroState } from "./actions";

const initialState: RegistroState = {};

export default function RegistroPage() {
  const [state, formAction, pending] = useActionState(crearCuenta, initialState);

  if (state?.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-orion-bg px-4">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orion-navy text-orion-gold text-2xl font-bold">
            O
          </div>
          <h1 className="mb-2 text-xl font-bold text-orion-navy">
            ¡Listo! Tu solicitud fue enviada
          </h1>
          <p className="mb-6 text-sm text-gray-500">
            Un administrador va a revisar tu perfil y aprobar tu cuenta. Te
            va a avisar cuando ya puedas ingresar con tu email y contraseña.
          </p>
          <a
            href="/login"
            className="inline-block rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white hover:bg-orion-navy-light"
          >
            Volver al inicio de sesión
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-orion-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orion-navy text-orion-gold text-2xl font-bold">
            O
          </div>
          <h1 className="text-2xl font-bold text-orion-navy">Crear cuenta</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sumate al equipo en CRM Orion
          </p>
        </div>

        <form
          action={formAction}
          className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label
              htmlFor="nombre"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Nombre completo
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy focus:ring-1 focus:ring-orion-navy"
              placeholder="Juan Pérez"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy focus:ring-1 focus:ring-orion-navy"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="telefono"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Teléfono
            </label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy focus:ring-1 focus:ring-orion-navy"
              placeholder="099 123 456"
            />
          </div>

          <div>
            <label
              htmlFor="descripcion"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Presentación profesional
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              required
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy focus:ring-1 focus:ring-orion-navy"
              placeholder="Contanos tu experiencia en el rubro, especialidad (venta, alquiler, rural), zonas donde trabajás, etc."
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy focus:ring-1 focus:ring-orion-navy"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label
              htmlFor="confirmar"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Repetir contraseña
            </label>
            <input
              id="confirmar"
              name="confirmar"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy focus:ring-1 focus:ring-orion-navy"
              placeholder="••••••••"
            />
          </div>

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-orion-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orion-navy-light disabled:opacity-60"
          >
            {pending ? "Enviando…" : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Ya tenés cuenta?{" "}
          <a href="/login" className="font-semibold text-orion-navy hover:underline">
            Iniciar sesión
          </a>
        </p>
      </div>
    </div>
  );
}
