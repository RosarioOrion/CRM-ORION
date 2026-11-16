import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { frasesInicio } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";
import { fraseDelDia } from "@/lib/frase-del-dia";
import { BorrarFrase, FormFrase } from "./form";

// Frases propias para la "Frase del día" (solo la CEO). Se suman a las
// afirmaciones de los capítulos del manual, que Orion toma solo.
export default async function FrasesPage() {
  const sesion = await obtenerSesion();
  if (!sesion || !esCEO(sesion.rol)) redirect("/dashboard");
  const [frases, hoy] = await Promise.all([
    db.select().from(frasesInicio).orderBy(asc(frasesInicio.creadoEn)).catch(() => []),
    fraseDelDia(),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold">
        ← Volver al Inicio
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-orion-navy dark:text-white">✨ Frase del día</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Orion toma sola la <strong>afirmación final de cada capítulo</strong> del manual (con su acción asociada) y le
        muestra una distinta cada día a todo el equipo. Acá podés sumar frases propias, que entran en la misma rotación.
      </p>
      <p className="mb-6 rounded-lg bg-orion-gold/10 px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
        <strong>Hoy:</strong> “{hoy.texto}”{hoy.fuente ? ` — ${hoy.fuente.nombre}` : ""}
      </p>
      <FormFrase />
      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-gray-400">Frases propias ({frases.length})</h2>
      {frases.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no cargaste frases propias.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
          {frases.map((f) => (
            <li key={f.id} className="flex items-start gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-gray-800 dark:text-gray-100">“{f.texto}”</p>
                {f.accion && <p className="text-xs text-gray-500">🎯 {f.accion}</p>}
              </div>
              <BorrarFrase id={f.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
