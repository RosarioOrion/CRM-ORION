import { obtenerSesion, esAdmin } from "@/lib/auth";
import { VARIABLES_AYUDA } from "@/lib/plantillas-whatsapp";
import { listarPlantillas } from "./actions";
import { ListaMensajes } from "./lista-mensajes";

export default async function MensajesPage() {
  const sesion = await obtenerSesion();
  if (!sesion) return null;
  const admin = esAdmin(sesion.rol);
  const plantillas = await listarPlantillas();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-orion-navy dark:text-white">Mensajes de WhatsApp</h1>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Mensajes listos para usar desde el botón <strong>💬 WhatsApp ▾</strong> de cada contacto y
        propiedad. Al elegir uno, Orion completa el nombre y abre WhatsApp con el texto escrito: lo
        revisás y lo enviás.
      </p>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        <p className="mb-1 font-semibold text-gray-700 dark:text-gray-200">Datos que se completan solos:</p>
        <ul className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
          {VARIABLES_AYUDA.map((v) => (
            <li key={v.clave}>
              <code className="rounded bg-gray-100 px-1 text-orion-navy dark:bg-gray-700 dark:text-orion-gold">
                {v.clave}
              </code>{" "}
              {v.descripcion}
            </li>
          ))}
        </ul>
      </div>

      <ListaMensajes plantillas={plantillas} admin={admin} />
    </div>
  );
}
