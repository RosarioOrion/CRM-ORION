import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { listarPapelera, DIAS_PAPELERA } from "@/lib/papelera";
import { BotonRestaurar } from "./boton-restaurar";

const DIA = 24 * 3600 * 1000;

function diasRestantes(eliminadoEn: Date) {
  return Math.max(0, Math.ceil((eliminadoEn.getTime() + DIAS_PAPELERA * DIA - Date.now()) / DIA));
}

export default async function PapeleraPage() {
  const sesion = await obtenerSesion();
  const yo = sesion!.userId;
  const jefe = esAdmin(sesion!.rol);

  // Cada agente ve lo suyo; Team Leader / Administrador ven lo de todo el equipo.
  const items = await listarPapelera(jefe ? "todos" : [yo]);

  const otros = [...new Set(items.map((i) => i.agenteId).filter((id) => id !== yo))];
  const nombres = new Map<string, string>();
  if (otros.length) {
    const us = await db
      .select({ id: usuarios.id, nombre: usuarios.nombre })
      .from(usuarios)
      .where(inArray(usuarios.id, otros));
    for (const u of us) nombres.set(u.id, u.nombre);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-orion-navy dark:text-white">Papelera</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Los contactos y propiedades eliminados quedan acá {DIAS_PAPELERA} días, con todo lo
        suyo (visitas, búsquedas, captaciones, portales, pipeline…). Después se borran
        definitivamente.
      </p>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800">
          La papelera está vacía.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((it) => {
            const quedan = diasRestantes(it.eliminadoEn);
            const puede = it.agenteId === yo || jefe;
            return (
              <div
                key={it.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {it.tipo === "CONTACTO" ? "👤 Contacto" : "🏢 Propiedad"}
                    </span>
                    {it.agenteId !== yo && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        Agente: {nombres.get(it.agenteId) ?? "Otro agente"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {it.titulo}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Eliminado el {it.eliminadoEn.toLocaleDateString("es-UY")} ·{" "}
                    <span className={quedan <= 5 ? "font-semibold text-red-600 dark:text-red-400" : ""}>
                      {quedan === 1 ? "queda 1 día" : `quedan ${quedan} días`}
                    </span>
                  </p>
                </div>
                {puede && <BotonRestaurar id={it.id} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
