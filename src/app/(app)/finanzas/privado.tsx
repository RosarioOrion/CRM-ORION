/** Mis finanzas no se puede ver con "Entrar como". */
export function Privado() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
      <p className="text-4xl">🔒</p>
      <h1 className="mt-2 text-lg font-bold text-orion-navy dark:text-white">Mis finanzas es privado</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Cada persona ve solo sus propias finanzas. No se puede ver con “Entrar como”.
      </p>
    </div>
  );
}
