"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buscarRapido, type ResultadoRapido } from "@/app/(app)/busqueda-rapida-actions";

// Buscador rápido y botón "+ Nuevo", como en Lumen OS: desde cualquier
// pantalla. En la computadora van arriba del contenido (y Ctrl+K / ⌘K abre
// el buscador); en el celular, como íconos en la barra superior.

const NUEVO = [
  { href: "/contactos?nuevo=1", label: "Contacto", icono: "👤" },
  { href: "/propiedades?nuevo=1", label: "Propiedad", icono: "🏢" },
  { href: "/agenda?nuevo=1", label: "Visita o actividad", icono: "📅" },
  { href: "/busquedas?nuevo=1", label: "Búsqueda", icono: "🔍" },
  { href: "/captaciones?nuevo=1", label: "Captación", icono: "🚀" },
];

const ICONO: Record<ResultadoRapido["tipo"], string> = { contacto: "👤", propiedad: "🏢", busqueda: "🔍" };
const GRUPO: Record<ResultadoRapido["tipo"], string> = {
  contacto: "Contactos",
  propiedad: "Propiedades",
  busqueda: "Búsquedas",
};

export function AccionesRapidas({ compacto = false }: { compacto?: boolean }) {
  const [buscando, setBuscando] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Ctrl+K / ⌘K (una sola vez: en la versión de computadora).
  useEffect(() => {
    if (compacto) return;
    const atajo = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuscando(true);
      }
    };
    window.addEventListener("keydown", atajo);
    return () => window.removeEventListener("keydown", atajo);
  }, [compacto]);

  useEffect(() => {
    if (!menu) return;
    const cerrar = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", cerrar);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", cerrar);
    };
  }, [menu]);

  const menuNuevo = menu && (
    <div
      className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-800"
    >
      {NUEVO.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setMenu(false)}
          className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <span>{n.icono}</span>
          {n.label}
        </Link>
      ))}
    </div>
  );

  return (
    <>
      {compacto ? (
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setBuscando(true)}
            className="rounded-lg px-2 py-1 text-xl leading-none hover:bg-white/10"
            aria-label="Buscar"
          >
            🔍
          </button>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenu((m) => !m)}
              className="rounded-lg bg-orion-gold px-2.5 py-1 text-lg font-bold leading-none text-orion-navy"
              aria-label="Nuevo"
              aria-expanded={menu}
            >
              ＋
            </button>
            {menuNuevo}
          </div>
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setBuscando(true)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-400 shadow-sm hover:border-orion-navy dark:border-gray-700 dark:bg-gray-800"
          >
            <span>🔍</span>
            <span className="flex-1 truncate">Buscar contacto, propiedad o búsqueda…</span>
            <kbd className="rounded border border-gray-200 px-1.5 text-[11px] text-gray-400 dark:border-gray-600">Ctrl K</kbd>
          </button>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenu((m) => !m)}
              className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orion-navy-light"
              aria-expanded={menu}
            >
              + Nuevo
            </button>
            {menuNuevo}
          </div>
        </div>
      )}
      {buscando && <VentanaBusqueda onCerrar={() => setBuscando(false)} />}
    </>
  );
}

function VentanaBusqueda({ onCerrar }: { onCerrar: () => void }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<ResultadoRapido[]>([]);
  const [cargando, setCargando] = useState(false);
  const [elegido, setElegido] = useState(0);
  const pedido = useRef(0);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Busca 250 ms después de dejar de escribir; descarta respuestas viejas.
  useEffect(() => {
    const q = texto.trim();
    const n = ++pedido.current;
    if (q.length < 2) return;
    const t = setTimeout(async () => {
      setCargando(true);
      try {
        const r = await buscarRapido(q);
        if (n === pedido.current) {
          setResultados(r);
          setElegido(0);
        }
      } finally {
        if (n === pedido.current) setCargando(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [texto]);

  const visibles = texto.trim().length < 2 ? [] : resultados;

  function abrir(r: ResultadoRapido) {
    onCerrar();
    router.push(r.href);
  }

  function teclas(e: React.KeyboardEvent) {
    if (e.key === "Escape") onCerrar();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setElegido((i) => Math.min(i + 1, visibles.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setElegido((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && visibles[elegido]) {
      e.preventDefault();
      abrir(visibles[elegido]);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 p-4 pt-[10vh]" onClick={onCerrar}>
      <div
        role="dialog"
        aria-label="Buscar"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-xl bg-white text-gray-900 shadow-2xl dark:bg-gray-800 dark:text-white"
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 dark:border-gray-700">
          <span>🔍</span>
          <input
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={teclas}
            placeholder="Nombre, teléfono, código, barrio…"
            className="min-w-0 flex-1 bg-transparent py-3 text-base text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
            aria-label="Buscar"
          />
          <button type="button" onClick={onCerrar} className="text-xs text-gray-400 hover:text-gray-600">
            Esc
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-1">
          {texto.trim().length < 2 ? (
            <p className="px-4 py-3 text-sm text-gray-400">Escribí al menos 2 letras.</p>
          ) : cargando && visibles.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">Buscando…</p>
          ) : visibles.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">No encontré nada con “{texto.trim()}”.</p>
          ) : (
            visibles.map((r, i) => (
              <div key={r.href + i}>
                {(i === 0 || visibles[i - 1].tipo !== r.tipo) && (
                  <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {GRUPO[r.tipo]}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => abrir(r)}
                  onMouseEnter={() => setElegido(i)}
                  className={`flex w-full items-start gap-3 px-4 py-2 text-left ${
                    i === elegido ? "bg-orion-navy/5 dark:bg-white/5" : ""
                  }`}
                >
                  <span className="mt-0.5">{ICONO[r.tipo]}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{r.titulo}</span>
                    {r.detalle && <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{r.detalle}</span>}
                  </span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
