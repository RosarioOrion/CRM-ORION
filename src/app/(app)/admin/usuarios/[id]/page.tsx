import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { usuarios, propiedades, captaciones, visitas } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { esCEO, ROL_LABEL } from "@/lib/permisos";
import { eq, and, count, isNull } from "drizzle-orm";
import { EditarUsuarioForm } from "./editar-usuario-form";


export default async function PerfilUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sesion = await obtenerSesion();
  if (!sesion || !esCEO(sesion.rol)) {
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
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Datos del usuario
        </p>
        <EditarUsuarioForm
          usuario={{
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            telefono: usuario.telefono,
            descripcion: usuario.descripcion,
          }}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Actividad</p>
          <Link
            href={`/actividad?usuario=${usuario.id}`}
            className="text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold"
          >
            Ver registro de actividad →
          </Link>
        </div>
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
