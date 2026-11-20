import { db } from "@/db";
import { reservasAlquiler, usuarios } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { equipoVisible, esCEO, esSupervisor } from "@/lib/permisos";
import { eq, desc, inArray, or } from "drizzle-orm";
import { usuariosParaReparto } from "@/lib/reparto-reserva-form";
import { NuevaReservaAlquilerForm } from "./nueva-reserva-alquiler-form";
import { TablaReservasAlquiler } from "./tabla-reservas-alquiler";

export default async function ReservasAlquilerPage() {
  const sesion = await obtenerSesion();
  if (!sesion) return null;
  // CEO: todas; Administrador y Líder: las de su equipo; agente: las suyas.
  // Editar las de otro: solo la CEO.
  const admin = esSupervisor(sesion.rol);
  const visibles = (await equipoVisible(sesion.userId, sesion.rol)).map((u) => u.id);

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
      tipoComision: reservasAlquiler.tipoComision,
      quienPaga: reservasAlquiler.quienPaga,
      agentePropiedadId: reservasAlquiler.agentePropiedadId,
      agenteClienteId: reservasAlquiler.agenteClienteId,
      comisionPropietarioUsd: reservasAlquiler.comisionPropietarioUsd,
      comisionInquilinoUsd: reservasAlquiler.comisionInquilinoUsd,
      comisionesGeneradas: reservasAlquiler.comisionesGeneradas,
    })
    .from(reservasAlquiler)
    .innerJoin(usuarios, eq(reservasAlquiler.agenteId, usuarios.id))
    // Las compartidas las ven los dos agentes (y sus jefes).
    .where(
      esCEO(sesion.rol)
        ? undefined
        : or(
            inArray(reservasAlquiler.agenteId, visibles),
            inArray(reservasAlquiler.agentePropiedadId, visibles),
            inArray(reservasAlquiler.agenteClienteId, visibles)
          )
    )
    .orderBy(desc(reservasAlquiler.creadoEn));

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
          Reservas de Alquiler
        </h1>
      </div>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {reservas.length} operación(es) {admin ? "del equipo" : "tuyas"}.
      </p>

      <div className="mb-6">
        <NuevaReservaAlquilerForm usuarios={usuariosReparto} yoId={sesion.userId} esCeo={esCEO(sesion.rol)} />
      </div>

      <TablaReservasAlquiler
        reservas={reservas}
        esAdmin={admin}
        usuarios={usuariosReparto}
        yoId={sesion.userId}
        esCeo={esCEO(sesion.rol)}
      />
    </div>
  );
}
