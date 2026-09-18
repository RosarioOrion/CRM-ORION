import { notFound, redirect } from "next/navigation";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { obtenerConfiguracion } from "./actions";
import { EditarConfiguracionForm } from "./editar-configuracion-form";

export default async function AjustesPage() {
  const sesion = await obtenerSesion();
  if (!sesion) notFound();
  if (!esAdmin(sesion.rol)) redirect("/perfil");

  const config = await obtenerConfiguracion();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold text-orion-navy dark:text-white">
        Ajustes de la cuenta
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Configuración general de la inmobiliaria dentro de {config.nombreCrm}: nombre, marca,
        datos de contacto y sistema de comisiones. Esto se ve reflejado para todo el equipo.
      </p>

      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <EditarConfiguracionForm
          nombreCrm={config.nombreCrm}
          nombreEmpresa={config.nombreEmpresa}
          filosofia={config.filosofia}
          colorPrimario={config.colorPrimario}
          colorSecundario={config.colorSecundario}
          logo={config.logo}
          sistemaComisiones={config.sistemaComisiones}
          telefonoEmpresa={config.telefonoEmpresa}
          emailEmpresa={config.emailEmpresa}
          direccion={config.direccion}
        />
      </div>
    </div>
  );
}
