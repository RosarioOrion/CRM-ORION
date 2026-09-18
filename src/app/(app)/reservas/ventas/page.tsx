import { db } from "@/db";
import { reservasVenta, usuarios } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { NuevaReservaVentaForm } from "./nueva-reserva-venta-form";
import { TablaReservasVenta } from "./tabla-reservas-venta";

export default async function ReservasVentaPage() {
  const sesion = await obtenerSesion();
  if (!sesion) return null;
  const admin = esAdmin(sesion.rol);

  const filas = await db
    .select({
      id: reservasVenta.id,
      nombrePropiedad: reservasVenta.nombrePropiedad,
      estado: reservasVenta.estado,
      compradorNombre: reservasVenta.compradorNombre,
      vendedorNombre: reservasVenta.vendedorNombre,
      precioCierre: reservasVenta.precioCierre,
      comisionVendedor: reservasVenta.comisionVendedor,
      comisionComprador: reservasVenta.comisionComprador,
      porcentajePorParte: reservasVenta.porcentajePorParte,
      agenteId: reservasVenta.agenteId,
      agenteNombre: usuarios.nombre,
    })
    .from(reservasVenta)
    .innerJoin(usuarios, eq(reservasVenta.agenteId, usuarios.id))
    .where(admin ? undefined : eq(reservasVenta.agenteId, sesion.userId))
    .orderBy(desc(reservasVenta.creadoEn));

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
          Reservas de Venta
        </h1>
      </div>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {reservas.length} operación(es) {admin ? "del equipo" : "tuyas"}.
      </p>

      <div className="mb-6">
        <NuevaReservaVentaForm />
      </div>

      <TablaReservasVenta reservas={reservas} />
    </div>
  );
}
