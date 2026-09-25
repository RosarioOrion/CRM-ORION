/**
 * Buscador de propiedades (formulario GET → /inmuebles). Funciona sin JavaScript.
 */
export function Buscador({
  tipos,
  valores = {},
  compacto = false,
}: {
  tipos: string[];
  valores?: { operacion?: string; tipo?: string; zona?: string };
  compacto?: boolean;
}) {
  const campo =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800 outline-none focus:border-orion-gold";

  return (
    <form
      action="/inmuebles"
      method="get"
      className={`grid gap-2 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 ${
        compacto ? "sm:grid-cols-[1fr_1fr_1.5fr_auto]" : "sm:grid-cols-[1fr_1fr_1.5fr_auto]"
      }`}
    >
      <select name="operacion" defaultValue={valores.operacion ?? ""} className={campo} aria-label="Operación">
        <option value="">Comprar o alquilar</option>
        <option value="VENTA">Comprar</option>
        <option value="ALQUILER">Alquilar</option>
      </select>
      <select name="tipo" defaultValue={valores.tipo ?? ""} className={campo} aria-label="Tipo">
        <option value="">Todos los tipos</option>
        {tipos.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <input
        name="zona"
        defaultValue={valores.zona ?? ""}
        placeholder="Barrio o ciudad (ej. Pocitos)"
        className={campo}
        aria-label="Zona"
      />
      <button
        type="submit"
        className="rounded-xl bg-orion-gold px-6 py-3 text-sm font-bold text-white transition hover:brightness-110"
      >
        Buscar
      </button>
    </form>
  );
}
