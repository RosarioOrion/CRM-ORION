import Link from "next/link";
import { NuevaTasacionForm } from "../nueva-tasacion-form";

export default function NuevaTasacionPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/tasaciones"
        className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold"
      >
        ← Volver a Tasaciones
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-orion-navy dark:text-white">
        Nueva tasación
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Método Comparativo de Mercado.
      </p>
      <NuevaTasacionForm />
    </div>
  );
}
