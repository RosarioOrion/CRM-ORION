import { notFound } from "next/navigation";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { eq } from "drizzle-orm";
import { obtenerSesion } from "@/lib/auth";
import { CambiarPasswordForm } from "./cambiar-password-form";

export default async function AjustesPage() {
  const sesion = await obtenerSesion();
  if (!sesion) notFound();

  const [usuario] = await db
    .select({ nombre: usuarios.nombre, email: usuarios.email, telefono: usuarios.telefono })
    .from(usuarios)
    .where(eq(usuarios.id, sesion.userId));

  if (!usuario) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-bold text-orion-navy dark:text-white">Ajustes de cuenta</h1>

      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Tu usuario para iniciar sesión
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200">
          <span className="font-semibold">{usuario.nombre}</span>
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200">
          Email: <span className="font-semibold">{usuario.email}</span>
        </p>
        {usuario.telefono && (
          <p className="text-sm text-gray-700 dark:text-gray-200">
            Teléfono: <span className="font-semibold">{usuario.telefono}</span>
          </p>
        )}
        <p className="mt-2 text-xs text-gray-400">
          Este email es tu usuario para entrar a Orion. Anotalo en un lugar seguro.
        </p>
      </div>

      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Cambiar contraseña
        </p>
        <CambiarPasswordForm />
      </div>
    </div>
  );
}
