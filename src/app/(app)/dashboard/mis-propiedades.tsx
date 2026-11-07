import Link from "next/link";
import {
  DIAS_SIN_CONSULTAS,
  ETAPA_LABEL,
  ETAPAS,
  FILTRO_SIN_CONSULTAS_21,
  type Etapa,
  type ResumenMisPropiedades,
} from "@/lib/mis-propiedades";

const ESTILO: Record<Etapa, { icono: string; clase: string }> = {
  SIN_CONSULTAS: { icono: "🔇", clase: "text-gray-600 dark:text-gray-300" },
  CON_CONSULTAS: { icono: "💬", clase: "text-sky-700 dark:text-sky-300" },
  EN_VISITAS: { icono: "🏠", clase: "text-violet-700 dark:text-violet-300" },
  EN_NEGOCIACION: { icono: "🤝", clase: "text-emerald-700 dark:text-emerald-300" },
};

/** Inicio: en qué etapa están mis propiedades disponibles. */
export function MisPropiedades({ resumen }: { resumen: ResumenMisPropiedades }) {
  const total = ETAPAS.reduce((n, e) => n + resumen.conteo[e], 0);
  const quietas = resumen.sinConsultas21.size;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-orion-navy dark:text-white">🏢 Mis propiedades</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{total} activa(s) o reservada(s)</p>
        </div>
        <Link
          href="/pipeline"
          className="rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orion-navy-light"
        >
          Ver pipeline →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ETAPAS.map((e) => (
          <Link
            key={e}
            href={`/propiedades?etapa=${e}`}
            className="rounded-lg border border-gray-200 p-3 transition hover:border-orion-navy hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/40"
          >
            <p className={`text-2xl font-bold ${ESTILO[e].clase}`}>{resumen.conteo[e]}</p>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              {ESTILO[e].icono} {ETAPA_LABEL[e]}
            </p>
          </Link>
        ))}
      </div>

      {quietas > 0 && (
        <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <p className="font-semibold">
            ⚠️ {quietas} {quietas === 1 ? "propiedad lleva" : "propiedades llevan"} {DIAS_SIN_CONSULTAS} días o más sin
            consultas
          </p>
          <p className="mt-0.5 text-xs">
            Sugerencia: planteale al dueño un ajuste de precio en el próximo seguimiento.
          </p>
          <Link
            href={`/propiedades?etapa=${FILTRO_SIN_CONSULTAS_21}`}
            className="mt-1 inline-block text-xs font-semibold underline"
          >
            Ver cuáles →
          </Link>
        </div>
      )}
    </div>
  );
}
