"use client";

import { useActionState } from "react";
import Link from "next/link";
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-orion-gold">
            Sector agentes
          </p>
          <h1 className="mt-1 text-2xl font-bold text-orion-navy">CRM Orion</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ingresá con tu usuario y contraseña
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

          <div className="mb-4">
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

          <label className="mb-5 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="recordar"
              defaultChecked
              className="h-4 w-4 rounded border-gray-300 accent-orion-navy"
            />
            Mantener sesión iniciada en este dispositivo
          </label>

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

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Sos nuevo en el equipo?{" "}
          <a
            href="/registro"
            className="font-semibold text-orion-navy hover:underline"
          >
            Crear cuenta
          </a>
        </p>

        <p className="mt-3 text-center text-sm">
          <Link href="/" className="text-gray-500 hover:text-orion-navy hover:underline">
            ← Volver a la web
          </Link>
        </p>
      </div>
    </div>
  );
}
