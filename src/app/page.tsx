import Link from "next/link";
import type { Metadata } from "next";
import { MarcoSitio } from "@/components/sitio/marco";
import { TarjetaSitio } from "@/components/sitio/tarjeta";
import { Buscador } from "@/components/sitio/buscador";
import { NOMBRE_SITIO, opcionesFiltros, propiedadesDestacadas } from "@/lib/sitio";

// Portada de la página web pública. (El CRM sigue en /dashboard y /login.)

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${NOMBRE_SITIO} — Casas, apartamentos y campos en Uruguay`,
  description:
    "Propiedades en venta y alquiler en Montevideo y todo Uruguay. Asesoramiento inmobiliario personalizado.",
};

export default async function Portada() {
  const [destacadas, opciones] = await Promise.all([propiedadesDestacadas(6), opcionesFiltros()]);

  return (
    <MarcoSitio>
      {/* Portada */}
      <section className="relative overflow-hidden bg-orion-navy">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #c9972e 0, transparent 40%), radial-gradient(circle at 85% 70%, #2a4a9a 0, transparent 45%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:pb-24 sm:pt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orion-gold">
            {NOMBRE_SITIO}
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight text-white sm:text-5xl">
            Encontrá tu próximo lugar en Uruguay
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/75">
            Casas, apartamentos, locales, terrenos y campos. Te acompañamos en todo el proceso,
            de la primera visita a la firma.
          </p>

          <div className="mt-8 max-w-4xl">
            <Buscador tipos={opciones.tipos} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/inmuebles?operacion=VENTA"
              className="rounded-full bg-white/10 px-4 py-1.5 font-medium text-white ring-1 ring-white/20 hover:bg-white/20"
            >
              {opciones.venta} en venta
            </Link>
            <Link
              href="/inmuebles?operacion=ALQUILER"
              className="rounded-full bg-white/10 px-4 py-1.5 font-medium text-white ring-1 ring-white/20 hover:bg-white/20"
            >
              {opciones.alquiler} en alquiler
            </Link>
          </div>
        </div>
      </section>

      {/* Destacadas */}
      <section className="mx-auto max-w-6xl px-4 pt-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orion-gold">
              Novedades
            </p>
            <h2 className="mt-1 text-2xl font-bold text-orion-navy">Propiedades destacadas</h2>
          </div>
          <Link href="/inmuebles" className="shrink-0 text-sm font-semibold text-orion-navy hover:underline">
            Ver todas →
          </Link>
        </div>

        {destacadas.length === 0 ? (
          <p className="rounded-2xl bg-white p-10 text-center text-gray-500 ring-1 ring-black/5">
            Pronto vas a encontrar acá nuestras propiedades.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {destacadas.map((p) => (
              <TarjetaSitio key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>

      {/* Por qué */}
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["🤝", "Acompañamiento real", "Una asesora dedicada que te responde y te acompaña de principio a fin."],
            ["📍", "Conocemos el mercado", "Montevideo, Canelones y el interior: barrios, precios y oportunidades."],
            ["✍️", "Operaciones seguras", "Reservas, boletos y escrituras coordinadas con escribanos de confianza."],
          ].map(([icono, titulo, texto]) => (
            <div key={titulo} className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
              <p className="text-2xl">{icono}</p>
              <p className="mt-2 font-bold text-orion-navy">{titulo}</p>
              <p className="mt-1 text-sm text-gray-600">{texto}</p>
            </div>
          ))}
        </div>
      </section>
    </MarcoSitio>
  );
}
