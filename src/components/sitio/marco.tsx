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
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orion-navy text-sm font-bold text-orion-gold">
              O
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold tracking-wide text-orion-navy">ORION</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-orion-gold">
                Propiedades
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
            <Link
              href="/inmuebles?operacion=VENTA"
              className="rounded-lg px-2.5 py-2 text-gray-700 hover:bg-gray-100 hover:text-orion-navy"
            >
              Comprar
            </Link>
            <Link
              href="/inmuebles?operacion=ALQUILER"
              className="rounded-lg px-2.5 py-2 text-gray-700 hover:bg-gray-100 hover:text-orion-navy"
            >
              Alquilar
            </Link>
            <Link
              href={sesion ? "/dashboard" : "/login"}
              className="ml-1 hidden rounded-lg border border-orion-navy/20 px-3 py-1.5 text-xs font-semibold text-orion-navy hover:bg-orion-navy hover:text-white sm:inline-block"
            >
              {sesion ? "Ir al CRM" : "Acceso agentes"}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 bg-orion-navy text-white/80">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <p className="text-base font-bold tracking-wide text-white">ORION</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-orion-gold">
              Propiedades
            </p>
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
