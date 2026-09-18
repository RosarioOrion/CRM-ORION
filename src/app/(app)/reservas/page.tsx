import Link from "next/link";
import { db } from "@/db";
import { reservasVenta, reservasAlquiler, comisiones } from "@/db/schema";
import { ne, eq, and } from "drizzle-orm";

export default async function ReservasHubPage() {
  const [ventasEnProceso, alquileresEnProceso, comisionesVenta, comisionesAlquiler] =
    await Promise.all([
      db
        .select({ id: reservasVenta.id })
        .from(reservasVenta)
        .where(ne(reservasVenta.estado, "CANCELADA")),
      db
        .select({ id: reservasAlquiler.id })
        .from(reservasAlquiler)
        .where(ne(reservasAlquiler.estado, "CANCELADA")),
      db
        .select({ monto: comisiones.monto })
        .from(comisiones)
        .where(and(eq(comisiones.tipoOperacion, "VENTA"), eq(comisiones.pagada, false))),
      db
        .select({ monto: comisiones.monto })
        .from(comisiones)
        .where(and(eq(comisiones.tipoOperacion, "ALQUILER"), eq(comisiones.pagada, false))),
    ]);

  const porCobrarVenta = comisionesVenta.reduce((acc, c) => acc + c.monto, 0);
  const porCobrarAlquiler = comisionesAlquiler.reduce((acc, c) => acc + c.monto, 0);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-orion-navy dark:text-white">Reservas</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Elegí el tipo de reserva para gestionar.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/reservas/ventas"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-orion-navy dark:bg-gray-800 dark:border-gray-700"
        >
          <p className="text-lg font-semibold text-orion-navy dark:text-white">
            Reservas de Venta
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {ventasEnProceso.length} en proceso
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            USD {porCobrarVenta.toLocaleString("es-UY")} en comisiones por cobrar
          </p>
          <p className="mt-4 text-sm font-semibold text-orion-gold">Entrar →</p>
        </Link>

        <Link
          href="/reservas/alquileres"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-orion-navy dark:bg-gray-800 dark:border-gray-700"
        >
          <p className="text-lg font-semibold text-orion-navy dark:text-white">
            Reservas de Alquiler
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {alquileresEnProceso.length} en proceso
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            USD {porCobrarAlquiler.toLocaleString("es-UY")} en comisiones por cobrar
          </p>
          <p className="mt-4 text-sm font-semibold text-orion-gold">Entrar →</p>
        </Link>
      </div>
    </div>
  );
}
