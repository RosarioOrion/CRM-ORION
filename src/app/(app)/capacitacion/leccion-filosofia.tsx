import Link from "next/link";
import { db } from "@/db";
import { configuracionEmpresa } from "@/db/schema";
import { COMPROMISOS_EN_ORION, leerFilosofia } from "@/lib/filosofia";

// Lección 1 de Capacitación: la filosofía de Orion tal como está en
// Ajustes → Filosofía (si la CEO la cambia, se actualiza acá sola).
export async function LeccionFilosofia({ esCeo }: { esCeo: boolean }) {
  const [config] = await db.select({ filosofia: configuracionEmpresa.filosofia }).from(configuracionEmpresa).limit(1);
  const texto = config?.filosofia?.trim();
  if (!texto) {
    return esCeo ? (
      <p className="mb-6 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700">
        Cargá la filosofía del equipo en{" "}
        <Link href="/ajustes" className="font-semibold text-orion-navy underline dark:text-orion-gold">
          Ajustes
        </Link>{" "}
        y aparece acá como primera lección.
      </p>
    ) : null;
  }
  const bloques = leerFilosofia(texto);
  const compromisos = bloques.filter((b) => b.tipo === "compromiso");

  return (
    <details open className="group mb-6 rounded-xl border border-orion-gold/40 bg-white shadow-sm dark:bg-gray-800">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-t-xl bg-orion-navy px-5 py-3 text-white">
        <span>
          <span className="mr-2 rounded bg-orion-gold px-2 py-0.5 text-xs font-bold text-orion-navy">Lección 1</span>
          <span className="font-semibold">Cómo trabajamos en Orion</span>
        </span>
        <span className="text-xs text-white/70 group-open:hidden">Ver ▾</span>
        <span className="hidden text-xs text-white/70 group-open:inline">Ocultar ▴</span>
      </summary>
      <div className="flex flex-col gap-3 p-5 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Nuestra filosofía · así le hablamos al propietario
        </p>
        {bloques.map((b, i) =>
          b.tipo === "parrafo" ? (
            <p key={i}>{b.texto}</p>
          ) : b.tipo === "titulo" ? (
            <p key={i} className="mt-2 font-bold text-orion-navy dark:text-white">
              {b.texto}
            </p>
          ) : (
            <div key={i} className="flex gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orion-gold font-bold text-orion-navy">
                {b.numero}
              </span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{b.titulo}</p>
                <p className="text-gray-600 dark:text-gray-300">{b.texto}</p>
              </div>
            </div>
          )
        )}

        {compromisos.length === COMPROMISOS_EN_ORION.length && (
          <div className="mt-2 rounded-lg border border-orion-navy/15 p-4 dark:border-white/10">
            <p className="mb-2 font-bold text-orion-navy dark:text-white">Cómo lo cumplís con Orion</p>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              No es un discurso: cada compromiso está armado en el sistema.
            </p>
            <ul className="flex flex-col gap-2">
              {compromisos.map((c, i) => (
                <li key={i} className="text-sm">
                  <span className="font-semibold">{c.numero}. {c.titulo}</span>{" "}
                  <span className="text-gray-600 dark:text-gray-300">→ {COMPROMISOS_EN_ORION[i]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {esCeo && (
          <p className="text-xs text-gray-400">
            Se edita en{" "}
            <Link href="/ajustes" className="underline">
              Ajustes → Filosofía
            </Link>
            .
          </p>
        )}
      </div>
    </details>
  );
}
