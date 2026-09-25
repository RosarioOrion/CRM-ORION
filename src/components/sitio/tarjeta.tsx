import Link from "next/link";
import { OPERACION_LABEL } from "@/lib/propiedades";
import { precioTexto, tituloPublico, urlFoto, type TarjetaPropiedad } from "@/lib/sitio";

export function TarjetaSitio({ p }: { p: TarjetaPropiedad }) {
  const m2 = p.m2Cubiertos ?? p.m2Privados ?? p.m2Terreno;
  const datos = [
    m2 ? `${m2} m²` : p.hectareas ? `${p.hectareas} ha` : null,
    p.dormitorios ? `${p.dormitorios} dorm.` : null,
    p.banos ? `${p.banos} baño${p.banos > 1 ? "s" : ""}` : null,
    p.cocheras ? `${p.cocheras} garaje` : null,
  ].filter(Boolean);

  return (
    <Link
      href={`/inmuebles/${p.codigo}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#16295c] to-[#0f1f45]">
        {p.cantidadFotos > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urlFoto(p.id, 0)}
            alt={tituloPublico(p.titulo)}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-white/70">
            <span className="text-4xl">🏠</span>
            <span className="mt-1 text-xs uppercase tracking-widest">{p.tipo}</span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-orion-navy shadow-sm">
            {OPERACION_LABEL[p.operacion]}
          </span>
          {p.estado === "RESERVADA" && (
            <span className="rounded-full bg-orion-gold px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
              Reservada
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-lg font-bold text-orion-navy">{precioTexto(p.precio, p.moneda)}</p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-gray-800">
          {tituloPublico(p.titulo)}
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          📍 {p.zona}
          {p.departamento && !p.zona.includes(p.departamento) ? `, ${p.departamento}` : ""}
        </p>
        {datos.length > 0 && (
          <p className="mt-auto pt-3 text-xs font-medium text-gray-600">{datos.join(" · ")}</p>
        )}
      </div>
    </Link>
  );
}
