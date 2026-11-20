import { db } from "@/db";
import { conceptoVisible, esLineaDeEscala } from "@/lib/comisiones-texto";
import { comisiones, usuarios, reservasVenta, reservasAlquiler } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { equipoVisible, esCEO, esSupervisor } from "@/lib/permisos";
import { eq, desc, inArray } from "drizzle-orm";
import { TablaComisiones } from "./tabla-comisiones";
import { EscalaComisiones } from "./escala-comisiones";

export default async function ComisionesPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string; q?: string }>;
}) {
  const { ver: verParam, q: qParam } = await searchParams;
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
    // El reparto completo lo ve solo la CEO (ver comisiones-texto.ts).
    concepto: conceptoVisible(f.concepto, esCEO(sesion.rol)),
    porcentaje: esCEO(sesion.rol) || esLineaDeEscala(f.concepto) ? f.porcentaje : 0,
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

  const ceo = esCEO(sesion.rol);
  const yo = sesion.userId;
  const suma = (lista: typeof comisionesConNombre, pagada: boolean) =>
    lista.filter((c) => c.pagada === pagada).reduce((acc, c) => acc + c.monto, 0);

  // Mis comisiones (siempre separadas de las del resto).
  const mias = comisionesConNombre.filter((c) => c.beneficiarioId === yo);
  // Fondo de gastos de la empresa (10% de cada operación): solo lo ve la CEO.
  const gastos = comisionesConNombre.filter((c) => c.esGasto).reduce((acc, c) => acc + c.monto, 0);

  // Resumen por usuario (jefes): lo de cada persona visible, con buscador por nombre.
  const q = (qParam ?? "").trim();
  const normalizar = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const porUsuario = new Map<string, { id: string; nombre: string; cobrado: number; pendiente: number; lineas: number }>();
  for (const c of comisionesConNombre) {
    if (!c.beneficiarioId) continue;
    const r = porUsuario.get(c.beneficiarioId) ?? { id: c.beneficiarioId, nombre: c.beneficiarioNombre, cobrado: 0, pendiente: 0, lineas: 0 };
    if (c.pagada) r.cobrado += c.monto;
    else r.pendiente += c.monto;
    r.lineas++;
    porUsuario.set(c.beneficiarioId, r);
  }
  const resumen = [...porUsuario.values()]
    .filter((r) => !q || normalizar(r.nombre).includes(normalizar(q)))
    .sort((a, b) => b.cobrado + b.pendiente - (a.cobrado + a.pendiente));

  // Detalle: mías (por defecto), de una persona, todas o las de la empresa.
  const ver =
    !admin
      ? "mias"
      : verParam === "todas" || (verParam === "empresa" && ceo) || (verParam && porUsuario.has(verParam)) ? verParam : "mias";
  const detalle =
    ver === "mias"
      ? mias
      : ver === "todas"
      ? comisionesConNombre
      : ver === "empresa"
      ? comisionesConNombre.filter((c) => c.esGasto)
      : comisionesConNombre.filter((c) => c.beneficiarioId === ver);
  const tituloDetalle =
    ver === "mias"
      ? "Mis comisiones"
      : ver === "todas"
      ? "Todas las comisiones"
      : ver === "empresa"
      ? "Gastos de la empresa"
      : `Comisiones de ${porUsuario.get(ver)?.nombre ?? ""}`;
  const href = (v: string) => `/comisiones?ver=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const usd = (n: number) => `USD ${n.toLocaleString("es-UY")}`;
  const chip = (activo: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold transition ${
      activo
        ? "bg-orion-navy text-white"
        : "border border-gray-200 bg-white text-gray-600 hover:border-orion-navy dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
    }`;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-orion-navy dark:text-white">Comisiones</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {admin ? "Las tuyas y las de tu equipo, por separado." : `${mias.length} comisión(es) tuyas.`}
      </p>

      <EscalaComisiones userId={sesion.userId} rol={sesion.rol} />

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">Mis comisiones</h2>
      <div className={`mb-6 grid grid-cols-1 gap-4 ${ceo ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            💰 Pendiente de cobro
          </p>
          <p className="mt-1 text-xl font-bold text-amber-800 dark:text-amber-300">{usd(suma(mias, false))}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-900/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            ✓ Cobrado
          </p>
          <p className="mt-1 text-xl font-bold text-emerald-800 dark:text-emerald-300">{usd(suma(mias, true))}</p>
        </div>
        {ceo && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-900/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
              🏢 Fondo de gastos de la empresa
            </p>
            <p className="mt-1 text-xl font-bold text-sky-800 dark:text-sky-300">{usd(gastos)}</p>
            <p className="text-[11px] text-sky-700/80 dark:text-sky-300/80">10% de cada operación cerrada</p>
          </div>
        )}
      </div>

      {admin && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              {ceo ? "Comisiones por usuario" : "Comisiones de tu equipo"}
            </h2>
            <form action="/comisiones" method="GET" className="flex items-center gap-2">
              <input type="hidden" name="ver" value={ver} />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Buscar por nombre…"
                className="w-48 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-orion-navy dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
              <button type="submit" className="rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white">
                Buscar
              </button>
            </form>
          </div>
          {resumen.length === 0 ? (
            <p className="text-sm text-gray-400">{q ? `Nadie con “${q}”.` : "Todavía no hay comisiones."}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400 dark:border-gray-700">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">Usuario</th>
                    <th className="py-2 pr-4 text-right font-semibold">Generado</th>
                    <th className="py-2 pr-4 text-right font-semibold">Cobrado</th>
                    <th className="py-2 pr-4 text-right font-semibold">Pendiente</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {resumen.map((r) => (
                    <tr key={r.id} className={`border-b border-gray-100 last:border-0 dark:border-gray-700 ${ver === r.id ? "bg-orion-gold/10" : ""}`}>
                      <td className="py-2 pr-4 font-semibold text-gray-800 dark:text-gray-100">
                        {r.nombre}
                        {r.id === yo && <span className="ml-1 text-xs font-normal text-gray-400">(vos)</span>}
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-700 dark:text-gray-200">{usd(r.cobrado + r.pendiente)}</td>
                      <td className="py-2 pr-4 text-right text-emerald-700 dark:text-emerald-400">{usd(r.cobrado)}</td>
                      <td className="py-2 pr-4 text-right text-amber-700 dark:text-amber-400">{usd(r.pendiente)}</td>
                      <td className="py-2 text-right">
                        <a href={href(r.id === yo ? "mias" : r.id)} className="text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold">
                          Ver detalle ({r.lineas})
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {admin && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <a href={href("mias")} className={chip(ver === "mias")}>
            Mis comisiones
          </a>
          <a href={href("todas")} className={chip(ver === "todas")}>
            {ceo ? "Todas" : "Todo el equipo"}
          </a>
          {ceo && (
            <a href={href("empresa")} className={chip(ver === "empresa")}>
              🏢 Gastos de la empresa
            </a>
          )}
        </div>
      )}
      <h2 className="mb-2 text-sm font-semibold text-orion-navy dark:text-white">
        {tituloDetalle}
        <span className="ml-2 text-xs font-normal text-gray-400">
          {detalle.length} línea(s) · cobrado {usd(suma(detalle, true))} · pendiente {usd(suma(detalle, false))}
        </span>
      </h2>
      <TablaComisiones
        key={ver}
        comisiones={detalle}
        esAdmin={ceo}
        usuarios={edicion.usuarios}
        operaciones={edicion.operaciones}
      />
    </div>
  );
}
