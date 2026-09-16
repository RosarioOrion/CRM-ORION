"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { agregarFotos } from "../actions";

// Antes de subir, achicamos cada foto en el navegador (redimensionar +
// recomprimir a JPEG). Las fotos de celular real suelen pesar 4-10MB a
// resolución completa; para verlas en una ficha de propiedad no hace
// falta esa resolución, así que esto las deja típicamente en unos
// cientos de KB sin pérdida notoria de calidad. Resultado: lotes mucho
// más livianos, menos pedidos al servidor, y subidas varias veces más
// rápidas — sin tocar el límite del body del Server Action.
const LADO_MAXIMO_PX = 1920;
const CALIDAD_JPEG = 0.82;

async function comprimirImagen(archivo: File): Promise<File> {
  if (!archivo.type.startsWith("image/") || archivo.type === "image/svg+xml") {
    return archivo;
  }

  try {
    const bitmap = await createImageBitmap(archivo);
    let { width, height } = bitmap;

    if (width > LADO_MAXIMO_PX || height > LADO_MAXIMO_PX) {
      const escala = Math.min(LADO_MAXIMO_PX / width, LADO_MAXIMO_PX / height);
      width = Math.round(width * escala);
      height = Math.round(height * escala);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return archivo;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", CALIDAD_JPEG)
    );

    // Si la compresión falló o (foto ya chica/optimizada) termina pesando
    // más que el original, nos quedamos con el archivo tal cual vino.
    if (!blob || blob.size >= archivo.size) return archivo;

    const nombre = archivo.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg" });
  } catch {
    // Formato que el navegador no puede decodificar (raro) -> subimos el original.
    return archivo;
  }
}

// Aun con fotos comprimidas, seguimos mandando en lotes (no todo en un
// solo pedido) para no depender de un único request gigante, y los
// subimos con algo de paralelismo para aprovechar mejor la conexión.
const LOTE_MAX_BYTES = 15 * 1024 * 1024;
const LOTES_EN_PARALELO = 3;

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
    const archivosOriginales = input?.files ? Array.from(input.files) : [];

    if (archivosOriginales.length === 0) {
      setError("Elegí al menos una foto.");
      return;
    }

    setEnviando(true);

    try {
      setProgreso(
        archivosOriginales.length > 1
          ? `Optimizando ${archivosOriginales.length} fotos…`
          : "Optimizando foto…"
      );
      const archivos = await Promise.all(archivosOriginales.map(comprimirImagen));

      const lotes = armarLotes(archivos);
      let completados = 0;
      let huboError: string | null = null;

      // Subimos los lotes con un cupo de paralelismo: se disparan varios
      // pedidos a la vez (no uno por uno esperando cada respuesta), lo que
      // acorta bastante el tiempo total con muchas fotos.
      let siguiente = 0;
      async function trabajador() {
        while (siguiente < lotes.length && !huboError) {
          const indice = siguiente++;
          const fd = new FormData();
          for (const archivo of lotes[indice]) fd.append("fotos", archivo);

          const resultado = await agregarFotos(propiedadId, {}, fd);
          if (resultado.error) {
            huboError = resultado.error;
            return;
          }
          completados++;
          setProgreso(
            lotes.length > 1
              ? `Subiendo fotos… (${completados} de ${lotes.length} lotes)`
              : "Subiendo fotos…"
          );
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(LOTES_EN_PARALELO, lotes.length) }, trabajador)
      );

      if (huboError) {
        setError(huboError);
        return;
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
