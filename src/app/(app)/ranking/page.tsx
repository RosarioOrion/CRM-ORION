import { db } from "@/db";
import {
  usuarios,
  propiedades,
  reservasVenta,
  reservasAlquiler,
  comisiones,
} from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { eq, and, or, gte, inArray, count } from "drizzle-orm";
import { inicioMes } from "@/lib/productividad";
import {
  INSIGNIAS,
  insigniaGananciaAlcanzada,
  MINIMO_PIPELINE_SOLIDO,
} from "@/lib/ranking";

export default async function RankingPage() {
  const sesion = await obtenerSesion();
  if (!sesion) return null;

  const inicio = inicioMes();
  const ahora = new Date();
  const mesLabel = `${String(ahora.getMonth() + 1).padStart(2, "0")}/${ahora.getFullYear()}`;

  const agentes = await db
    .select({ id: usuarios.id, nombre: usuarios.nombre })
    .from(usuarios)
    .where(eq(usuarios.activo, true))
    .orderBy(usuarios.nombre);

  const [pipelineActivo, ventaFirmadas, alquilerFirmadas, filasComisiones] = await Promise.all([
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

  const mPipeline = new Map(pipelineActivo.map((f) => [f.agenteId, f.total]));
  const mVenta = new Map(ventaFirmadas.map((f) => [f.agenteId, f.total]));
  const mAlquiler = new Map(alquilerFirmadas.map((f) => [f.agenteId, f.total]));
  const mGanancia = new Map<string, number>();
  for (const f of filasComisiones) {
    mGanancia.set(f.beneficiarioId, (mGanancia.get(f.beneficiarioId) ?? 0) + f.monto);
  }

  const filas = agentes.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    pipeline: mPipeline.get(a.id) ?? 0,
    cierres: (mVenta.get(a.id) ?? 0) + (mAlquiler.get(a.id) ?? 0),
    ganancia: mGanancia.get(a.id) ?? 0,
  }));

  const ranking = [...filas].sort((a, b) => b.ganancia - a.ganancia);
  const hayGanancias = ranking.some((f) => f.ganancia > 0);

  const topCaptador = [...filas].sort((a, b) => b.pipeline - a.pipeline)[0];
  const topCierres = filas.filter((f) => f.cierres > 0).sort((a, b) => b.cierres - a.cierres)[0];
  const pipelineSolido = filas.filter((f) => f.pipeline >= MINIMO_PIPELINE_SOLIDO);

  const gananciaPorAgente = new Map(filas.map((f) => [f.id, f.ganancia]));

  function tenedoresDe(insigniaId: string): string[] {
    if (insigniaId === "TOP_CAPTADOR") {
      return topCaptador && topCaptador.pipeline > 0 ? [topCaptador.nombre] : [];
    }
    if (insigniaId === "TOP_CIERRES") {
      return topCierres ? [topCierres.nombre] : [];
    }
    if (insigniaId === "PIPELINE_SOLIDO") {
      return pipelineSolido.map((f) => f.nombre);
    }
    // Insignias de dinero: cualquier agente cuya ganancia del mes alcance ese umbral más alto.
    return filas
      .filter((f) => insigniaGananciaAlcanzada(gananciaPorAgente.get(f.id) ?? 0) === insigniaId)
      .map((f) => f.nombre);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-orion-navy dark:text-white">🏆 Ranking del Mes</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {mesLabel} · Ganancias netas por agente
        </p>
      </div>

      {topCaptador && topCaptador.pipeline > 0 && (
        <div className="mb-8 rounded-xl border border-orion-gold/40 bg-orion-gold/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy dark:text-orion-gold">
            🎯 Top Captador
          </p>
          <p className="mt-1 text-lg font-bold text-orion-navy dark:text-white">
            {topCaptador.nombre}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {topCaptador.pipeline} propiedades activas en pipeline
          </p>
        </div>
      )}

      {!hayGanancias ? (
        <p className="mb-8 rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:bg-gray-800 dark:border-gray-700">
          Aún sin operaciones cerradas este mes
        </p>
      ) : (
        <div className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {ranking
            .filter((f) => f.ganancia > 0)
            .map((f, i) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-3 border-b border-gray-50 px-4 py-3 text-sm last:border-0 dark:border-gray-700/50"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 text-center font-bold text-gray-400">{i + 1}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-100">{f.nombre}</span>
                </div>
                <span className="font-bold text-orion-navy dark:text-orion-gold">
                  USD {f.ganancia.toLocaleString("es-UY")}
                </span>
              </div>
            ))}
        </div>
      )}

      <p className="mb-8 text-xs text-gray-400">
        El ranking se actualiza automáticamente cuando se cierran ventas o alquileres.
      </p>

      <h2 className="mb-3 text-lg font-semibold text-orion-navy dark:text-white">
        Logros y Badges
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INSIGNIAS.map((ins) => {
          const tenedores = tenedoresDe(ins.id);
          return (
            <div
              key={ins.id}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <p className="text-2xl">{ins.icono}</p>
              <p className="mt-1 font-semibold text-gray-800 dark:text-gray-100">{ins.nombre}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{ins.descripcion}</p>
              <p className="mt-2 text-xs">
                {tenedores.length > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    🏅 {tenedores.join(", ")}
                  </span>
                ) : (
                  <span className="text-gray-400">Nadie por ahora este mes</span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
