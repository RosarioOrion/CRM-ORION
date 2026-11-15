import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import {
  CATEGORIAS,
  consejosDelMes,
  GRUPO_LABEL,
  hoyUY,
  mesAnterior,
  mesLabel,
  mesSiguiente,
  pesos,
  resumirMes,
  type Grupo,
} from "@/lib/finanzas";
import {
  filaMes,
  indicadoresHistoricos,
  movimientosDelMes,
  sincronizarComisiones,
  ultimaCotizacion,
} from "@/lib/finanzas-datos";
import { FormCotizacion, FormPresupuesto } from "../componentes";
import { Privado } from "../privado";

// Money Day: el último día de cada mes se cierra el mes (balance y consejos)
// y se planea el siguiente (presupuesto e ingreso esperado). Privado.
export default async function MoneyDayPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (sesion.suplantadoPor) return <Privado />;
  const yo = sesion.userId;
  const hoy = hoyUY();
  const { mes: mesParam } = await searchParams;

  // Qué mes se cierra: el que se pide, o el actual el último día, o el
  // anterior si quedó sin cerrar (primeros días del mes).
  let mes = hoy.mes;
  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) mes = mesParam;
  else if (!hoy.ultimoDia && hoy.dia <= 7) {
    const ant = await filaMes(yo, mesAnterior(hoy.mes));
    if (!ant?.cerradoEn) mes = mesAnterior(hoy.mes);
  }
  const siguiente = mesSiguiente(mes);

  await sincronizarComisiones(yo).catch(() => {});
  const [movs, fila, filaSig, ultCot] = await Promise.all([
    movimientosDelMes(yo, mes),
    filaMes(yo, mes),
    filaMes(yo, siguiente),
    ultimaCotizacion(yo),
  ]);
  const cotizacion = fila?.cotizacion ?? null;
  const hayDolares = movs.some((m) => !m.oculto && m.moneda === "USD");
  const r = resumirMes(movs, cotizacion ?? (hayDolares ? null : ultCot));
  const presupuesto = fila?.presupuesto ?? {};
  const hist = await indicadoresHistoricos(yo, cotizacion ?? ultCot);
  const consejos = consejosDelMes({ resumen: r, presupuesto, ...hist });
  const paso = "mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800";
  const titulo = (n: number, t: string) => (
    <p className="mb-3 flex items-center gap-2 text-base font-bold text-orion-navy dark:text-white">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orion-gold text-sm text-orion-navy">{n}</span>
      {t}
    </p>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/finanzas?mes=${mes}`} className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold">
        ← Volver a Mis finanzas
      </Link>
      <h1 className="text-2xl font-bold text-orion-navy dark:text-white">💵 Money Day · <span className="capitalize">{mesLabel(mes)}</span></h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Cerrá el mes, mirá en qué se fue la plata y planeá {mesLabel(siguiente)}. 🔒 Solo vos ves esto.
        {fila?.cerradoEn && " Este mes ya lo cerraste; podés volver a revisarlo."}
      </p>

      <div className={paso}>
        {titulo(1, "Balance del mes")}
        {hayDolares && (
          <div className="mb-3">
            <FormCotizacion mes={mes} valor={cotizacion ?? ultCot} />
            {!cotizacion && <p className="mt-1 text-xs text-amber-700">Cargá la cotización del mes para pasar los dólares a pesos.</p>}
          </div>
        )}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Entró", r.ingresos, "text-emerald-700 dark:text-emerald-300"],
            ["Gastos", r.trabajo + r.personal, "text-red-700 dark:text-red-300"],
            ["Reservas", r.reservas, "text-sky-700 dark:text-sky-300"],
            ["Saldo", r.saldo, r.saldo < 0 ? "text-red-700" : "text-gray-900 dark:text-white"],
          ].map(([l, v, c]) => (
            <div key={l as string} className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-900/40">
              <p className="text-xs text-gray-500">{l}</p>
              <p className={`text-lg font-bold ${c}`}>{pesos(v as number)}</p>
            </div>
          ))}
        </div>
        {fila?.ingresoEsperado ? (
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
            Esperabas {pesos(fila.ingresoEsperado)} y entró {pesos(r.ingresos)} (
            {r.ingresos >= fila.ingresoEsperado ? "✓ se cumplió" : `faltaron ${pesos(fila.ingresoEsperado - r.ingresos)}`}).
          </p>
        ) : null}
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-gray-400">
            <tr>
              <th className="py-1 text-left">Categoría</th>
              <th className="py-1 text-right">Previsto</th>
              <th className="py-1 text-right">Real</th>
            </tr>
          </thead>
          <tbody>
            {(["TRABAJO", "PERSONAL", "RESERVA"] as Grupo[]).map((g) => {
              const cats = CATEGORIAS.filter((c) => c.grupo === g && ((r.porCategoria[c.clave] ?? 0) > 0 || (presupuesto[c.clave] ?? 0) > 0));
              if (!cats.length) return null;
              return [
                <tr key={g}>
                  <td colSpan={3} className="pt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {GRUPO_LABEL[g]}
                  </td>
                </tr>,
                ...cats.map((c) => {
                  const real = r.porCategoria[c.clave] ?? 0;
                  const plan = presupuesto[c.clave] ?? 0;
                  return (
                    <tr key={c.clave} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-1 text-gray-700 dark:text-gray-200">
                        {c.icono} {c.label}
                      </td>
                      <td className="py-1 text-right text-gray-500">{plan ? pesos(plan) : "—"}</td>
                      <td className={`py-1 text-right font-semibold ${plan && real > plan * 1.1 ? "text-red-600" : "text-gray-800 dark:text-gray-100"}`}>
                        {pesos(real)}
                      </td>
                    </tr>
                  );
                }),
              ];
            })}
          </tbody>
        </table>
      </div>

      <div className={paso}>
        {titulo(2, "Cómo te fue")}
        <ul className="flex flex-col gap-2">
          {consejos.map((c, i) => (
            <li
              key={i}
              className={`rounded-lg px-3 py-2 text-sm ${
                c.tono === "bien"
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : c.tono === "atencion"
                  ? "bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                  : "bg-gray-50 text-gray-700 dark:bg-gray-900/40 dark:text-gray-200"
              }`}
            >
              {c.tono === "bien" ? "✅ " : c.tono === "atencion" ? "⚠️ " : "💡 "}
              {c.texto}
            </li>
          ))}
        </ul>
      </div>

      <div className={paso}>
        {titulo(3, `Planeá ${mesLabel(siguiente)}`)}
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Arranca con el presupuesto de este mes; al lado de cada categoría ves lo que gastaste de verdad.
        </p>
        <FormPresupuesto
          mes={siguiente}
          presupuesto={Object.keys(filaSig?.presupuesto ?? {}).length ? filaSig!.presupuesto : presupuesto}
          ingresoEsperado={filaSig?.ingresoEsperado ?? null}
          referencia={r.porCategoria}
          cerrarMes={mes}
          boton={`✅ Cerrar ${mesLabel(mes)} y guardar el plan`}
        />
      </div>
    </div>
  );
}
