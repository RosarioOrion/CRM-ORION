import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MarcoSitio } from "@/components/sitio/marco";
import { Galeria } from "@/components/sitio/galeria";
import { OPERACION_LABEL } from "@/lib/propiedades";
import {
  NOMBRE_SITIO,
  numeroWhatsApp,
  precioTexto,
  propiedadPublica,
  tituloPublico,
  urlFoto,
} from "@/lib/sitio";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ codigo: string }>;
}): Promise<Metadata> {
  const { codigo } = await params;
  const p = await propiedadPublica(codigo);
  if (!p) return { title: NOMBRE_SITIO };
  const titulo = tituloPublico(p.titulo);
  return {
    title: `${titulo} — ${NOMBRE_SITIO}`,
    description: `${OPERACION_LABEL[p.operacion]} · ${p.tipo} en ${p.zona} · ${precioTexto(p.precio, p.moneda)}`,
  };
}

export default async function FichaPublica({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const p = await propiedadPublica(codigo);
  if (!p) notFound();

  const titulo = tituloPublico(p.titulo);
  const fotos = Array.from({ length: p.cantidadFotos }, (_, n) => urlFoto(p.id, n));

  const caracteristicas: [string, string][] = (
    [
      ["Tipo", p.subtipo ? `${p.tipo} · ${p.subtipo}` : p.tipo],
      ["Superficie cubierta", p.m2Cubiertos ? `${p.m2Cubiertos} m²` : null],
      ["Superficie privada", p.m2Privados ? `${p.m2Privados} m²` : null],
      ["Terreno", p.m2Terreno ? `${p.m2Terreno} m²` : null],
      ["Hectáreas", p.hectareas ? `${p.hectareas} ha` : null],
      ["Ambientes", p.ambientes ? String(p.ambientes) : null],
      ["Dormitorios", p.dormitorios ? String(p.dormitorios) : null],
      ["Baños", p.banos ? String(p.banos) : null],
      ["Garajes", p.cocheras ? String(p.cocheras) : null],
      ["Bodegas", p.bodegas ? String(p.bodegas) : null],
      ["Piso", p.numeroPiso ? `${p.numeroPiso}${p.cantidadPisos ? ` de ${p.cantidadPisos}` : ""}` : null],
      ["Orientación", p.orientacion],
      ["Disposición", p.disposicion],
      ["Antigüedad", p.antiguedad ? `${p.antiguedad} años` : null],
      ["Estado", p.estadoEdilicio],
      [
        "Gastos comunes",
        p.gastosComunes ? `$ ${p.gastosComunes.toLocaleString("es-UY")}` : null,
      ],
      ["Mascotas", p.operacion === "ALQUILER" ? (p.mascotas ? "Se aceptan" : null) : null],
    ] as [string, string | null][]
  ).filter((c): c is [string, string] => Boolean(c[1]));

  const wa = numeroWhatsApp(p.agenteTelefono);
  const mensaje = `Hola ${p.agenteNombre.split(" ")[0]}, vi en ${NOMBRE_SITIO} la propiedad ${p.codigo} (${titulo}) y me gustaría recibir más información.`;
  const linkWa = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(mensaje)}` : null;

  return (
    <MarcoSitio>
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <nav className="mb-4 text-xs text-gray-500">
          <Link href="/" className="hover:text-orion-navy">
            Inicio
          </Link>{" "}
          ›{" "}
          <Link href={`/inmuebles?operacion=${p.operacion}`} className="hover:text-orion-navy">
            {p.operacion === "VENTA" ? "En venta" : "En alquiler"}
          </Link>{" "}
          › <span className="text-gray-700">{p.codigo}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            <Galeria urls={fotos} alt={titulo} tipo={p.tipo} />

            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-orion-navy px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  {OPERACION_LABEL[p.operacion]}
                </span>
                {p.estado === "RESERVADA" && (
                  <span className="rounded-full bg-orion-gold px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                    Reservada
                  </span>
                )}
                <span className="text-xs font-semibold text-gray-400">Ref. {p.codigo}</span>
              </div>
              <h1 className="mt-3 text-2xl font-bold leading-snug text-orion-navy sm:text-3xl">{titulo}</h1>
              <p className="mt-1 text-sm text-gray-600">
                📍 {p.zona}
                {p.departamento && !p.zona.includes(p.departamento) ? `, ${p.departamento}` : ""}
              </p>
              <p className="mt-3 text-3xl font-bold text-orion-navy lg:hidden">
                {precioTexto(p.precio, p.moneda)}
              </p>
            </div>

            {caracteristicas.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 text-lg font-bold text-orion-navy">Características</h2>
                <dl className="grid grid-cols-2 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 sm:grid-cols-3">
                  {caracteristicas.map(([k, v]) => (
                    <div key={k} className="border-b border-r border-black/5 p-3">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{k}</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-gray-800">{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {p.descripcion && (
              <section className="mt-8">
                <h2 className="mb-3 text-lg font-bold text-orion-navy">Descripción</h2>
                <div className="whitespace-pre-line rounded-2xl bg-white p-5 text-sm leading-relaxed text-gray-700 ring-1 ring-black/5">
                  {p.descripcion}
                </div>
              </section>
            )}

            {p.extras.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 text-lg font-bold text-orion-navy">Comodidades</h2>
                <ul className="flex flex-wrap gap-2">
                  {p.extras.map((e) => (
                    <li key={e} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-black/10">
                      ✓ {e}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Contacto */}
          <aside>
            <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 lg:sticky lg:top-20">
              <p className="hidden text-3xl font-bold text-orion-navy lg:block">
                {precioTexto(p.precio, p.moneda)}
              </p>
              <div className="flex items-center gap-3 border-t border-gray-100 pt-4 lg:border-t">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orion-navy text-lg font-bold text-orion-gold">
                  {p.agenteNombre.charAt(0)}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Te atiende</p>
                  <p className="font-semibold text-gray-800">{p.agenteNombre}</p>
                </div>
              </div>
              {linkWa && (
                <a
                  href={linkWa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white transition hover:brightness-105"
                >
                  💬 Consultar por WhatsApp
                </a>
              )}
              {p.agenteTelefono && (
                <a
                  href={`tel:${p.agenteTelefono.replace(/\s/g, "")}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-orion-navy/20 py-3 text-sm font-semibold text-orion-navy hover:bg-gray-50"
                >
                  📞 Llamar
                </a>
              )}
            </div>
          </aside>
        </div>
      </div>
    </MarcoSitio>
  );
}
