import Link from "next/link";
import { pesoLegible } from "@/lib/capacitacion";
import { BLOQUES, bloqueLabel, nombreMaterial } from "@/lib/manual-indice";
import type { Area, Material } from "./datos";

// Índice del Manual en Capacitación: "Por tema" (áreas) y "Por bloque" (orden
// de lectura). Los materiales ya vienen ordenados: Cap. 0–57, Anexos A–J, resto.

export type Vista = "tema" | "bloque" | "todo";

export function PestanasIndice({ vista }: { vista: Vista }) {
  const tabs: [Vista, string][] = [
    ["tema", "🗂️ Por tema"],
    ["bloque", "📖 Por bloque"],
    ["todo", "📚 Todo"],
  ];
  return (
    <div className="mb-5 grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
      {tabs.map(([v, label]) => (
        <Link
          key={v}
          href={v === "tema" ? "/capacitacion" : `/capacitacion?vista=${v}`}
          className={`rounded-md py-2 text-center text-sm font-semibold ${
            vista === v ? "bg-white text-orion-navy shadow dark:bg-gray-900 dark:text-white" : "text-gray-500"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

/** Un material en una lista del índice. */
export function FilaMaterial({ m }: { m: Material }) {
  const esVideo = m.tipo === "VIDEO";
  const peso = pesoLegible(m.archivoPesoBytes);
  return (
    <li className="flex items-start gap-3 py-3">
      <span className="mt-0.5 text-xl">{esVideo ? "🎬" : "📄"}</span>
      <div className="min-w-0 flex-1">
        <Link href={`/capacitacion/${m.id}`} className="font-semibold text-orion-navy hover:underline dark:text-white">
          {nombreMaterial(m.clase, m.numero, m.titulo)}
        </Link>
        {m.tieneAudio && (
          <span className="ml-2 rounded-full bg-orion-gold/20 px-2 py-0.5 text-[11px] font-semibold text-orion-navy dark:text-orion-gold">
            🎙️ Audio
          </span>
        )}
        {m.descripcion && <p className="mt-0.5 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{m.descripcion}</p>}
        <p className="mt-1 text-[11px] text-gray-400">
          {[m.paginas ? `${m.paginas} pág.` : null, peso].filter(Boolean).join(" · ")}
        </p>
      </div>
      <Link
        href={`/capacitacion/${m.id}`}
        className="shrink-0 rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-orion-navy-light"
      >
        {esVideo ? "▶ Ver" : "📖 Leer"}
      </Link>
    </li>
  );
}

function Lista({ materiales }: { materiales: Material[] }) {
  if (!materiales.length) return <p className="py-3 text-sm text-gray-400">Todavía no hay material acá.</p>;
  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
      {materiales.map((m) => (
        <FilaMaterial key={m.id} m={m} />
      ))}
    </ul>
  );
}

/** Vista "Por tema": tarjetas de áreas; al tocar una, sus materiales. */
export function IndicePorTema({ areas, material, area }: { areas: Area[]; material: Material[]; area: string | null }) {
  const elegida = area ? areas.find((a) => a.clave === area) : null;
  if (elegida) {
    const items = material.filter((m) => m.areas.includes(elegida.clave));
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <Link href="/capacitacion" className="text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold">
          ← Todas las áreas
        </Link>
        <h2 className="mt-2 text-lg font-bold text-orion-navy dark:text-white">
          {elegida.icono} {elegida.nombre}
          <span className="ml-2 text-sm font-normal text-gray-400">{items.length} material(es)</span>
        </h2>
        <Lista materiales={items} />
      </div>
    );
  }
  const sinArea = material.filter((m) => m.areas.length === 0);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {areas.map((a) => {
          const n = material.filter((m) => m.areas.includes(a.clave)).length;
          return (
            <Link
              key={a.clave}
              href={`/capacitacion?area=${a.clave}`}
              className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-orion-navy hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <span className="text-3xl">{a.icono}</span>
              <span className="font-semibold leading-tight text-orion-navy dark:text-white">{a.nombre}</span>
              <span className="text-xs text-gray-400">{n} material(es)</span>
            </Link>
          );
        })}
      </div>
      {sinArea.length > 0 && (
        <p className="mt-3 text-xs text-gray-400">
          {sinArea.length} material(es) sin área: están en la vista{" "}
          <Link href="/capacitacion?vista=todo" className="underline">
            Todo
          </Link>
          .
        </p>
      )}
    </>
  );
}

/** Vista "Por bloque": orden de lectura del manual. */
export function IndicePorBloque({ material }: { material: Material[] }) {
  const otros = material.filter((m) => !m.bloque || !BLOQUES.some((b) => b.clave === m.bloque));
  return (
    <div className="flex flex-col gap-4">
      {BLOQUES.map((b) => {
        const items = material.filter((m) => m.bloque === b.clave);
        if (!items.length) return null;
        return (
          <details key={b.clave} open className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <summary className="cursor-pointer text-base font-bold text-orion-navy dark:text-white">
              {bloqueLabel(b.clave)}
              <span className="ml-2 text-sm font-normal text-gray-400">{items.length}</span>
            </summary>
            <Lista materiales={items} />
          </details>
        );
      })}
      {otros.length > 0 && (
        <details open className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <summary className="cursor-pointer text-base font-bold text-orion-navy dark:text-white">
            Otros materiales <span className="ml-2 text-sm font-normal text-gray-400">{otros.length}</span>
          </summary>
          <Lista materiales={otros} />
        </details>
      )}
    </div>
  );
}
