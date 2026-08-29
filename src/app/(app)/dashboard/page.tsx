import { db } from "@/db";
import { contactos, propiedades } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { eq, and, count } from "drizzle-orm";

export default async function DashboardPage() {
  const sesion = await obtenerSesion();

  const [{ totalContactos }] = await db
    .select({ totalContactos: count() })
    .from(contactos)
    .where(eq(contactos.agenteId, sesion!.userId));

  const [{ totalPropiedades }] = await db
    .select({ totalPropiedades: count() })
    .from(propiedades)
    .where(
      and(
        eq(propiedades.agenteId, sesion!.userId),
        eq(propiedades.estado, "ACTIVA")
      )
    );

  return (
    <div>
      <h1 className="text-2xl font-bold text-orion-navy">
        Hola, {sesion?.nombre?.split(" ")[0]} 👋
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Este es el primer bloque de CRM Orion: Contactos y Propiedades ya
        funcionando de verdad, conectados a una base de datos real.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Mis contactos
          </p>
          <p className="mt-2 text-3xl font-bold text-orion-navy">
            {totalContactos}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Propiedades activas
          </p>
          <p className="mt-2 text-3xl font-bold text-orion-navy">
            {totalPropiedades}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-orion-gold/50 bg-orion-gold/5 p-5">
        <p className="text-sm font-semibold text-orion-navy">
          Próximo en la hoja de ruta
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Pipeline semanal, Agenda de visitas, Captaciones y el motor de
          coincidencias (Fases 2 a 4).
        </p>
      </div>
    </div>
  );
}
