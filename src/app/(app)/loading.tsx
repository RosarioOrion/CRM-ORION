// Se muestra al instante mientras carga cualquier sección del CRM, así al
// tocar una opción del menú (sobre todo en el celular) se ve que respondió.
export default function Cargando() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3" aria-live="polite">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-orion-navy/20 border-t-orion-navy dark:border-white/20 dark:border-t-orion-gold" />
      <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>
    </div>
  );
}
