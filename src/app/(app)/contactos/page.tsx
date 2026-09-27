import Link from "next/link";
import { db } from "@/db";
import { contactos, seguimientos } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { eq, desc, and, or, ilike, inArray, sql } from "drizzle-orm";
import { NuevoContactoForm } from "./nuevo-contacto-form";
import {
  CATEGORIA_LABEL,
  CATEGORIA_COLOR,
  GRUPOS_CATEGORIA,
  rolesDe,
} from "@/lib/contactos";
import { ahoraUY } from "@/lib/calendario";
import { estadoSeguimiento, etiquetaEstado, type SeguimientoMin } from "@/lib/seguimientos";

const TABS: { key: string; label: string }[] = [
  { key: "activos", label: "Activos" },
  { key: "todos", label: "Todos" },
  { key: "seguimiento", label: "⏰ Seguimiento" },
  ...GRUPOS_CATEGORIA.map((g) => ({ key: g.key, label: g.label })),
];

export default async function ContactosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const tabParam = params.tab ?? "activos";
  const tabActivo = TABS.some((t) => t.key === tabParam) ? tabParam : "activos";

  const sesion = await obtenerSesion();

  const condiciones = [eq(contactos.agenteId, sesion!.userId)];
  if (tabActivo === "activos") {
    condiciones.push(eq(contactos.archivado, false));
  } else {
    const grupo = GRUPOS_CATEGORIA.find((g) => g.key === tabActivo);
    if (grupo) {
      // Por cualquiera de sus roles, no solo el principal.
      condiciones.push(
        or(
          inArray(contactos.categoria, grupo.categorias),
          sql`${contactos.roles} ?| array[${sql.join(
            grupo.categorias.map((c) => sql`${c}`),
            sql`, `
          )}]::text[]`
        )!
      );
    }
  }
  if (q) {
    condiciones.push(
      or(
        ilike(contactos.nombre, `%${q}%`),
        ilike(contactos.telefono, `%${q}%`),
        ilike(contactos.email, `%${q}%`)
      )!
    );
  }

  const encontrados = await db
    .select()
    .from(contactos)
    .where(and(...condiciones))
    .orderBy(desc(contactos.creadoEn));

  // Estado de seguimiento de cada contacto (regla de contacto frío).
  const ahora = ahoraUY();
  const porContacto = new Map<string, SeguimientoMin[]>();
  if (encontrados.length) {
    const segs = await db
      .select({
        contactoId: seguimientos.contactoId,
        fecha: seguimientos.fecha,
        respondio: seguimientos.respondio,
        avisoFinal: seguimientos.avisoFinal,
        proximaFecha: seguimientos.proximaFecha,
      })
      .from(seguimientos)
      .where(eq(seguimientos.agenteId, sesion!.userId));
    for (const sg of segs) {
      if (!porContacto.has(sg.contactoId)) porContacto.set(sg.contactoId, []);
      porContacto.get(sg.contactoId)!.push(sg);
    }
  }
  const estados = new Map(
    encontrados.map((c) => [c.id, estadoSeguimiento(porContacto.get(c.id) ?? [], c.frioDesde, ahora)])
  );
  // Pestaña "Seguimiento": lo que hay que hacer (vencidos y avisos sin respuesta).
  const necesitaAccion = (id: string) => {
    const e = estados.get(id)!;
    return e.tipo === "NO_RESPONDIO_AVISO" || e.vencido;
  };
  const misContactos =
    tabActivo === "seguimiento"
      ? encontrados
          .filter((c) => !c.archivado && necesitaAccion(c.id))
          .sort((a, b) => {
            const pa = estados.get(a.id)!.proxima?.getTime() ?? 0;
            const pb = estados.get(b.id)!.proxima?.getTime() ?? 0;
            return pa - pb;
          })
      : encontrados;

  function hrefTab(tab: string) {
    const sp = new URLSearchParams();
    sp.set("tab", tab);
    if (q) sp.set("q", q);
    return `/contactos?${sp.toString()}`;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-orion-navy dark:text-white">
            Contactos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {misContactos.length} contacto(s)
          </p>
        </div>

        <form action="/contactos" method="GET" className="flex items-center gap-2">
          <input type="hidden" name="tab" value={tabActivo} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre, teléfono o email..."
            className="w-72 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-orion-navy dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="submit"
            className="rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-orion-navy-light"
          >
            Buscar
          </button>
        </form>
      </div>

      <div className="mb-6">
        <NuevoContactoForm />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={hrefTab(t.key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              tabActivo === t.key
                ? "bg-orion-navy text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-orion-navy dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {misContactos.length === 0 ? (
          <p className="col-span-full rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:bg-gray-800 dark:border-gray-700">
            {q
              ? "No hay contactos que coincidan con la búsqueda."
              : tabActivo === "seguimiento"
                ? "No tenés seguimientos vencidos. ✅"
                : "No hay contactos para este filtro."}
          </p>
        ) : (
          misContactos.map((c) => {
            const inicial = c.nombre.trim().charAt(0).toUpperCase() || "?";
            return (
              <Link
                key={c.id}
                href={`/contactos/${c.id}`}
                className={`rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-orion-navy hover:shadow-md dark:bg-gray-800 dark:border-gray-700 ${
                  c.archivado ? "opacity-60" : ""
                }`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orion-navy text-sm font-bold text-white dark:bg-orion-gold dark:text-orion-navy">
                    {inicial}
                  </div>
                  {c.archivado && (
                    <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      Archivado
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-800 dark:text-gray-100">
                  {c.nombre}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {rolesDe(c).map((r) => (
                    <span
                      key={r}
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${CATEGORIA_COLOR[r]}`}
                    >
                      {CATEGORIA_LABEL[r]}
                    </span>
                  ))}
                </div>
                {(() => {
                  const et = etiquetaEstado(estados.get(c.id)!);
                  return et ? (
                    <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${et.clase}`}>
                      {et.texto}
                    </span>
                  ) : null;
                })()}
                <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                  {c.telefono || "Sin teléfono"}
                </p>
                {c.email && (
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {c.email}
                  </p>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
