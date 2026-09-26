"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { restaurar } from "./actions";

/** Restaura y abre el contacto o la propiedad recuperada. */
export function BotonRestaurar({ id }: { id: string }) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    start(async () => {
      const r = await restaurar(id);
      if (!r.ok) {
        setError(r.error ?? "No se pudo restaurar.");
        return;
      }
      if (r.mensaje && r.mensaje !== "Restaurado con todo lo suyo.") window.alert(r.mensaje);
      if (r.href) router.push(r.href);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pendiente}
        onClick={onClick}
        className="rounded-lg bg-orion-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pendiente ? "Restaurando…" : "↩ Restaurar"}
      </button>
      {error && <p className="max-w-xs text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
