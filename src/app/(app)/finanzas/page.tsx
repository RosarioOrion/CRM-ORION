import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import {
  CATEGORIAS,
  categoria,
  GRUPO_LABEL,
  GRUPOS_EGRESO,
  hoyUY,
  mesAnterior,
  mesLabel,
  mesSiguiente,
  pesos,
  resumirMes,
} from "@/lib/finanzas";
import { filaMes, movimientosDelMes, sincronizarComisiones, ultimaCotizacion } from "@/lib/finanzas-datos";
import { BorrarMovimiento, FormCotizacion, FormMovimiento, FormPresupuesto } from "./componentes";
import { Privado } from "./privado";

// Mis finanzas: ingresos y gastos de cada agente. ULTRA PRIVADO.
export default async function FinanzasPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (sesion.suplantadoPor) return <Privado />;
  const yo = sesion.userId;

  const hoy = hoyUY();
  const { mes: mesParam } = await searchParams;
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : hoy.mes;

  await sincronizarComisiones(yo).catch(() => {});
  const [movs, fila, ultCot] = await Promise.all([movimientosDelMes(yo, mes), filaMes(yo, mes), ultimaCotizacion(yo)]);
  const cotizacion = fila?.cotizacion ?? ultCot;
  const r = resumirMes(movs, cotizacion);
  const presupuesto = fila?.presupuesto ?? {};
  const hayPresupuesto = Object.keys(presupuesto).length > 0;
  const esMesActual = mes === hoy.mes;
  const fecha = (d: Date) =>
    d.toLocaleDateString("es-UY", { timeZone: "America/Montevideo", day: "2-digit", month: "2-digit" });
  const tarjeta = (titulo: string, valor: number, clase: string, extra?: string) => (
    <div className={`rounded-xl border p-4 ${clase}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{titulo}</p>
      <p className="mt-1 text-xl font-bold">{pesos(valor)}</p>
      {extra && <p className="text-[11px] opacity-70">{extra}</p>}
    </div>
  );

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-orion-navy dark:text-white">💰 Mis finanzas</h1>
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/finanzas?mes=${mesAnterior(mes)}`} className="rounded-lg border border-gray-300 px-2 py-1 dark:border-gray-600">
            ‹
          </Link>
          <span className="min-w-36 text-center font-semibold capitalize text-gray-800 dark:text-gray-100">{mesLabel(mes)}</span>
          <Link href={`/finanzas?mes=${mesSiguiente(mes)}`} className="rounded-lg border border-gray-300 px-2 py-1 dark:border-gray-600">
            ›
          </Link>
        </div>
      </div>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        🔒 Solo vos ves esta sección: nadie más del equipo, ni siquiera la dirección. Las comisiones que cobrás en Orion
        entran solas como ingreso.
      </p>

      {esMesActual && (
        <Link
          href="/finanzas/money-day"
          className={`mb-5 block rounded-xl border px-4 py-3 text-sm ${
            hoy.ultimoDia
              ? "border-orion-gold bg-orion-gold/15 font-semibold text-orion-navy dark:text-orion-gold"
              : "border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          💵 {hoy.ultimoDia ? "¡Hoy es tu Money Day! Cerrá el mes y planeá el siguiente →" : "El Money Day es el último día de cada mes: cerrás el mes y planeás el siguiente. Ver →"}
        </Link>
      )}
      {fila?.cerradoEn && (
        <p className="mb-5 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
          ✓ Mes cerrado en el Money Day.{fila.notas ? ` Tus notas: “${fila.notas}”` : ""}
        </p>
      )}

      {r.faltaCotizacion || movs.some((m) => m.moneda === "USD") ? (
        <div className="mb-4">
          <FormCotizacion mes={mes} valor={fila?.cotizacion ?? ultCot} />
          {r.faltaCotizacion && (
            <p className="mt-1 text-xs text-amber-700">
              Tenés USD {r.dolaresSinConvertir.toLocaleString("es-UY")} sin pasar a pesos: cargá la cotización.
            </p>
          )}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tarjeta("Ingresos", r.ingresos, "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200", fila?.ingresoEsperado ? `esperado ${pesos(fila.ingresoEsperado)}` : undefined)}
        {tarjeta("Gastos", r.gastos, "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-900/20 dark:text-red-200", `personales ${pesos(r.porGrupo.FIJOS + r.porGrupo.VARIABLES)} · negocio ${pesos(r.porGrupo.NEGOCIO)}`)}
        {tarjeta("Impuestos y ahorro", r.separado, "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-900/20 dark:text-sky-200", "colchón, fondo, ahorro e impuestos")}
        {tarjeta("Saldo", r.saldo, r.saldo < 0 ? "border-red-300 bg-white text-red-700 dark:bg-gray-800" : "border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white", "lo que quedó sin asignar")}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Presupuesto vs real */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="mb-3 text-sm font-semibold text-orion-navy dark:text-white">
              {hayPresupuesto ? "Presupuesto vs. real" : "En qué se va la plata"}
            </p>
            {GRUPOS_EGRESO.map((g) => {
              const cats = CATEGORIAS.filter((c) => c.grupo === g && ((r.porCategoria[c.clave] ?? 0) > 0 || (presupuesto[c.clave] ?? 0) > 0));
              if (!cats.length) return null;
              return (
                <div key={g} className="mb-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{GRUPO_LABEL[g]}</p>
                  {cats.map((c) => {
                    const real = r.porCategoria[c.clave] ?? 0;
                    const plan = presupuesto[c.clave] ?? 0;
                    const pct = plan ? Math.min(100, (real / plan) * 100) : 100;
                    const pasado = plan > 0 && real > plan;
                    return (
                      <div key={c.clave} className="mb-1.5 text-sm">
                        <div className="flex justify-between text-gray-700 dark:text-gray-200">
                          <span>
                            {c.icono} {c.label}
                          </span>
                          <span className={pasado ? "font-semibold text-red-600" : ""}>
                            {pesos(real)}
                            {plan ? <span className="text-xs text-gray-400"> / {pesos(plan)}</span> : null}
                          </span>
                        </div>
                        {plan > 0 && (
                          <div className="h-1.5 rounded bg-gray-100 dark:bg-gray-700">
                            <div className={`h-1.5 rounded ${pasado ? "bg-red-500" : g === "AHORRO" || g === "IMPUESTOS" ? "bg-sky-500" : "bg-orion-gold"}`} style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {!movs.length && !hayPresupuesto && <p className="text-sm text-gray-400">Todavía no cargaste nada este mes.</p>}
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-semibold text-orion-navy dark:text-orion-gold">
                {hayPresupuesto ? "✏️ Cambiar el presupuesto de este mes" : "+ Armar el presupuesto de este mes"}
              </summary>
              <div className="mt-3">
                <FormPresupuesto mes={mes} presupuesto={presupuesto} ingresoEsperado={fila?.ingresoEsperado ?? null} boton="Guardar presupuesto" />
              </div>
            </details>
          </div>

          {/* Movimientos */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="mb-3 text-sm font-semibold text-orion-navy dark:text-white">Movimientos de {mesLabel(mes)}</p>
            {movs.filter((m) => !m.oculto).length === 0 ? (
              <p className="text-sm text-gray-400">Sin movimientos.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {movs
                  .filter((m) => !m.oculto)
                  .map((m) => {
                    const c = categoria(m.categoria);
                    const ingreso = m.tipo === "INGRESO";
                    return (
                      <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                        <span className="w-10 text-xs text-gray-400">{fecha(m.fecha)}</span>
                        <span>{c?.icono ?? "•"}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-gray-800 dark:text-gray-100">{c?.label ?? m.categoria}</span>
                          {m.nota && <span className="block truncate text-xs text-gray-400">{m.nota}</span>}
                        </span>
                        <span className={`font-semibold ${ingreso ? "text-emerald-600" : "text-gray-800 dark:text-gray-100"}`}>
                          {ingreso ? "+" : "−"} {m.moneda === "USD" ? `USD ${m.monto.toLocaleString("es-UY")}` : pesos(m.monto)}
                        </span>
                        <BorrarMovimiento id={m.id} />
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="mb-3 text-sm font-semibold text-orion-navy dark:text-white">Cargar movimiento</p>
            <FormMovimiento hoy={esMesActual ? hoy.fecha : `${mes}-01`} />
          </div>

          <details className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <summary className="cursor-pointer font-semibold text-orion-navy dark:text-white">📘 Bloque 3 del Manual: tus finanzas</summary>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Esta planilla es tu herramienta; cómo repartís tu dinero lo decidís vos según tu situación. Los capítulos
              están en Capacitación.
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong>Cap. 15 · Tu relación con el dinero.</strong> Págate primero, en cada cobro. Necesidades y deseos.
                Gastos hormiga.
              </li>
              <li>
                <strong>Cap. 16 · Repartir por porcentajes.</strong> Decidí una vez a dónde va cada peso y aplicalo el mismo día
                que cobrás.
              </li>
              <li>
                <strong>Cap. 17 · Control de gastos y Money Day.</strong> Registrá todos los días en las 5 categorías y cerrá
                cada mes comparando presupuesto contra real.
              </li>
              <li>
                <strong>Cap. 18 · Ingresos variables.</strong> Presupuesto base, sueldo fijo propio y colchón para los meses
                flojos.
              </li>
              <li>
                <strong>Cap. 19 · Emergencias, impuestos y deudas.</strong> Fondo de emergencia (no es el colchón), gastos
                anuales provisionados y plan para salir de deudas.
              </li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
