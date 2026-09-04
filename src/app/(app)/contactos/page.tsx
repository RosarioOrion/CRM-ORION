import { db } from "@/db";
import { contactos } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { eq, desc, and, or, ilike } from "drizzle-orm";
import { NuevoContactoForm } from "./nuevo-contacto-form";

export default async function ContactosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  const sesion = await obtenerSesion();

  const condiciones = [eq(contactos.agenteId, sesion!.userId)];
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {misContactos.length === 0 ? (
          <p className="col-span-full rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:bg-gray-800 dark:border-gray-700">
            {q
              ? "No hay contactos que coincidan con la búsqueda."
              : "Todavía no cargaste ningún contacto."}
          </p>
        ) : (
          misContactos.map((c) => {
            const inicial = c.nombre.trim().charAt(0).toUpperCase() || "?";
            return (
              <div
                key={c.id}
                className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-orion-navy hover:shadow-md dark:bg-gray-800 dark:border-gray-700"
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-orion-navy text-sm font-bold text-white dark:bg-orion-gold dark:text-orion-navy">
                  {inicial}
                </div>
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-800 dark:text-gray-100">
                  {c.nombre}
                </p>
                <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                  {c.telefono || "Sin teléfono"}
                </p>
                {c.email && (
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {c.email}
                  </p>
                )}
                {c.notas && (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-400 dark:text-gray-500">
                    {c.notas}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
