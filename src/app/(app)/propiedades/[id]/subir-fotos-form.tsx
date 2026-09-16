"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { agregarFotos } from "../actions";

// Subimos las fotos en lotes en vez de mandarlas todas juntas en un solo
// pedido: así, aunque el usuario elija muchas fotos de cámara/celular
// (que pesan varios MB cada una), nunca chocamos con el límite de tamaño
// del body del Server Action. Cada lote se arma sumando pesos hasta este
// tope, dejando margen debajo del límite configurado en next.config.ts.
const LOTE_MAX_BYTES = 15 * 1024 * 1024;

function armarLotes(archivos: File[]): File[][] {
  const lotes: File[][] = [];
  let loteActual: File[] = [];
  let pesoActual = 0;

  for (const archivo of archivos) {
    if (loteActual.length > 0 && pesoActual + archivo.size > LOTE_MAX_BYTES) {
      lotes.push(loteActual);
      loteActual = [];
      pesoActual = 0;
    }
    loteActual.push(archivo);
    pesoActual += archivo.size;
  }
  if (loteActual.length > 0) lotes.push(loteActual);
  return lotes;
}

export function SubirFotosForm({ propiedadId }: { propiedadId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const input =
      formRef.current?.querySelector<HTMLInputElement>('input[name="fotos"]');
    const archivos = input?.files ? Array.from(input.files) : [];

    if (archivos.length === 0) {
      setError("Elegí al menos una foto.");
      return;
    }

    const lotes = armarLotes(archivos);
    setEnviando(true);

    try {
      for (let i = 0; i < lotes.length; i++) {
        setProgreso(
          lotes.length > 1
            ? `Subiendo fotos… (lote ${i + 1} de ${lotes.length})`
            : "Subiendo fotos…"
        );

        const fd = new FormData();
        for (const archivo of lotes[i]) fd.append("fotos", archivo);

        const resultado = await agregarFotos(propiedadId, {}, fd);
        if (resultado.error) {
          setError(resultado.error);
          return;
        }
      }

      formRef.current?.reset();
      router.refresh();
    } catch {
      setError("No se pudieron subir las fotos. Probá de nuevo.");
    } finally {
      setEnviando(false);
      setProgreso(null);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <input
        type="file"
        name="fotos"
        accept="image/*"
        multiple
        required
        disabled={enviando}
        className="text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orion-navy file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-orion-navy-light disabled:opacity-60 dark:text-gray-300"
      />
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-orion-gold px-3 py-1.5 text-xs font-semibold text-orion-navy transition hover:brightness-95 disabled:opacity-60"
      >
        {enviando ? progreso ?? "Subiendo…" : "Subir fotos"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
