import { notFound } from "next/navigation";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { eq } from "drizzle-orm";
import { obtenerSesion } from "@/lib/auth";
import { CambiarPasswordForm } from "./cambiar-password-form";
import { EditarPerfilForm } from "./editar-perfil-form";

export default async function AjustesPage() {
  const sesion = await obtenerSesion();
  if (!sesion) notFound();

  const [usuario] = await db
    .select({
      nombre: usuarios.nombre,
      email: usuarios.email,
      telefono: usuarios.telefono,
      descripcion: usuarios.descripcion,
    })
    .from(usuarios)
    .where(eq(usuarios.id, sesion.userId));

  if (!usuario) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-bold text-orion-navy dark:text-white">Mi perfil</h1>

      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Datos del perfil
        </p>
        <p className="mb-4 text-sm text-gray-700 dark:text-gray-200">
          Email (tu usuario para entrar a Orion): <span className="font-semibold">{usuario.email}</span>
        </p>
        <EditarPerfilForm
          nombre={usuario.nombre}
          telefono={usuario.telefono}
          descripcion={usuario.descripcion}
        />
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
