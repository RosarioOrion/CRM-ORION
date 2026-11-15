import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { configuracionEmpresa, tasaciones, usuarios } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { puedeVerAgente } from "@/lib/permisos";
import {
  calcularTasacionPro,
  CAMPOS,
  categoriaDe,
  formatoSuperficie,
  formatoUsd,
  OPCIONES_LUZ,
  type Categoria,
  type ComparablePro,
  type ZonaTipo,
} from "@/lib/tasacion-pro";
import { aDatosRenta, calcularRenta, calcularRentabilidad, pct, valorFinal } from "@/lib/rentabilidad";
import { leerFilosofia } from "@/lib/filosofia";
import { BotonImprimir } from "./imprimir";

// Informe de tasación para el propietario: se imprime o se guarda como PDF
// desde el navegador. Siempre en colores claros (independiente del modo
// oscuro) y pensado para hoja A4.

export const metadata = { title: "Informe de tasación · Orion Propiedades" };

const NAVY = "#0a1830";
const GOLD = "#c9982c";
const PUNTAJE = ["", "Malo", "Regular", "Bueno", "Excelente"];
const red = (n: number) => Math.round(n / 1000) * 1000;

function Seccion({ titulo, children, salto }: { titulo: string; children: React.ReactNode; salto?: boolean }) {
  return (
    <section className={`mb-8 ${salto ? "salto" : ""}`} style={{ breakInside: "avoid-page" }}>
      <h2 className="mb-3 border-b pb-1 text-lg font-bold" style={{ color: NAVY, borderColor: GOLD }}>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export default async function InformeTasacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  const [t] = await db.select().from(tasaciones).where(eq(tasaciones.id, id));
  if (!t) notFound();
  if (!(await puedeVerAgente(sesion, t.agenteId))) notFound();

  const [[agente], [config]] = await Promise.all([
    db.select({ nombre: usuarios.nombre, telefono: usuarios.telefono, email: usuarios.email }).from(usuarios).where(eq(usuarios.id, t.agenteId)),
    db.select().from(configuracionEmpresa).limit(1),
  ]);

  const cat: Categoria = (t.detalle?.categoria as Categoria) ?? categoriaDe(t.tipo) ?? "CASA";
  const k = CAMPOS[cat];
  const zona: ZonaTipo = t.detalle?.zonaTipo === "BALNEARIA" ? "BALNEARIA" : "URBANA";
  const suj = (t.detalle?.sujeto ?? {}) as Record<string, number | boolean | undefined>;
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
    luz: suj.luz as number | undefined,
  };
  const comparables = t.comparables as ComparablePro[];
  const r = calcularTasacionPro(cat, sujeto, comparables, zona);
  const u = r.unidad;
  const renta = t.detalle?.renta ?? null;
  const datosRenta = renta ? aDatosRenta(renta) : null;
  const hayComps = comparables.length >= 4;
  const final = valorFinal(hayComps ? r.valorCierre : null, renta?.valor ?? null);
  const valor = t.ajusteManual ?? final?.valor ?? t.valorEstimado;
  const rangoMin = hayComps && !renta ? r.rangoMin : red(valor * 0.9);
  const rangoMax = hayComps && !renta ? r.rangoMax : red(valor * 1.1);
  const publicacion = red(valor / 0.9);
  const ficha = t.detalle?.ficha ?? null;
  const empresa = config?.nombreEmpresa || "Orion Propiedades";
  const compromisos = config?.filosofia ? leerFilosofia(config.filosofia).filter((b) => b.tipo === "compromiso") : [];
  const fecha = t.creadoEn.toLocaleDateString("es-UY", { timeZone: "America/Montevideo", day: "numeric", month: "long", year: "numeric" });

  // Estadísticas de la muestra (reales, de los comparables de esta tasación).
  const vals = r.comparables.map((c) => c.ajustado).filter((v) => v > 0);
  const min = vals.length ? Math.min(...vals) : 0;
  const max = vals.length ? Math.max(...vals) : 0;
  const valorUnidad = r.superficieSujeto > 0 ? valor / r.superficieSujeto : 0;
  const tope = Math.max(max, valorUnidad) * 1.08 || 1;
  const cierres = comparables.filter((c) => c.esCierre && !c.esTasacion).length;
  const publicadas = comparables.filter((c) => !c.esCierre && !c.esTasacion).length;
  const rindeAlValor = datosRenta ? calcularRentabilidad(valor, datosRenta) : null;

  const datos: [string, string | number | null | undefined][] = [
    ["Tipo", t.tipo],
    ["Dirección", t.direccion],
    ["Barrio / localidad", [t.zona, t.detalle?.departamento].filter(Boolean).join(", ")],
    ["Padrón", ficha?.padron],
    [k.medida, formatoSuperficie(t.m2, u)],
    ["Terreno", k.terreno && sujeto.m2Terreno ? `${sujeto.m2Terreno} m²` : null],
    ["Semicubiertos", k.semi && sujeto.m2Semi ? `${sujeto.m2Semi} m²` : null],
    ["Descubiertos", k.desc && sujeto.m2Desc ? `${sujeto.m2Desc} m²` : null],
    ["Dormitorios", ficha?.dormitorios],
    ["Baños", ficha?.banos],
    ["Antigüedad", ficha?.antiguedad ? `${ficha.antiguedad} años` : null],
    ["Garajes", k.garajes && sujeto.garajes ? sujeto.garajes : null],
    ["Piscina", k.piscina && sujeto.piscina ? "Sí" : null],
    ["Esquina", k.esquina && sujeto.esquina ? "Sí" : null],
    ["Índice CONEAT", k.coneat ? sujeto.coneat : null],
    [k.estado, `${t.estado} – ${PUNTAJE[t.estado]}`],
    [k.ubicacion, `${t.ubicacion} – ${PUNTAJE[t.ubicacion]}`],
    ["Iluminación y ventilación", k.luz && sujeto.luz ? OPCIONES_LUZ.find((o) => o.valor === sujeto.luz)?.label : null],
  ];

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800" style={{ colorScheme: "light" }}>
      <style>{`
        @page { size: A4; margin: 14mm 14mm 16mm; }
        @media print {
          .no-print { display: none !important; }
          body, .hoja { background: #fff !important; }
          .hoja { box-shadow: none !important; margin: 0 !important; padding: 0 !important; max-width: none !important; }
          .salto { break-before: page; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <BotonImprimir />

      <article className="hoja mx-auto my-6 max-w-[210mm] bg-white px-10 py-10 text-[13px] leading-relaxed shadow-lg">
        {/* Portada */}
        <header className="mb-8 flex flex-col items-center rounded-xl px-6 py-8 text-center" style={{ background: NAVY }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/orion-logo-informe.jpg" alt={empresa} className="mb-4 h-40 w-40 rounded-lg object-cover" />
          <p className="text-xs uppercase tracking-[0.3em]" style={{ color: GOLD }}>
            Informe de tasación
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">
            {t.tipo}
            {t.direccion ? ` · ${t.direccion}` : ""}
          </h1>
          <p className="mt-1 text-sm text-white/80">{[t.zona, t.detalle?.departamento].filter(Boolean).join(", ")}</p>
          <p className="mt-4 text-xs text-white/70">
            {fecha}
            {ficha?.propietario ? ` · Preparado para ${ficha.propietario}` : ""}
          </p>
        </header>

        {/* Valor */}
        <Seccion titulo="Valor de mercado estimado">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border p-3" style={{ borderColor: GOLD, background: "#fbf6ea" }}>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Valor probable de venta</p>
              <p className="text-2xl font-bold" style={{ color: NAVY }}>
                {formatoUsd(valor)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Rango de mercado</p>
              <p className="text-base font-semibold" style={{ color: NAVY }}>
                {formatoUsd(rangoMin)} – {formatoUsd(rangoMax)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Precio sugerido de publicación</p>
              <p className="text-base font-semibold" style={{ color: NAVY }}>
                {formatoUsd(publicacion)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            El precio de publicación deja un margen de negociación de alrededor del 10% sobre el valor probable de venta,
            que es el precio al que estimamos que la propiedad se concreta.
            {hayComps && ` Equivale a ${formatoUsd(valorUnidad)} por ${u === "ha" ? "hectárea" : "m²"}${u === "m²" && (k.semi || k.desc || k.terreno) ? " ponderado" : ""}.`}
          </p>
        </Seccion>

        {/* Propiedad */}
        <Seccion titulo="La propiedad">
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            {datos
              .filter(([, v]) => v !== null && v !== undefined && v !== "")
              .map(([l, v]) => (
                <p key={l} className="flex justify-between border-b border-dotted border-gray-200 py-0.5">
                  <span className="text-gray-500">{l}</span>
                  <span className="font-medium text-gray-900">{v}</span>
                </p>
              ))}
          </div>
          {ficha?.descripcion && <p className="mt-4 whitespace-pre-wrap text-gray-700">{ficha.descripcion}</p>}
        </Seccion>

        {/* Mercado */}
        {hayComps && (
          <Seccion titulo="Dónde se ubica tu propiedad en el mercado" salto>
            <p className="mb-3 text-gray-700">
              Analizamos {comparables.length} propiedades comparables de la zona
              {cierres ? ` (${cierres} venta${cierres > 1 ? "s" : ""} concretada${cierres > 1 ? "s" : ""}` : " ("}
              {cierres && publicadas ? " y " : ""}
              {publicadas ? `${publicadas} publicación${publicadas > 1 ? "es" : ""} activa${publicadas > 1 ? "s" : ""}` : ""}
              {cierres || publicadas ? ")" : "tasaciones anteriores)"}. Después de homogeneizarlas, su valor va de{" "}
              <strong>{formatoUsd(min)}</strong> a <strong>{formatoUsd(max)}</strong> por {u === "ha" ? "hectárea" : "m²"}.
            </p>
            <div className="flex flex-col gap-1.5">
              {r.comparables.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-24 shrink-0 text-gray-500">Comparable {i + 1}</span>
                  <div className="h-4 flex-1 rounded bg-gray-100">
                    <div className="h-4 rounded" style={{ width: `${(c.ajustado / tope) * 100}%`, background: "#9fb0c9" }} />
                  </div>
                  <span className="w-24 shrink-0 text-right text-gray-600">{formatoUsd(c.ajustado)}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="w-24 shrink-0" style={{ color: NAVY }}>
                  Tu propiedad
                </span>
                <div className="h-4 flex-1 rounded bg-gray-100">
                  <div className="h-4 rounded" style={{ width: `${(valorUnidad / tope) * 100}%`, background: GOLD }} />
                </div>
                <span className="w-24 shrink-0 text-right" style={{ color: NAVY }}>
                  {formatoUsd(valorUnidad)}
                </span>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-gray-400">
              Valores por {u === "ha" ? "hectárea" : "m²"} de cada comparable, ya ajustados a las características de tu
              propiedad.
            </p>
          </Seccion>
        )}

        <Seccion titulo="Por qué el precio de salida es tan importante">
          <ul className="flex flex-col gap-2 text-gray-700">
            <li>
              <strong>Los compradores comparan.</strong> Antes de visitar, revisan en los portales todas las propiedades
              parecidas de la zona. Un precio por encima del rango de la tabla anterior hace que tu propiedad quede como
              “la cara” de la comparación… y ayude a vender las de los demás.
            </li>
            <li>
              <strong>Las primeras semanas son las de mayor interés.</strong> Cuando una propiedad sale al mercado, la ven
              todos los compradores que estaban buscando. Si el precio no acompaña, esa oportunidad pasa y después el
              interés se recupera mucho más despacio.
            </li>
            <li>
              <strong>Bajar el precio después cuesta más.</strong> Una propiedad que pasa meses publicada genera dudas (“¿qué
              tiene?”) y los compradores negocian más fuerte. Salir bien desde el principio suele terminar en un mejor
              precio final.
            </li>
            <li>
              <strong>El precio de venta real es el de cierre, no el de publicación.</strong> Por eso, en este análisis las
              publicaciones activas se toman con un 10% menos y las ventas concretadas por su valor real.
            </li>
          </ul>
        </Seccion>

        {/* Método */}
        <Seccion titulo="Cómo calculamos el valor" salto={!hayComps}>
          {hayComps && (
            <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-gray-700">
              <li>
                <strong>Método comparativo de mercado.</strong> Buscamos propiedades similares de la zona: ventas
                concretadas, publicaciones activas (con un 10% menos por el margen de negociación) y tasaciones previas.
              </li>
              {u === "m²" && (k.semi || k.desc || k.terreno) && (
                <li>
                  <strong>Superficie ponderada.</strong> Cada metro cuenta según su uso: cubierto 100%
                  {k.semi ? ", semicubierto 50%" : ""}
                  {k.desc ? ", descubierto 30%" : ""}
                  {k.terreno ? `, terreno libre ${zona === "BALNEARIA" ? "15" : "10"}%` : ""}.
                </li>
              )}
              <li>
                <strong>Homogeneización.</strong> Ajustamos cada comparable por las diferencias con tu propiedad:{" "}
                {k.estado.toLowerCase()} y {k.ubicacion.toLowerCase()} (±5% por punto)
                {k.luz ? ", iluminación y ventilación (±4% por punto)" : ""}, tamaño
                {k.garajes ? ", garajes" : ""}
                {k.piscina ? ", piscina" : ""}
                {k.esquina ? ", esquina" : ""}
                {k.coneat ? ", índice CONEAT" : ""}.
              </li>
              <li>
                <strong>Resultado.</strong> El promedio de los valores ajustados por la superficie de tu propiedad da el valor
                probable de venta; la dispersión de la muestra define el rango.
              </li>
            </ol>
          )}
          {renta && datosRenta && (
            <p className="text-gray-700">
              <strong>Valor por renta.</strong> Como la propiedad está alquilada, también calculamos su valor por la renta
              que genera: renta neta anual de {formatoUsd(calcularRenta(datosRenta).rentaNeta)} (alquiler menos gastos del
              propietario) dividida por una tasa de capitalización del {renta.tasa.toLocaleString("es-UY")}% = {formatoUsd(renta.valor)}.
              {final?.metodo === "CONCILIADO" && " El valor final es el promedio de ambos métodos."}
              {rindeAlValor && ` Al valor estimado, la propiedad rinde ${pct(rindeAlValor.bruta)} bruto y ${pct(rindeAlValor.neta)} neto por año.`}
            </p>
          )}
        </Seccion>

        {/* Comparables */}
        {comparables.length > 0 && (
          <Seccion titulo="Comparables analizados">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-white" style={{ background: NAVY }}>
                  <th className="px-2 py-1.5">#</th>
                  <th className="px-2 py-1.5">Tipo de dato</th>
                  <th className="px-2 py-1.5">Superficie</th>
                  <th className="px-2 py-1.5">Precio</th>
                  <th className="px-2 py-1.5">Estado / Ubic.</th>
                  <th className="px-2 py-1.5 text-right">USD/{u} ajustado</th>
                </tr>
              </thead>
              <tbody>
                {comparables.map((c, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-2 py-1.5">{i + 1}</td>
                    <td className="px-2 py-1.5">{c.esTasacion ? "Tasación previa" : c.esCierre ? "Venta concretada" : "Publicación activa"}</td>
                    <td className="px-2 py-1.5">
                      {formatoSuperficie(r.comparables[i].superficie, u)}
                      {k.terreno && c.m2Terreno ? <span className="text-gray-400"> ({c.m2Terreno} m² terreno)</span> : null}
                    </td>
                    <td className="px-2 py-1.5">{formatoUsd(c.precio)}</td>
                    <td className="px-2 py-1.5">
                      {c.estado} / {c.ubicacion}
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold" style={{ color: NAVY }}>
                      {formatoUsd(r.comparables[i].ajustado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Seccion>
        )}

        {/* Compromisos */}
        {compromisos.length > 0 && (
          <Seccion titulo={`Nuestros compromisos con vos`}>
            <div className="grid grid-cols-2 gap-3">
              {compromisos.map((c) =>
                c.tipo === "compromiso" ? (
                  <div key={c.numero} className="rounded-lg border border-gray-200 p-3">
                    <p className="font-semibold" style={{ color: NAVY }}>
                      {c.numero}. {c.titulo}
                    </p>
                    <p className="text-xs text-gray-600">{c.texto}</p>
                  </div>
                ) : null
              )}
            </div>
          </Seccion>
        )}

        {/* Firma */}
        <footer className="mt-10 border-t pt-4 text-xs text-gray-600" style={{ borderColor: GOLD }}>
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="font-semibold" style={{ color: NAVY }}>
                {agente?.nombre}
              </p>
              <p>{empresa}</p>
              {agente?.telefono && <p>📞 {agente.telefono}</p>}
              {agente?.email && <p>✉️ {agente.email}</p>}
            </div>
            <div className="text-right">
              {config?.telefonoEmpresa && <p>{config.telefonoEmpresa}</p>}
              {config?.emailEmpresa && <p>{config.emailEmpresa}</p>}
              {config?.direccion && <p>{config.direccion}</p>}
            </div>
          </div>
          <p className="mt-4 text-[10px] text-gray-400">
            Este informe es una opinión de valor de mercado elaborada por {empresa} con el método comparativo de mercado, a
            partir de la información disponible a la fecha. No constituye una tasación oficial ni pericial (por ejemplo,
            para un banco o un juicio). Los valores pueden variar según la evolución del mercado.
          </p>
        </footer>
      </article>
    </div>
  );
}
