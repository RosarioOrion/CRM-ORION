import Link from "next/link";
import { obtenerSesion } from "@/lib/auth";
import { NOMBRE_SITIO } from "@/lib/sitio";

/**
 * Encabezado y pie de la página web pública (Orion Propiedades).
 * Siempre en modo claro, aunque el CRM esté en modo oscuro.
 */
export async function MarcoSitio({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesion();
  const anio = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f5f2] text-[#1c2333]">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-orion-navy/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex shrink-0 items-center" aria-label="Orion Propiedades — inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/orion-logo.png" alt="Orion Propiedades" className="h-10 w-auto sm:h-12" />
          </Link>

          <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
            <Link
              href="/inmuebles?operacion=VENTA"
              className="rounded-lg px-2.5 py-2 text-white/80 hover:bg-white/10 hover:text-orion-gold"
            >
              Comprar
            </Link>
            <Link
              href="/inmuebles?operacion=ALQUILER"
              className="rounded-lg px-2.5 py-2 text-white/80 hover:bg-white/10 hover:text-orion-gold"
            >
              Alquilar
            </Link>
            <Link
              href={sesion ? "/dashboard" : "/login"}
              className="ml-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-orion-gold/50 px-2.5 py-1.5 text-xs font-semibold text-orion-gold hover:bg-orion-gold hover:text-orion-navy sm:px-3"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
              </svg>
              {sesion ? "Ir al CRM" : "Acceso agentes"}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 bg-orion-navy text-white/80">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/orion-logo.png" alt="Orion Propiedades" className="h-auto w-48" />
            <p className="mt-3 text-sm">
              Asesoramiento inmobiliario personalizado en Montevideo y todo Uruguay.
            </p>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-semibold text-white">Propiedades</p>
            <ul className="space-y-1">
              <li>
                <Link href="/inmuebles?operacion=VENTA" className="hover:text-orion-gold">
                  En venta
                </Link>
              </li>
              <li>
                <Link href="/inmuebles?operacion=ALQUILER" className="hover:text-orion-gold">
                  En alquiler
                </Link>
              </li>
              <li>
                <Link href="/inmuebles" className="hover:text-orion-gold">
                  Todas
                </Link>
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-semibold text-white">Agentes</p>
            <Link href={sesion ? "/dashboard" : "/login"} className="hover:text-orion-gold">
              {sesion ? "Ir al CRM" : "Acceso agentes"}
            </Link>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
          © {anio} {NOMBRE_SITIO}
        </div>
      </footer>
    </div>
  );
}
