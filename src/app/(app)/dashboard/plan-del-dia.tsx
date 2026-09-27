import Link from "next/link";
import type { ItemPlan, PlanDelDia as Plan } from "@/lib/plan-del-dia";

const MAX = 5;

function Seccion({
  titulo,
  items,
  verTodos,
  vacio,
}: {
  titulo: string;
  items: ItemPlan[];
  verTodos?: string;
  vacio?: string;
}) {
  if (!items.length && !vacio) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {titulo} {items.length > 0 && `· ${items.length}`}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">{vacio}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.slice(0, MAX).map((it) => (
            <li key={it.id}>
              <Link
                href={it.href}
                className={`block rounded-lg border px-3 py-2 transition hover:border-orion-navy hover:bg-gray-50 dark:hover:bg-gray-700/40 ${
                  it.urgente
                    ? "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-900/20"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{it.titulo}</p>
                <p className={`text-xs ${it.urgente ? "text-red-700 dark:text-red-300" : "text-gray-500 dark:text-gray-400"}`}>
                  {it.detalle}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {items.length > MAX && verTodos && (
        <Link href={verTodos} className="mt-1 inline-block text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold">
          Ver los {items.length} →
        </Link>
      )}
    </div>
  );
}

/** Inicio: qué hacer primero hoy. */
export function PlanDelDia({ plan }: { plan: Plan }) {
  const total = plan.avisos.length + plan.seguimientos.length + plan.hoy.length + plan.quietas.length;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-orion-navy dark:text-white">📋 Plan del día</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {total === 0 ? "Todo al día ✅" : `${total} cosa(s) para atender, en orden de prioridad`}
        </p>
      </div>
      <div className="flex flex-col gap-5">
        <Seccion titulo="⛔ No respondieron al aviso final" items={plan.avisos} verTodos="/contactos?tab=seguimiento" />
        <Seccion
          titulo="⏰ Seguimientos para hoy"
          items={plan.seguimientos}
          verTodos="/contactos?tab=seguimiento"
          vacio="No tenés seguimientos pendientes para hoy."
        />
        <div>
          <Seccion titulo="📅 Hoy en la agenda" items={plan.hoy} verTodos="/agenda" vacio="Nada agendado para hoy." />
          {plan.agendaVencida > 0 && (
            <Link
              href="/agenda"
              className="mt-2 inline-block rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:underline dark:bg-red-900/30 dark:text-red-300"
            >
              ⚠️ {plan.agendaVencida} actividad(es) de días anteriores sin cerrar — ¿se hicieron?
            </Link>
          )}
        </div>
        <Seccion titulo="🏢 Propiedades sin movimiento" items={plan.quietas} verTodos="/pipeline" />
      </div>
    </div>
  );
}
