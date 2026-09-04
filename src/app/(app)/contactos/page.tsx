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

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700">
        {misContactos.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">
            {q
              ? "No hay contactos que coincidan con la búsqueda."
              : "Todavía no cargaste ningún contacto."}
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-orion-navy text-white">
              <tr>
                <th className="px-4 py-2 font-semibold">Nombre</th>
                <th className="px-4 py-2 font-semibold">Teléfono</th>
                <th className="px-4 py-2 font-semibold">Email</th>
                <th className="px-4 py-2 font-semibold">Notas</th>
              </tr>
            </thead>
            <tbody>
              {misContactos.map((c, i) => (
                <tr
                  key={c.id}
                  className={
                    i % 2 === 0
                      ? "bg-white dark:bg-gray-800"
                      : "bg-gray-50 dark:bg-gray-900/40"
                  }
                >
                  <td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-100">
                    {c.nombre}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                    {c.telefono || "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                    {c.email || "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                    {c.notas || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
