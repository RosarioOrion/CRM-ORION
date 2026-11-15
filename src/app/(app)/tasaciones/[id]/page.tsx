import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { tasaciones, usuarios } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { puedeVerAgente } from "@/lib/permisos";
import { eq } from "drizzle-orm";
import { OPCIONES_ESTADO, OPCIONES_UBICACION, calcularTasacion } from "@/lib/tasaciones";
import {
  calcularTasacionPro,
  CAMPOS,
  CONFIABILIDAD_LABEL,
  formatoSuperficie,
  ZONA_TIPO_LABEL,
  type Categoria,
  type ZonaTipo,
} from "@/lib/tasacion-pro";
import { EliminarTasacionBoton } from "../eliminar-tasacion-boton";

function formatoUsd(n: number) {
  return `USD ${Math.round(n).toLocaleString("es-UY")}`;
}

function labelEstado(v: number) {
  return OPCIONES_ESTADO.find((o) => o.valor === v)?.label ?? String(v);
}
function labelUbicacion(v: number) {
  return OPCIONES_UBICACION.find((o) => o.valor === v)?.label ?? String(v);
}

export default async function TasacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sesion = await obtenerSesion();
  if (!sesion) notFound();

  const [tasacion] = await db
    .select({
      id: tasaciones.id,
      tipo: tasaciones.tipo,
      direccion: tasaciones.direccion,
      zona: tasaciones.zona,
      link: tasaciones.link,
      m2: tasaciones.m2,
      estado: tasaciones.estado,
      ubicacion: tasaciones.ubicacion,
      comparables: tasaciones.comparables,
      promedioUsdM2: tasaciones.promedioUsdM2,
      valorEstimado: tasaciones.valorEstimado,
      ajusteManual: tasaciones.ajusteManual,
      notas: tasaciones.notas,
      detalle: tasaciones.detalle,
      creadoEn: tasaciones.creadoEn,
      agenteId: tasaciones.agenteId,
      agenteNombre: usuarios.nombre,
    })
    .from(tasaciones)
    .innerJoin(usuarios, eq(tasaciones.agenteId, usuarios.id))
    .where(eq(tasaciones.id, id));

  if (!tasacion) notFound();
  if (!(await puedeVerAgente(sesion, tasacion.agenteId))) notFound();

  // Tasación profesional (con categoría) o vieja (método de m² simple).
  const det = tasacion.detalle;
  const cat = det && det.categoria in CAMPOS ? (det.categoria as Categoria) : null;
  if (cat && det) return <DetallePro t={{ ...tasacion, detalle: det }} cat={cat} />;

  const resultado = calcularTasacion(
    tasacion.comparables,
    tasacion.estado,
    tasacion.ubicacion,
    tasacion.m2
  );

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/tasaciones"
        className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold"
      >
        ← Volver a Tasaciones
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-orion-navy dark:text-white capitalize">
            {tasacion.tipo} · {tasacion.direccion || "sin dirección"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tasacion.zona ? `${tasacion.zona} · ` : ""}
            {tasacion.agenteNombre} ·{" "}
            {new Date(tasacion.creadoEn).toLocaleDateString("es-UY", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>
        <EliminarTasacionBoton tasacionId={tasacion.id} />
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3 rounded-xl border border-orion-gold bg-orion-gold/5 p-4 text-center dark:border-orion-gold">
        <div>
          <p className="text-xs text-gray-400">USD/m² promedio</p>
          <p className="text-lg font-bold text-orion-navy dark:text-orion-gold">
            {formatoUsd(resultado.promedioUsdM2Redondeado)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Valor estimado</p>
          <p className="text-lg font-bold text-orion-navy dark:text-orion-gold">
            {formatoUsd(resultado.valorEstimado)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">
            {tasacion.ajusteManual != null ? "Ajuste manual" : "Sin ajuste manual"}
          </p>
          <p className="text-lg font-bold text-orion-navy dark:text-orion-gold">
            {tasacion.ajusteManual != null ? formatoUsd(tasacion.ajusteManual) : "—"}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Datos de la propiedad
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <p><span className="text-gray-400">Tipo: </span>{tasacion.tipo}</p>
          <p><span className="text-gray-400">Superficie: </span>{tasacion.m2} m²</p>
          <p><span className="text-gray-400">Estado: </span>{labelEstado(tasacion.estado)}</p>
          <p><span className="text-gray-400">Ubicación: </span>{labelUbicacion(tasacion.ubicacion)}</p>
          {tasacion.direccion && <p><span className="text-gray-400">Dirección: </span>{tasacion.direccion}</p>}
          {tasacion.zona && <p><span className="text-gray-400">Barrio: </span>{tasacion.zona}</p>}
          {tasacion.link && (
            <p className="col-span-2">
              <a href={tasacion.link} target="_blank" rel="noopener noreferrer" className="text-orion-navy hover:underline dark:text-orion-gold">
                🔗 Ver publicación
              </a>
            </p>
          )}
        </div>
        {tasacion.notas && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
            {tasacion.notas}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-orion-bg text-xs uppercase text-gray-400 dark:bg-gray-900">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">m²</th>
              <th className="px-3 py-2 text-left">Precio</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">Ubic.</th>
              <th className="px-3 py-2 text-left">USD/m² aj.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {tasacion.comparables.map((c, i) => (
              <tr key={i}>
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2">{c.esCierre ? "✅ Cierre" : "📊 Dinámico"}</td>
                <td className="px-3 py-2">{c.m2}</td>
                <td className="px-3 py-2">
                  {formatoUsd(c.precio)}
                  {!c.esCierre && (
                    <span className="ml-1 text-[11px] text-gray-400">(-10%)</span>
                  )}
                  {c.link && (
                    <>
                      {" "}
                      <a
                        href={c.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-orion-navy hover:underline dark:text-orion-gold"
                      >
                        ver
                      </a>
                    </>
                  )}
                </td>
                <td className="px-3 py-2">{c.estado}</td>
                <td className="px-3 py-2">{c.ubicacion}</td>
                <td className="px-3 py-2 font-semibold text-orion-navy dark:text-orion-gold">
                  {formatoUsd(resultado.ajustados[i])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Los comparables dinámicos (publicaciones activas) se reducen un 10% antes del
        cálculo; el USD/m² de cada uno se ajusta ±5% por cada punto de diferencia en
        estado y en ubicación respecto de esta propiedad.
      </p>
    </div>
  );
}

type TasacionFila = {
  id: string;
  tipo: string;
  direccion: string | null;
  zona: string | null;
  link: string | null;
  m2: number;
  estado: number;
  ubicacion: number;
  comparables: Parameters<typeof calcularTasacionPro>[2];
  ajusteManual: number | null;
  notas: string | null;
  creadoEn: Date;
  agenteNombre: string;
  detalle: { categoria: string; zonaTipo: string; departamento: string | null; sujeto: Record<string, number | boolean | undefined> };
};

function DetallePro({ t, cat }: { t: TasacionFila; cat: Categoria }) {
  const k = CAMPOS[cat];
  const zona: ZonaTipo = t.detalle.zonaTipo === "BALNEARIA" ? "BALNEARIA" : "URBANA";
  const suj = t.detalle.sujeto as Record<string, number | boolean | undefined>;
  const sujeto = {
    m2: t.m2,
    estado: t.estado,
    ubicacion: t.ubicacion,
    m2Semi: suj.m2Semi as number | undefined,
    m2Desc: suj.m2Desc as number | undefined,
    m2Terreno: suj.m2Terreno as number | undefined,
    garajes: suj.garajes as number | undefined,
    piscina: suj.piscina as boolean | undefined,
    esquina: suj.esquina as boolean | undefined,
    coneat: suj.coneat as number | undefined,
  };
  const r = calcularTasacionPro(cat, sujeto, t.comparables, zona);
  const u = r.unidad;
  const conf = CONFIABILIDAD_LABEL[r.confiabilidad];
  const dato = (label: string, valor: string | number | null | undefined) =>
    valor === null || valor === undefined || valor === "" ? null : (
      <p>
        <span className="text-gray-400">{label}: </span>
        {valor}
      </p>
    );

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/tasaciones" className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold">
        ← Volver a Tasaciones
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-orion-navy dark:text-white">
            {t.tipo} · {t.direccion || t.zona || "sin dirección"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {[t.zona, t.detalle.departamento].filter(Boolean).join(", ")}
            {t.zona || t.detalle.departamento ? " · " : ""}
            {t.agenteNombre} ·{" "}
            {new Date(t.creadoEn).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </p>
        </div>
        <EliminarTasacionBoton tasacionId={t.id} />
      </div>

      <div className="mb-6 rounded-xl border border-orion-gold bg-orion-gold/5 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Resultado</p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${conf.clase}`}>Confiabilidad {conf.texto}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
          <div>
            <p className="text-xs text-gray-500">Valor probable de cierre</p>
            <p className="text-2xl font-bold text-orion-navy dark:text-orion-gold">{formatoUsd(r.valorCierre)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Rango</p>
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {formatoUsd(r.rangoMin)} – {formatoUsd(r.rangoMax)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Precio sugerido de publicación</p>
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{formatoUsd(r.valorPublicacion)}</p>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-gray-500">
          {formatoUsd(r.promedio)}/{u} × {formatoSuperficie(r.superficieSujeto, u)}
          {u === "m²" && (k.semi || k.desc || k.terreno) ? " ponderados" : ""}
        </p>
        {t.ajusteManual != null && (
          <p className="mt-2 text-center text-sm font-semibold text-orion-navy dark:text-orion-gold">
            Ajuste manual del agente: {formatoUsd(t.ajusteManual)}
          </p>
        )}
        <ul className="mt-3 list-disc pl-5 text-xs text-gray-600 dark:text-gray-300">
          {r.motivos.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Datos de la propiedad</p>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {dato("Tipo", t.tipo)}
          {dato(k.medida, formatoSuperficie(t.m2, u))}
          {k.terreno && dato("Terreno", sujeto.m2Terreno ? `${sujeto.m2Terreno} m²` : null)}
          {k.semi && dato("Semicubiertos", sujeto.m2Semi ? `${sujeto.m2Semi} m²` : null)}
          {k.desc && dato("Descubiertos", sujeto.m2Desc ? `${sujeto.m2Desc} m²` : null)}
          {k.garajes && dato("Garajes", sujeto.garajes ?? 0)}
          {k.piscina && dato("Piscina", sujeto.piscina ? "Sí" : "No")}
          {k.esquina && dato("Esquina", sujeto.esquina ? "Sí" : "No")}
          {k.coneat && dato("Índice CONEAT", sujeto.coneat)}
          {dato(k.estado, labelEstado(t.estado))}
          {dato(k.ubicacion, labelUbicacion(t.ubicacion))}
          {k.terreno && dato("Zona", ZONA_TIPO_LABEL[zona])}
          {t.link && (
            <p className="col-span-2">
              <a href={t.link} target="_blank" rel="noopener noreferrer" className="text-orion-navy hover:underline dark:text-orion-gold">
                🔗 Ver publicación
              </a>
            </p>
          )}
        </div>
        {t.notas && <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{t.notas}</p>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-orion-bg text-xs uppercase text-gray-400 dark:bg-gray-900">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Superficie</th>
              <th className="px-3 py-2 text-left">Precio</th>
              <th className="px-3 py-2 text-left">Est./Ubic.</th>
              <th className="px-3 py-2 text-left">Ajustes</th>
              <th className="px-3 py-2 text-left">USD/{u} aj.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {t.comparables.map((c, i) => {
              const x = r.comparables[i];
              return (
                <tr key={i} className={x.atipico ? "bg-red-50/60 dark:bg-red-900/20" : ""}>
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2">{c.esCierre ? "✅ Cierre" : "📊 Dinámico"}</td>
                  <td className="px-3 py-2">
                    {formatoSuperficie(x.superficie, u)}
                    {k.terreno && c.m2Terreno ? <span className="block text-[11px] text-gray-400">{c.m2} edif. · {c.m2Terreno} terreno</span> : null}
                  </td>
                  <td className="px-3 py-2">
                    {formatoUsd(c.precio)}
                    {!c.esCierre && <span className="ml-1 text-[11px] text-gray-400">(-10%)</span>}
                    {c.link && (
                      <>
                        {" "}
                        <a href={c.link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-orion-navy hover:underline dark:text-orion-gold">
                          ver
                        </a>
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {c.estado} / {c.ubicacion}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-gray-500">
                    {x.ajustes.length
                      ? x.ajustes.map((a) => `${a.nombre} ${a.factor >= 1 ? "+" : ""}${Math.round((a.factor - 1) * 100)}%`).join(" · ")
                      : "—"}
                  </td>
                  <td className="px-3 py-2 font-semibold text-orion-navy dark:text-orion-gold">
                    {formatoUsd(x.ajustado)}
                    {x.atipico && <span className="block text-[11px] font-normal text-red-600">se aleja del resto</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Método comparativo homogeneizado: a las publicaciones activas (dinámicos) se les descuenta 10%; cada comparable se
        ajusta ±5% por punto de diferencia en {k.estado.toLowerCase()} y {k.ubicacion.toLowerCase()}
        {u === "m²" && (k.semi || k.desc || k.terreno)
          ? "; la superficie se pondera (semicubierto 50%, descubierto 30%" + (k.terreno ? `, terreno libre ${zona === "BALNEARIA" ? "15" : "10"}%` : "") + ")"
          : ""}
        ; y se ajusta por tamaño{k.garajes ? ", garajes" : ""}
        {k.piscina ? ", piscina" : ""}
        {k.esquina ? ", esquina" : ""}
        {k.coneat ? ", índice CONEAT" : ""}. El precio de publicación suma el margen de negociación (10%).
      </p>
    </div>
  );
}
