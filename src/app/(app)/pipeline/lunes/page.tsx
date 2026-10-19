import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { armarSeguimientoLunes } from "@/lib/seguimiento-lunes";
import { ListaLunes } from "./lista-lunes";

export default async function SeguimientoLunesPage() {
  const sesion = await obtenerSesion();
  if (!sesion) notFound();

  const duenos = await armarSeguimientoLunes(sesion.userId);
  const pendientes = duenos.filter((d) => !d.hecho && !d.paraDecidir);
  const paraDecidir = duenos.filter((d) => !d.hecho && d.paraDecidir);
  const hechos = duenos.filter((d) => d.hecho);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/pipeline"
        className="mb-4 inline-block text-sm text-orion-navy hover:underline dark:text-orion-gold"
      >
        ← Volver al Pipeline
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-orion-navy dark:text-white">⚡ Seguimiento del lunes</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Un mensaje por dueño, ya armado con su nombre y sus propiedades. Tocá <b>Enviar</b>, mandalo en
        WhatsApp y volvé: Orion lo registra solo y pasa al siguiente. Cuando te contesten, anotá la
        respuesta acá mismo.
      </p>
      <ListaLunes pendientes={pendientes} paraDecidir={paraDecidir} hechos={hechos} />
    </div>
  );
}
