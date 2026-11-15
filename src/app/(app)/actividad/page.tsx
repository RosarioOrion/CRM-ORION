import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, gte, ilike, inArray, max, or, sql, count } from "drizzle-orm";
import { db } from "@/db";
import { registroActividad } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { equipoVisible, esSupervisor, ROL_LABEL } from "@/lib/permisos";
import { ENLACE_ENTIDAD, type Entidad } from "@/lib/registro-actividad";

// Registro de actividad: qué hizo cada persona en Orion. La CEO ve a todos;
// Administrador y Líder, a la gente de su equipo.

const PERIODOS = {
  hoy: { label: "Hoy", desde: sql`(date_trunc('day', now() AT TIME ZONE 'America/Montevideo') AT TIME ZONE 'America/Montevideo') AT TIME ZONE 'UTC'` },
  "7": { label: "Últimos 7 días", desde: sql`(now() AT TIME ZONE 'UTC') - interval '7 days'` },
  "30": { label: "Últimos 30 días", desde: sql`(now() AT TIME ZONE 'UTC') - interval '30 days'` },
} as const;
type Periodo = keyof typeof PERIODOS;
// Orden de los botones (las claves numéricas de un objeto no respetan el orden).
const ORDEN_PERIODOS: Periodo[] = ["hoy", "7", "30"];

const TZ = "America/Montevideo";
const hora = (d: Date) => d.toLocaleTimeString("es-UY", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dia = (d: Date) =>
  d.toLocaleDateString("es-UY", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const fechaCorta = (d: Date) =>
  d.toLocaleString("es-UY", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export default async function ActividadPage({
  searchParams,
}: {
  searchParams: Promise<{ usuario?: string; periodo?: string; q?: string }>;
}) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (!esSupervisor(sesion.rol)) redirect("/dashboard");

  const sp = await searchParams;
  const periodo: Periodo = sp.periodo && sp.periodo in PERIODOS ? (sp.periodo as Periodo) : "7";
  const q = (sp.q ?? "").trim();
  const equipo = await equipoVisible(sesion.userId, sesion.rol);
  const nombres = new Map(equipo.map((u) => [u.id, u]));
  const usuario = sp.usuario && nombres.has(sp.usuario) ? sp.usuario : "";
  const ids = usuario ? [usuario] : equipo.map((u) => u.id);
  const desde = PERIODOS[periodo].desde;

  const filtroTexto = q
    ? or(ilike(registroActividad.accion, `%${q}%`), ilike(registroActividad.detalle, `%${q}%`))
    : undefined;
  const base = and(inArray(registroActividad.usuarioId, ids), gte(registroActividad.creadoEn, desde), filtroTexto);

  const [movimientos, resumen, ultimos] = await Promise.all([
    db.select().from(registroActividad).where(base).orderBy(desc(registroActividad.creadoEn)).limit(300),
    db
      .select({ usuarioId: registroActividad.usuarioId, total: count() })
      .from(registroActividad)
      .where(and(inArray(registroActividad.usuarioId, equipo.map((u) => u.id)), gte(registroActividad.creadoEn, desde)))
      .groupBy(registroActividad.usuarioId),
    db
      .select({ usuarioId: registroActividad.usuarioId, ultimo: max(registroActividad.creadoEn) })
      .from(registroActividad)
      .where(inArray(registroActividad.usuarioId, equipo.map((u) => u.id)))
      .groupBy(registroActividad.usuarioId),
  ]);

  const totalDe = new Map(resumen.map((r) => [r.usuarioId, r.total]));
  const ultimoDe = new Map(ultimos.map((r) => [r.usuarioId, r.ultimo]));
  const filasEquipo = equipo
    .filter((u) => u.activo && u.aprobado)
    .map((u) => ({ ...u, total: totalDe.get(u.id) ?? 0, ultimo: ultimoDe.get(u.id) ?? null }))
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));

  // Movimientos agrupados por día.
  const porDia: { dia: string; items: typeof movimientos }[] = [];
  for (const m of movimientos) {
    const d = dia(m.creadoEn);
    const ultimo = porDia[porDia.length - 1];
    if (ultimo?.dia === d) ultimo.items.push(m);
    else porDia.push({ dia: d, items: [m] });
  }

  const href = (cambios: Partial<{ usuario: string; periodo: string; q: string }>) => {
    const p = new URLSearchParams();
    const v = { usuario, periodo, q, ...cambios };
    if (v.usuario) p.set("usuario", v.usuario);
    if (v.periodo !== "7") p.set("periodo", v.periodo);
    if (v.q) p.set("q", v.q);
    const s = p.toString();
    return s ? `/actividad?${s}` : "/actividad";
  };
  const chip = (activo: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold transition ${
      activo
        ? "bg-orion-navy text-white"
        : "border border-gray-200 bg-white text-gray-600 hover:border-orion-navy dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
    }`;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-orion-navy dark:text-white">Actividad</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Qué hizo cada persona {sesion.rol === "CEO" ? "del equipo" : "de tu equipo"} en Orion: ingresos, contactos,
        propiedades, captaciones, agenda, seguimientos, reservas y comisiones.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {ORDEN_PERIODOS.map((k) => (
          <Link key={k} href={href({ periodo: k })} className={chip(periodo === k)}>
            {PERIODOS[k].label}
          </Link>
        ))}
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Resumen · {PERIODOS[periodo].label.toLowerCase()}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400 dark:border-gray-700">
              <tr>
                <th className="py-2 pr-4 font-semibold">Usuario</th>
                <th className="py-2 pr-4 font-semibold">Rol</th>
                <th className="py-2 pr-4 text-right font-semibold">Acciones</th>
                <th className="py-2 pr-4 font-semibold">Último movimiento</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {filasEquipo.map((u) => (
                <tr
                  key={u.id}
                  className={`border-b border-gray-100 last:border-0 dark:border-gray-700 ${usuario === u.id ? "bg-orion-gold/10" : ""}`}
                >
                  <td className="py-2 pr-4 font-semibold text-gray-800 dark:text-gray-100">
                    {u.nombre}
                    {u.id === sesion.userId && <span className="ml-1 text-xs font-normal text-gray-400">(vos)</span>}
                  </td>
                  <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{ROL_LABEL[u.rol] ?? u.rol}</td>
                  <td className={`py-2 pr-4 text-right font-semibold ${u.total ? "text-gray-800 dark:text-gray-100" : "text-red-500"}`}>
                    {u.total}
                  </td>
                  <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{u.ultimo ? fechaCorta(u.ultimo) : "Sin registros"}</td>
                  <td className="py-2 text-right">
                    <Link
                      href={href({ usuario: usuario === u.id ? "" : u.id })}
                      className="text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold"
                    >
                      {usuario === u.id ? "Ver todos" : "Ver detalle"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-orion-navy dark:text-white">
          {usuario ? `Movimientos de ${nombres.get(usuario)?.nombre}` : "Todos los movimientos"}
          <span className="ml-2 text-xs font-normal text-gray-400">
            {movimientos.length === 300 ? "últimos 300" : `${movimientos.length}`}
          </span>
        </h2>
        <form action="/actividad" method="GET" className="flex items-center gap-2">
          {usuario && <input type="hidden" name="usuario" value={usuario} />}
          {periodo !== "7" && <input type="hidden" name="periodo" value={periodo} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar (ej. propiedad, contacto)…"
            className="w-56 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-orion-navy dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          <button type="submit" className="rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white">
            Buscar
          </button>
        </form>
      </div>

      {porDia.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400 dark:border-gray-700">
          {q ? `Nada con “${q}” en este período.` : "Sin movimientos en este período."}
        </p>
      ) : (
        <div className="space-y-4">
          {porDia.map((g) => (
            <div key={g.dia} className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <p className="border-b border-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-700">
                {g.dia}
              </p>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {g.items.map((m) => {
                  const enlace =
                    m.entidad && m.entidadId ? ENLACE_ENTIDAD[m.entidad as Entidad]?.(m.entidadId) : undefined;
                  const quien = nombres.get(m.usuarioId)?.nombre ?? "Usuario";
                  const suplantador = m.suplantadoPor ? nombres.get(m.suplantadoPor)?.nombre ?? "la CEO" : null;
                  return (
                    <li key={m.id} className="flex gap-3 px-4 py-2 text-sm">
                      <span className="w-12 shrink-0 tabular-nums text-gray-400">{hora(m.creadoEn)}</span>
                      <div className="min-w-0">
                        {!usuario && <span className="mr-1 font-semibold text-gray-800 dark:text-gray-100">{quien}:</span>}
                        <span className="text-gray-700 dark:text-gray-200">{m.accion}</span>
                        {m.detalle &&
                          (enlace ? (
                            <Link href={enlace} className="ml-1 text-orion-navy hover:underline dark:text-orion-gold">
                              · {m.detalle}
                            </Link>
                          ) : (
                            <span className="ml-1 text-gray-500 dark:text-gray-400">· {m.detalle}</span>
                          ))}
                        {suplantador && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            hecho por {suplantador} (Entrar como)
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
