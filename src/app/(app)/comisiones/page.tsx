import { db } from "@/db";
import { comisiones, usuarios, reservasVenta, reservasAlquiler } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { eq, desc, inArray } from "drizzle-orm";
import { TablaComisiones } from "./tabla-comisiones";

export default async function ComisionesPage() {
  const sesion = await obtenerSesion();
  if (!sesion) return null;
  const admin = esAdmin(sesion.rol);

  const filas = await db
    .select({
      id: comisiones.id,
      tipoOperacion: comisiones.tipoOperacion,
      reservaVentaId: comisiones.reservaVentaId,
      reservaAlquilerId: comisiones.reservaAlquilerId,
      concepto: comisiones.concepto,
      porcentaje: comisiones.porcentaje,
      monto: comisiones.monto,
      pagada: comisiones.pagada,
      creadoEn: comisiones.creadoEn,
      beneficiarioNombre: usuarios.nombre,
    })
    .from(comisiones)
    .innerJoin(usuarios, eq(comisiones.beneficiarioId, usuarios.id))
    .where(admin ? undefined : eq(comisiones.beneficiarioId, sesion.userId))
    .orderBy(desc(comisiones.creadoEn));

  const idsVenta = filas.map((f) => f.reservaVentaId).filter((id): id is string => !!id);
  const idsAlquiler = filas
    .map((f) => f.reservaAlquilerId)
    .filter((id): id is string => !!id);

  const [ventas, alquileres] = await Promise.all([
    idsVenta.length
      ? db
          .select({ id: reservasVenta.id, nombre: reservasVenta.nombrePropiedad })
          .from(reservasVenta)
          .where(inArray(reservasVenta.id, idsVenta))
      : Promise.resolve([]),
    idsAlquiler.length
      ? db
          .select({ id: reservasAlquiler.id, nombre: reservasAlquiler.nombrePropiedad })
          .from(reservasAlquiler)
          .where(inArray(reservasAlquiler.id, idsAlquiler))
      : Promise.resolve([]),
  ]);

  const nombreVenta = new Map(ventas.map((v) => [v.id, v.nombre]));
  const nombreAlquiler = new Map(alquileres.map((a) => [a.id, a.nombre]));

  const comisionesConNombre = filas.map((f) => ({
    id: f.id,
    concepto: f.concepto,
    porcentaje: f.porcentaje,
    monto: f.monto,
    pagada: f.pagada,
    beneficiarioNombre: f.beneficiarioNombre,
    tipoOperacion: f.tipoOperacion,
    creadoEn: f.creadoEn.toISOString(),
    propiedadNombre:
      (f.reservaVentaId ? nombreVenta.get(f.reservaVentaId) : null) ??
      (f.reservaAlquilerId ? nombreAlquiler.get(f.reservaAlquilerId) : null) ??
      "—",
  }));

  const pendiente = comisionesConNombre
    .filter((c) => !c.pagada)
    .reduce((acc, c) => acc + c.monto, 0);
  const cobrado = comisionesConNombre
    .filter((c) => c.pagada)
    .reduce((acc, c) => acc + c.monto, 0);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-orion-navy dark:text-white">Comisiones</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {comisionesConNombre.length} comisión(es) {admin ? "del equipo" : "tuyas"}.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            💰 Pendiente de cobro
          </p>
          <p className="mt-1 text-xl font-bold text-amber-800 dark:text-amber-300">
            USD {pendiente.toLocaleString("es-UY")}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-900/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            ✓ Cobrado
          </p>
          <p className="mt-1 text-xl font-bold text-emerald-800 dark:text-emerald-300">
            USD {cobrado.toLocaleString("es-UY")}
          </p>
        </div>
      </div>

      <TablaComisiones comisiones={comisionesConNombre} esAdmin={admin} />
    </div>
  );
}
