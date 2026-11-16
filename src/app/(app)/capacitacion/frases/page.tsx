import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { frasesInicio } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";
import { fraseDelDia } from "@/lib/frase-del-dia";
import { CATEGORIA_FRASE, type CategoriaFrase } from "@/lib/frases-semilla";
import { BorrarFrase, FormFrase } from "./form";

// Frases de la "Frase del día" (solo la CEO): la base de autores que trae
// Orion y las propias. Se suman a las afirmaciones de los capítulos del
// manual, que Orion toma solo.
export default async function FrasesPage({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion || !esCEO(sesion.rol)) redirect("/dashboard");
  const { cat = "", q = "" } = await searchParams;
  const [frases, hoy] = await Promise.all([
    db.select().from(frasesInicio).orderBy(asc(frasesInicio.creadoEn)).catch(() => []),
    fraseDelDia(),
  ]);
  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const busca = norm(q.trim());
  const claveCat = (f: (typeof frases)[number]) => (f.origen === "PROPIA" ? "PROPIA" : f.categoria ?? "");
  const lista = frases.filter(
    (f) =>
      (!cat || claveCat(f) === cat) &&
      (!busca || norm(`${f.texto} ${f.autor ?? ""} ${f.fuente ?? ""}`).includes(busca))
  );
  const cuenta = (c: string) => frases.filter((f) => claveCat(f) === c).length;
  const chips: [string, string][] = [
    ["", `Todas (${frases.length})`],
    ["PROPIA", `✍️ Propias (${cuenta("PROPIA")})`],
    ...(Object.keys(CATEGORIA_FRASE) as CategoriaFrase[]).map((c): [string, string] => [c, `${CATEGORIA_FRASE[c]} (${cuenta(c)})`]),
  ];
  const href = (c: string) => {
    const p = new URLSearchParams();
    if (c) p.set("cat", c);
    if (q) p.set("q", q);
    const s = p.toString();
    return `/capacitacion/frases${s ? `?${s}` : ""}`;
  };
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold">
        ← Volver al Inicio
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-orion-navy dark:text-white">✨ Frase del día</h1>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Cada día todo el equipo ve una frase distinta. Entran en la rotación: la <strong>afirmación final de cada
        capítulo</strong> del manual (Orion la toma sola), la <strong>base de frases de autores</strong> (libros de
        mentalidad, ventas y dinero, filosofía oriental, kaizen, estoicos y refranes) y tus <strong>frases propias</strong>.
        Podés borrar las que no te gusten y sumar las tuyas.
      </p>
      <p className="mb-4 rounded-lg bg-orion-gold/10 px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
        <strong>Hoy:</strong> “{hoy.texto}”
        {hoy.autor ? ` — ${hoy.autor}${hoy.obra ? `, ${hoy.obra}` : ""}` : hoy.fuente ? ` — ${hoy.fuente.nombre}` : ""}
      </p>
      <p className="mb-6 text-xs text-gray-400">
        Las frases de autores son traducciones libres al español. Se cargaron solo frases que están en la obra o el autor
        indicado; las citas famosas mal atribuidas se dejaron afuera.
      </p>
      <FormFrase />

      <div className="mb-3 mt-6 flex flex-wrap gap-1.5">
        {chips.map(([c, label]) => (
          <Link
            key={c || "todas"}
            href={href(c)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              cat === c ? "bg-orion-navy text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
      <form className="mb-3 flex gap-2" action="/capacitacion/frases">
        {cat && <input type="hidden" name="cat" value={cat} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por frase, autor o libro…"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <button type="submit" className="rounded-lg bg-gray-100 px-3 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          Buscar
        </button>
      </form>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{lista.length} frase(s)</h2>
      {lista.length === 0 ? (
        <p className="text-sm text-gray-400">No hay frases acá.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
          {lista.map((f) => (
            <li key={f.id} className="flex items-start gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-gray-800 dark:text-gray-100">“{f.texto}”</p>
                {f.autor && (
                  <p className="text-xs text-gray-500">
                    — {f.autor}
                    {f.fuente && <span className="italic">, {f.fuente}</span>}
                  </p>
                )}
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
