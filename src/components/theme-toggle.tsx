"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [oscuro, setOscuro] = useState(false);

  useEffect(() => {
    setOscuro(document.documentElement.dataset.theme === "dark");
  }, []);

  function alternar() {
    const nuevoOscuro = !oscuro;
    setOscuro(nuevoOscuro);
    document.documentElement.dataset.theme = nuevoOscuro ? "dark" : "light";
    try {
      localStorage.setItem("orion-theme", nuevoOscuro ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
      title={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      <span>{oscuro ? "☀️" : "🌙"}</span>
      <span>{oscuro ? "Modo claro" : "Modo oscuro"}</span>
    </button>
  );
}
