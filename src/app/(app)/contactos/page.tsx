import Link from "next/link";
import { db } from "@/db";
import { contactos } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { eq, desc, and, or, ilike, inArray } from "drizzle-orm";
import { NuevoContactoForm } from "./nuevo-contacto-form";
import {
  CATEGORIA_LABEL,
  CATEGORIA_COLOR,
  GRUPOS_CATEGORIA,
} from "@/lib/contactos";

const TABS: { key: string; label: string }[] = [
  { key: "activos", label: "Activos" },
  { key: "todos", label: "Todos" },
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
      condiciones.push(inArray(contactos.categoria, grupo.categorias));
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

  const misContactos = await db
    .select()
    .from(contactos)
    .where(and(...condiciones))
    .orderBy(desc(contactos.creadoEn));

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
              : "No hay contactos para este filtro."}
          </p>
        ) : (
          misContactos.map((c) => {
            const inicial = c.nombre.trim().charAt(0).toUpperCase() || "?";
            const categoria = c.categoria as keyof typeof CATEGORIA_LABEL;
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
                <span
                  className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    CATEGORIA_COLOR[categoria] ?? CATEGORIA_COLOR.OTRO
                  }`}
                >
                  {CATEGORIA_LABEL[categoria] ?? c.categoria}
                </span>
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
