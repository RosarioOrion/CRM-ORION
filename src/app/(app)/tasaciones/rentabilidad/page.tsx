import Link from "next/link";
import { CalculadoraRentabilidad } from "./calculadora";

export default function RentabilidadPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/tasaciones" className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold">
        ← Volver a Tasaciones
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-orion-navy dark:text-white">📈 Rentabilidad</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Cuánto rinde una propiedad alquilada, o cuánto vale por la renta que deja (método de capitalización).
      </p>
      <CalculadoraRentabilidad />
    </div>
  );
}
