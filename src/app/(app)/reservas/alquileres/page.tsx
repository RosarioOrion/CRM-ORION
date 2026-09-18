import { db } from "@/db";
import { reservasAlquiler, usuarios } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { NuevaReservaAlquilerForm } from "./nueva-reserva-alquiler-form";
import { TablaReservasAlquiler } from "./tabla-reservas-alquiler";

export default async function ReservasAlquilerPage() {
  const sesion = await obtenerSesion();
  if (!sesion) return null;
  const admin = esAdmin(sesion.rol);

  const filas = await db
    .select({
      id: reservasAlquiler.id,
      nombrePropiedad: reservasAlquiler.nombrePropiedad,
      estado: reservasAlquiler.estado,
      propietarioNombre: reservasAlquiler.propietarioNombre,
      inquilinoNombre: reservasAlquiler.inquilinoNombre,
      precioMensual: reservasAlquiler.precioMensual,
      moneda: reservasAlquiler.moneda,
      comisionTotalUsd: reservasAlquiler.comisionTotalUsd,
      agenteId: reservasAlquiler.agenteId,
      agenteNombre: usuarios.nombre,
    })
    .from(reservasAlquiler)
    .innerJoin(usuarios, eq(reservasAlquiler.agenteId, usuarios.id))
    .where(admin ? undefined : eq(reservasAlquiler.agenteId, sesion.userId))
    .orderBy(desc(reservasAlquiler.creadoEn));

  const reservas = filas.map((r) => ({
    ...r,
    puedeEditar: admin || r.agenteId === sesion.userId,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <a
          href="/reservas"
          className="text-sm text-gray-400 hover:text-orion-navy dark:hover:text-white"
        >
          Reservas
        </a>
        <span className="text-sm text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-orion-navy dark:text-white">
          Reservas de Alquiler
        </h1>
      </div>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {reservas.length} operación(es) {admin ? "del equipo" : "tuyas"}.
      </p>

      <div className="mb-6">
        <NuevaReservaAlquilerForm />
      </div>

      <TablaReservasAlquiler reservas={reservas} esAdmin={admin} />
    </div>
  );
}
