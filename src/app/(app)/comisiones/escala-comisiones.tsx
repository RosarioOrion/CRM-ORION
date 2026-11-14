import { inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { comisiones } from "@/db/schema";
import { escalaDe, obtenerNivelesComision, type EscalaAgente } from "@/lib/comisiones";
import { equipoVisible, type Rol } from "@/lib/permisos";

const usd = (n: number) => `USD ${n.toLocaleString("es-UY")}`;

/**
 * Escala de comisiones automática: en qué nivel está cada agente según lo
 * que lleva facturado y cuánto le falta para el siguiente. Cada uno ve la
 * suya; Líder, Administrador y CEO también la de los agentes de su equipo.
 */
export async function EscalaComisiones({ userId, rol }: { userId: string; rol: Rol }) {
  const equipo = (await equipoVisible(userId, rol)).filter((u) => u.rol === "AGENTE" && u.activo);
  if (equipo.length === 0) return null;
  const [niveles, totales] = await Promise.all([
    obtenerNivelesComision(),
    db
      .select({ id: comisiones.beneficiarioId, total: sql<string>`coalesce(sum(${comisiones.monto}), 0)` })
      .from(comisiones)
      .where(inArray(comisiones.beneficiarioId, equipo.map((u) => u.id)))
      .groupBy(comisiones.beneficiarioId),
  ]);
  if (niveles.length === 0) return null;
  const facturado = new Map(totales.map((t) => [t.id, Number(t.total)]));
  const filas = equipo.map((u) => ({ u, e: escalaDe(facturado.get(u.id) ?? 0, niveles) }));
  const propia = filas.find((f) => f.u.id === userId);
  const otros = filas.filter((f) => f.u.id !== userId);

  return (
    <div className="mb-6 flex flex-col gap-4">
      {propia && <TarjetaEscala titulo="Tu escala de comisiones" e={propia.e} />}
      {otros.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Escala de tu equipo</p>
          <div className="flex flex-col gap-3">
            {otros.map(({ u, e }) => (
              <div key={u.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold text-gray-800 dark:text-gray-100">{u.nombre}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {e.nivel?.nombre} {e.nivel?.porcentaje}% · {usd(e.facturado)}
                    {e.siguiente ? ` · le faltan ${usd(e.siguiente.facturacionMinima - e.facturado)} para ${e.siguiente.nombre}` : " · nivel máximo"}
                  </span>
                </div>
                <Barra avance={e.avance} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Barra({ avance }: { avance: number }) {
  return (
    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
      <div className="h-full rounded-full bg-orion-gold" style={{ width: `${avance}%` }} />
    </div>
  );
}

function TarjetaEscala({ titulo, e }: { titulo: string; e: EscalaAgente }) {
  return (
    <div className="rounded-xl border border-orion-gold/40 bg-white p-4 dark:border-orion-gold/30 dark:bg-gray-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">🏅 {titulo}</p>
      <p className="mt-1 text-lg font-bold text-orion-navy dark:text-white">
        {e.nivel?.nombre} · {e.nivel?.porcentaje}% de comisión
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-300">Llevás facturado {usd(e.facturado)} en comisiones.</p>
      <Barra avance={e.avance} />
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {e.siguiente
          ? `Te faltan ${usd(e.siguiente.facturacionMinima - e.facturado)} para ser ${e.siguiente.nombre} (${e.siguiente.porcentaje}%).`
          : "Llegaste al nivel máximo. 🎉"}
      </p>
    </div>
  );
}
