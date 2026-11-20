import { db } from "@/db";
import { reservasVenta, usuarios } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { equipoVisible, esCEO, esSupervisor } from "@/lib/permisos";
import { eq, desc, inArray, or } from "drizzle-orm";
import { usuariosParaReparto } from "@/lib/reparto-reserva-form";
import { NuevaReservaVentaForm } from "./nueva-reserva-venta-form";
import { TablaReservasVenta } from "./tabla-reservas-venta";

export default async function ReservasVentaPage() {
  const sesion = await obtenerSesion();
  if (!sesion) return null;
  // CEO: todas; Administrador y Líder: las de su equipo; agente: las suyas.
  // Editar las de otro: solo la CEO.
  const admin = esSupervisor(sesion.rol);
  const visibles = (await equipoVisible(sesion.userId, sesion.rol)).map((u) => u.id);

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
      tipoComision: reservasVenta.tipoComision,
      quienPaga: reservasVenta.quienPaga,
      agentePropiedadId: reservasVenta.agentePropiedadId,
      agenteClienteId: reservasVenta.agenteClienteId,
      otraInmobiliaria: reservasVenta.otraInmobiliaria,
      orionAporta: reservasVenta.orionAporta,
      comisionesGeneradas: reservasVenta.comisionesGeneradas,
    })
    .from(reservasVenta)
    .innerJoin(usuarios, eq(reservasVenta.agenteId, usuarios.id))
    // Las compartidas las ven los dos agentes (y sus jefes).
    .where(
      esCEO(sesion.rol)
        ? undefined
        : or(
            inArray(reservasVenta.agenteId, visibles),
            inArray(reservasVenta.agentePropiedadId, visibles),
            inArray(reservasVenta.agenteClienteId, visibles)
          )
    )
    .orderBy(desc(reservasVenta.creadoEn));

  const reservas = filas.map((r) => ({
    ...r,
    puedeEditar:
      esCEO(sesion.rol) || [r.agenteId, r.agentePropiedadId, r.agenteClienteId].includes(sesion.userId),
  }));
  const usuariosReparto = await usuariosParaReparto();

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
        <NuevaReservaVentaForm usuarios={usuariosReparto} yoId={sesion.userId} esCeo={esCEO(sesion.rol)} />
      </div>

      <TablaReservasVenta
        reservas={reservas}
        usuarios={usuariosReparto}
        yoId={sesion.userId}
        esCeo={esCEO(sesion.rol)}
      />
    </div>
  );
}
