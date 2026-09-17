import { redirect } from "next/navigation";
import { db } from "@/db";
import { usuarios, propiedades, captaciones, visitas } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { eq, and, count, isNull } from "drizzle-orm";
import { Pendientes } from "./pendientes";
import { TablaAgentes } from "./tabla-agentes";
import { NuevoUsuarioForm } from "./nuevo-usuario-form";

export default async function UsuariosPage() {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion.rol)) {
    redirect("/dashboard");
  }

  const [pendientes, activos, propiedadesActivas, captacionesEnCurso, visitasProgramadas] =
    await Promise.all([
      db
        .select({
          id: usuarios.id,
          nombre: usuarios.nombre,
          email: usuarios.email,
          telefono: usuarios.telefono,
          descripcion: usuarios.descripcion,
          creadoEn: usuarios.creadoEn,
        })
        .from(usuarios)
        .where(eq(usuarios.aprobado, false))
        .orderBy(usuarios.creadoEn),
      db
        .select({
          id: usuarios.id,
          nombre: usuarios.nombre,
          email: usuarios.email,
          telefono: usuarios.telefono,
          rol: usuarios.rol,
        })
        .from(usuarios)
        .where(eq(usuarios.aprobado, true))
        .orderBy(usuarios.nombre),
      db
        .select({ agenteId: propiedades.agenteId, total: count() })
        .from(propiedades)
        .where(eq(propiedades.estado, "ACTIVA"))
        .groupBy(propiedades.agenteId),
      db
        .select({ agenteId: captaciones.agenteId, total: count() })
        .from(captaciones)
        .where(isNull(captaciones.convertidaEnPropiedadId))
        .groupBy(captaciones.agenteId),
      db
        .select({ agenteId: visitas.agenteId, total: count() })
        .from(visitas)
        .where(eq(visitas.estado, "PROGRAMADA"))
        .groupBy(visitas.agenteId),
    ]);

  const mapaPropiedades = new Map(propiedadesActivas.map((p) => [p.agenteId, p.total]));
  const mapaCaptaciones = new Map(captacionesEnCurso.map((c) => [c.agenteId, c.total]));
  const mapaVisitas = new Map(visitasProgramadas.map((v) => [v.agenteId, v.total]));

  const agentes = activos.map((a) => ({
    ...a,
    propiedadesActivas: mapaPropiedades.get(a.id) ?? 0,
    captaciones: mapaCaptaciones.get(a.id) ?? 0,
    visitasProgramadas: mapaVisitas.get(a.id) ?? 0,
  }));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-orion-navy dark:text-white">
        Usuarios
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Aprobá las solicitudes de nuevos agentes, dales de alta a mano y mirá
        de un vistazo qué tiene cada uno en marcha.
      </p>

      <div className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-orion-navy dark:text-white">
          Solicitudes pendientes de aprobación ({pendientes.length})
        </h2>
        <Pendientes pendientesIniciales={pendientes} />
      </div>

      <NuevoUsuarioForm />
      <TablaAgentes agentes={agentes} usuarioActualId={sesion.userId} />
    </div>
  );
}
