"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Envoltorio de la barra lateral. En computadora se ve fija a la izquierda,
 * como siempre. En el celular se esconde y aparece una barra superior con
 * el botón ☰ que la abre como un panel deslizable.
 */
export function MenuLateral({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Se guarda en qué sección se abrió el menú: al navegar a otra sección
  // deja de coincidir y el menú queda cerrado solo.
  const [abiertoEn, setAbiertoEn] = useState<string | null>(null);
  const abierto = abiertoEn === pathname;
  const setAbierto = (v: boolean) => setAbiertoEn(v ? pathname : null);

  // Mientras el menú está abierto en el celular, no se desplaza el fondo.
  useEffect(() => {
    document.body.style.overflow = abierto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);

  return (
    <>
      {/* Barra superior (solo celular) */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 bg-orion-navy px-4 text-white shadow md:hidden">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="-ml-1 rounded-lg px-2 py-1 text-2xl leading-none hover:bg-white/10"
          aria-label="Abrir menú"
        >
          ☰
        </button>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orion-gold text-sm font-bold text-orion-navy">
          O
        </div>
        <span className="text-base font-bold tracking-wide">ORION</span>
      </header>

      {/* Fondo oscuro detrás del menú abierto (solo celular) */}
      {abierto && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setAbierto(false)}
          aria-hidden
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto bg-orion-navy text-white transition-transform duration-200",
          "md:sticky md:top-0 md:h-screen md:w-60 md:translate-x-0",
          abierto ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="absolute right-3 top-4 rounded-lg px-2 py-1 text-lg text-white/70 hover:bg-white/10 hover:text-white md:hidden"
          aria-label="Cerrar menú"
        >
          ✕
        </button>
        {children}
      </aside>
    </>
  );
}
