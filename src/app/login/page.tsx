"use client";

import { useActionState } from "react";
import { iniciarSesion, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    iniciarSesion,
    initialState
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-orion-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orion-navy text-orion-gold text-2xl font-bold">
            O
          </div>
          <h1 className="text-2xl font-bold text-orion-navy">CRM Orion</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ingresá para ver tu pipeline
          </p>
        </div>

        <form
          action={formAction}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4">
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

          <div className="mb-5">
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
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy focus:ring-1 focus:ring-orion-navy"
              placeholder="••••••••"
            />
          </div>

          {state?.error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-orion-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orion-navy-light disabled:opacity-60"
          >
            {pending ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Usuario de prueba: rosario@crmorion.com
        </p>
      </div>
    </div>
  );
}
