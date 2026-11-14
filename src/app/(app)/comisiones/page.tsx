import { db } from "@/db";
import { comisiones, usuarios, reservasVenta, reservasAlquiler } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { equipoVisible, esCEO, esSupervisor } from "@/lib/permisos";
import { eq, desc, inArray } from "drizzle-orm";
import { TablaComisiones } from "./tabla-comisiones";
import { EscalaComisiones } from "./escala-comisiones";

export default async function ComisionesPage() {
  const sesion = await obtenerSesion();
  if (!sesion) return null;
  // CEO: todas; Administrador y Líder: las de su equipo; agente: las suyas.
  // Marcar como cobrada: solo la CEO.
  const admin = esSupervisor(sesion.rol);
  const visibles = (await equipoVisible(sesion.userId, sesion.rol)).map((u) => u.id);

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
      beneficiarioId: comisiones.beneficiarioId,
    })
    .from(comisiones)
    .leftJoin(usuarios, eq(comisiones.beneficiarioId, usuarios.id))
    .where(esCEO(sesion.rol) ? undefined : inArray(comisiones.beneficiarioId, visibles))
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
    beneficiarioNombre: f.beneficiarioNombre ?? "🏢 Empresa",
    beneficiarioId: f.beneficiarioId,
    esGasto: f.beneficiarioNombre === null,
    tipoOperacion: f.tipoOperacion,
    creadoEn: f.creadoEn.toISOString(),
    propiedadNombre:
      (f.reservaVentaId ? nombreVenta.get(f.reservaVentaId) : null) ??
      (f.reservaAlquilerId ? nombreAlquiler.get(f.reservaAlquilerId) : null) ??
      "—",
  }));

  // Para la edición manual (solo CEO): usuarios y operaciones existentes.
  const edicion = esCEO(sesion.rol)
    ? await Promise.all([
        db.select({ id: usuarios.id, nombre: usuarios.nombre }).from(usuarios).orderBy(usuarios.nombre),
        db.select({ id: reservasVenta.id, nombre: reservasVenta.nombrePropiedad }).from(reservasVenta).orderBy(desc(reservasVenta.creadoEn)),
        db
          .select({ id: reservasAlquiler.id, nombre: reservasAlquiler.nombrePropiedad })
          .from(reservasAlquiler)
          .orderBy(desc(reservasAlquiler.creadoEn)),
      ]).then(([us, vs, as]) => ({
        usuarios: us,
        operaciones: [
          ...vs.map((v) => ({ id: `V:${v.id}`, nombre: `Venta · ${v.nombre}` })),
          ...as.map((a) => ({ id: `A:${a.id}`, nombre: `Alquiler · ${a.nombre}` })),
        ],
      }))
    : { usuarios: [], operaciones: [] };

  const deAgentes = comisionesConNombre.filter((c) => !c.esGasto);
  const pendiente = deAgentes.filter((c) => !c.pagada).reduce((acc, c) => acc + c.monto, 0);
  const cobrado = deAgentes.filter((c) => c.pagada).reduce((acc, c) => acc + c.monto, 0);
  // Fondo de gastos de la empresa (10% de cada operación): solo lo ve la CEO.
  const gastos = comisionesConNombre.filter((c) => c.esGasto).reduce((acc, c) => acc + c.monto, 0);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-orion-navy dark:text-white">Comisiones</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {deAgentes.length} comisión(es) {admin ? "del equipo" : "tuyas"}.
      </p>

      <EscalaComisiones userId={sesion.userId} rol={sesion.rol} />

      <div className={`mb-6 grid grid-cols-1 gap-4 ${esCEO(sesion.rol) ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
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
        {esCEO(sesion.rol) && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-900/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
              🏢 Fondo de gastos de la empresa
            </p>
            <p className="mt-1 text-xl font-bold text-sky-800 dark:text-sky-300">USD {gastos.toLocaleString("es-UY")}</p>
            <p className="text-[11px] text-sky-700/80 dark:text-sky-300/80">10% de cada operación cerrada</p>
          </div>
        )}
      </div>

      <TablaComisiones
        comisiones={comisionesConNombre}
        esAdmin={esCEO(sesion.rol)}
        usuarios={edicion.usuarios}
        operaciones={edicion.operaciones}
      />
    </div>
  );
}
