import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  usuarios,
  contactos,
  propiedades,
  visitas,
  reservasVenta,
  reservasAlquiler,
  comisiones,
} from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { eq, and, or, gte, inArray, count } from "drizzle-orm";
import {
  PERIODOS_PRODUCTIVIDAD,
  PERIODO_PRODUCTIVIDAD_LABEL,
  inicioPeriodo,
  type PeriodoProductividad,
} from "@/lib/productividad";
import { FiltroPeriodo } from "./filtro-periodo";

export default async function ProductividadPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const sesion = await obtenerSesion();
  if (!sesion || !esAdmin(sesion.rol)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const periodo: PeriodoProductividad = PERIODOS_PRODUCTIVIDAD.includes(
    params.periodo as PeriodoProductividad
  )
    ? (params.periodo as PeriodoProductividad)
    : "SEMANA";

  const inicio = inicioPeriodo(periodo);

  const agentes = await db
    .select({ id: usuarios.id, nombre: usuarios.nombre, rol: usuarios.rol })
    .from(usuarios)
    .where(eq(usuarios.activo, true))
    .orderBy(usuarios.nombre);

  const [
    contactosNuevos,
    publicacionesNuevas,
    visitasAgendadas,
    pipelineActivo,
    ventaFirmadas,
    alquilerFirmadas,
    filasComisiones,
  ] = await Promise.all([
    db
      .select({ agenteId: contactos.agenteId, total: count() })
      .from(contactos)
      .where(gte(contactos.creadoEn, inicio))
      .groupBy(contactos.agenteId),
    db
      .select({ agenteId: propiedades.agenteId, total: count() })
      .from(propiedades)
      .where(gte(propiedades.creadoEn, inicio))
      .groupBy(propiedades.agenteId),
    db
      .select({ agenteId: visitas.agenteId, total: count() })
      .from(visitas)
      .where(gte(visitas.creadoEn, inicio))
      .groupBy(visitas.agenteId),
    db
      .select({ agenteId: propiedades.agenteId, total: count() })
      .from(propiedades)
      .where(eq(propiedades.estado, "ACTIVA"))
      .groupBy(propiedades.agenteId),
    db
      .select({ agenteId: reservasVenta.agenteId, total: count() })
      .from(reservasVenta)
      .where(
        and(
          inArray(reservasVenta.estado, ["BOLETO", "ESCRITURADA"]),
          or(gte(reservasVenta.fechaBoleto, inicio), gte(reservasVenta.fechaEscritura, inicio))
        )
      )
      .groupBy(reservasVenta.agenteId),
    db
      .select({ agenteId: reservasAlquiler.agenteId, total: count() })
      .from(reservasAlquiler)
      .where(and(eq(reservasAlquiler.estado, "FIRMADA"), gte(reservasAlquiler.fechaFirma, inicio)))
      .groupBy(reservasAlquiler.agenteId),
    db
      .select({ beneficiarioId: comisiones.beneficiarioId, monto: comisiones.monto })
      .from(comisiones)
      .where(gte(comisiones.creadoEn, inicio)),
  ]);

  const mapa = (filas: { agenteId: string; total: number }[]) =>
    new Map(filas.map((f) => [f.agenteId, f.total]));

  const mContactos = mapa(contactosNuevos);
  const mPublicaciones = mapa(publicacionesNuevas);
  const mVisitas = mapa(visitasAgendadas);
  const mPipeline = mapa(pipelineActivo);
  const mVentaFirmadas = mapa(ventaFirmadas);
  const mAlquilerFirmadas = mapa(alquilerFirmadas);

  const mComisiones = new Map<string, number>();
  for (const f of filasComisiones) {
    mComisiones.set(f.beneficiarioId, (mComisiones.get(f.beneficiarioId) ?? 0) + f.monto);
  }

  const filas = agentes.map((a) => {
    const reservasFirmadas = (mVentaFirmadas.get(a.id) ?? 0) + (mAlquilerFirmadas.get(a.id) ?? 0);
    return {
      id: a.id,
      nombre: a.nombre,
      rol: a.rol,
      contactos: mContactos.get(a.id) ?? 0,
      publicaciones: mPublicaciones.get(a.id) ?? 0,
      visitas: mVisitas.get(a.id) ?? 0,
      reservasFirmadas,
      pipeline: mPipeline.get(a.id) ?? 0,
      comisionUsd: mComisiones.get(a.id) ?? 0,
    };
  });

  const total = filas.reduce(
    (acc, f) => ({
      contactos: acc.contactos + f.contactos,
      publicaciones: acc.publicaciones + f.publicaciones,
      visitas: acc.visitas + f.visitas,
      reservasFirmadas: acc.reservasFirmadas + f.reservasFirmadas,
      pipeline: acc.pipeline + f.pipeline,
      comisionUsd: acc.comisionUsd + f.comisionUsd,
    }),
    { contactos: 0, publicaciones: 0, visitas: 0, reservasFirmadas: 0, pipeline: 0, comisionUsd: 0 }
  );

  const ROL_LABEL: Record<string, string> = {
    AGENTE: "Agente",
    TEAM_LEADER: "Team Leader",
    ADMINISTRADOR: "Administrador",
  };

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-orion-navy dark:text-white">
          Productividad del equipo
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {agentes.length} integrante(s) del equipo
        </p>
      </div>

      <FiltroPeriodo periodoActivo={periodo} />

      <h2 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Total del equipo
      </h2>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Contactos nuevos" valor={total.contactos} />
        <Tile label="Publicaciones nuevas" valor={total.publicaciones} />
        <Tile label="Visitas agendadas" valor={total.visitas} />
        <Tile label="Reservas firmadas" valor={total.reservasFirmadas} />
        <Tile label="Pipeline activo" valor={total.pipeline} />
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs uppercase tracking-wide text-gray-400">Comisiones generadas</p>
          <p className="mt-1 text-lg font-bold text-orion-navy dark:text-white">
            USD {total.comisionUsd.toLocaleString("es-UY")}
          </p>
          <p className="text-xs text-gray-400">UYU 0</p>
        </div>
      </div>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Por integrante
      </h2>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400 dark:border-gray-700">
              <th className="px-4 py-3">Agente</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Contactos</th>
              <th className="px-4 py-3">Publ.</th>
              <th className="px-4 py-3">Visitas</th>
              <th className="px-4 py-3">Reservas</th>
              <th className="px-4 py-3">Pipeline</th>
              <th className="px-4 py-3">Comisión</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className="border-b border-gray-50 last:border-0 dark:border-gray-700/50">
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{f.nombre}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {ROL_LABEL[f.rol] ?? f.rol}
                </td>
                <td className="px-4 py-3">{f.contactos}</td>
                <td className="px-4 py-3">{f.publicaciones}</td>
                <td className="px-4 py-3">{f.visitas}</td>
                <td className="px-4 py-3">{f.reservasFirmadas}</td>
                <td className="px-4 py-3">{f.pipeline}</td>
                <td className="px-4 py-3">USD {f.comisionUsd.toLocaleString("es-UY")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        {PERIODO_PRODUCTIVIDAD_LABEL[periodo]} · Pipeline activo es una foto del momento (no depende
        del período elegido).
      </p>
    </div>
  );
}

function Tile({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-orion-navy dark:text-white">{valor}</p>
    </div>
  );
}
