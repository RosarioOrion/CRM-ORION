"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { eliminarTasacion } from "./actions";

export function EliminarTasacionBoton({ tasacionId }: { tasacionId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!confirm("¿Borrar esta tasación?")) return;
    startTransition(async () => {
      await eliminarTasacion(tasacionId);
      router.push("/tasaciones");
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-900/20"
    >
      Borrar tasación
    </button>
  );
}
