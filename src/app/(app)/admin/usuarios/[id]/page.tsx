import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { usuarios, propiedades, captaciones, visitas } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { eq, and, count, isNull } from "drizzle-orm";

const ROL_LABEL: Record<string, string> = {
  AGENTE: "Agente",
  TEAM_LEADER: "Team Leader",
  ADMINISTRADOR: "Administrador",
};

export default async function PerfilUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion.rol)) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const [usuario] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      telefono: usuarios.telefono,
      descripcion: usuarios.descripcion,
      rol: usuarios.rol,
      aprobado: usuarios.aprobado,
      creadoEn: usuarios.creadoEn,
    })
    .from(usuarios)
    .where(eq(usuarios.id, id));

  if (!usuario) notFound();

  const [[propiedadesActivas], [captacionesEnCurso], [visitasProgramadas]] =
    await Promise.all([
      db
        .select({ total: count() })
        .from(propiedades)
        .where(
          and(eq(propiedades.agenteId, usuario.id), eq(propiedades.estado, "ACTIVA"))
        ),
      db
        .select({ total: count() })
        .from(captaciones)
        .where(
          and(
            eq(captaciones.agenteId, usuario.id),
            isNull(captaciones.convertidaEnPropiedadId)
          )
        ),
      db
        .select({ total: count() })
        .from(visitas)
        .where(
          and(eq(visitas.agenteId, usuario.id), eq(visitas.estado, "PROGRAMADA"))
        ),
    ]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin/usuarios"
        className="mb-4 inline-block text-sm text-gray-500 hover:underline dark:text-gray-400"
      >
        ← Volver a Usuarios
      </Link>

      <h1 className="mb-1 text-xl font-bold text-orion-navy dark:text-white">
        {usuario.nombre}
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {ROL_LABEL[usuario.rol] ?? usuario.rol}
        {!usuario.aprobado && " · Pendiente de aprobación"}
      </p>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Datos de contacto
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200">
          Email: <span className="font-semibold">{usuario.email}</span>
        </p>
        {usuario.telefono && (
          <p className="text-sm text-gray-700 dark:text-gray-200">
            Teléfono: <span className="font-semibold">{usuario.telefono}</span>
          </p>
        )}
      </div>

      {usuario.descripcion && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Presentación profesional
          </p>
          <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">
            {usuario.descripcion}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Actividad
        </p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-orion-navy dark:text-white">
              {propiedadesActivas.total}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Propiedades activas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orion-navy dark:text-white">
              {captacionesEnCurso.total}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Captaciones</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orion-navy dark:text-white">
              {visitasProgramadas.total}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Visitas programadas</p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Para cambiarle el rol o aprobar/rechazar una solicitud, hacelo desde la tabla en{" "}
        <Link href="/admin/usuarios" className="underline">
          Usuarios
        </Link>
        .
      </p>
    </div>
  );
}
