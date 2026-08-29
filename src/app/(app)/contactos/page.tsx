import { db } from "@/db";
import { contactos } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { NuevoContactoForm } from "./nuevo-contacto-form";

export default async function ContactosPage() {
  const sesion = await obtenerSesion();

  const misContactos = await db
    .select()
    .from(contactos)
    .where(eq(contactos.agenteId, sesion!.userId))
    .orderBy(desc(contactos.creadoEn));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-orion-navy">Contactos</h1>
          <p className="text-sm text-gray-500">
            {misContactos.length} contacto(s)
          </p>
        </div>
      </div>

      <div className="mb-6">
        <NuevoContactoForm />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {misContactos.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">
            Todavía no cargaste ningún contacto.
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
                  className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-2 font-medium text-gray-800">
                    {c.nombre}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {c.telefono || "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {c.email || "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
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
