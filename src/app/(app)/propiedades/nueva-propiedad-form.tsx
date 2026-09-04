"use client";

import { useActionState, useEffect, useState } from "react";
import { crearPropiedad, type PropiedadState } from "./actions";

const initialState: PropiedadState = {};

type Contacto = { id: string; nombre: string };

const TIPOS = [
  "Apartamento",
  "Casa",
  "Oficina",
  "Local",
  "Depósito",
  "Galpón",
  "Garage",
  "Terreno",
  "Quinta",
  "Campo",
  "Chacra",
  "Estancia",
  ];

// Apartamento, Casa y Oficina comparten superficie/baños/cocheras/antigüedad/ambientes
const TIPOS_CONSTRUIDOS = ["Apartamento", "Casa", "Oficina"];
// Apartamento y Casa tienen dormitorios, subtipo, orientación, mascotas, etc.
const TIPOS_APTO_CASA = ["Apartamento", "Casa"];
// Solo Apartamento tiene piso, disposición, gastos comunes y bodega
const TIPOS_SOLO_APARTAMENTO = ["Apartamento"];
// Local, Depósito, Galpón y Garage: en Mercado Libre no llevan características propias
const TIPOS_SIN_CARACTERISTICAS = ["Local", "Depósito", "Galpón", "Garage"];
// Tipos que se miden en m² de terreno
const TIPOS_TERRENO_M2 = ["Terreno", "Quinta"];
// Tipos rurales que se miden en hectáreas
const TIPOS_RURALES = ["Campo", "Chacra", "Estancia"];

const DEPARTAMENTOS = [
  "Montevideo",
  "Canelones",
  "Maldonado",
  "Rocha",
  "Colonia",
  "San José",
  "Florida",
  "Soriano",
  "Paysandú",
  "Río Negro",
  "Salto",
  "Artigas",
  "Rivera",
  "Cerro Largo",
  "Treinta y Tres",
  "Lavalleja",
  "Flores",
  "Durazno",
  "Tacuarembó",
  ];

const ESTADOS_EDILICIOS = [
  "1 – Reciclar total",
  "2 – Reciclar parcial",
  "3 – Regular",
  "4 – Bueno",
  "5 – Muy bueno",
  "6 – Reciclado",
  "7 – A estrenar",
  ];

const ORIENTACIONES = [
  "Norte",
  "Sur",
  "Este",
  "Oeste",
  "Noreste",
  "Noroeste",
  "Sureste",
  "Suroeste",
  ];

const DISPOSICIONES = ["Al frente", "Al contrafrente", "Lateral", "Interior"];

const ACCESOS = [
  "Ruta asfaltada",
  "Camino balastado",
  "Camino de tierra",
  "Otro",
  ];

const FORMAS_TERRENO = ["Regular", "Irregular"];

const EXTRAS_SERVICIOS = [
  "Agua corriente",
  "Gas natural",
  "Aire acondicionado",
  "Calefacción",
  "Conexión lavarropas",
  ];

const EXTRAS_SEGURIDAD = ["Circuito de cámaras", "Acceso controlado"];

const EXTRAS_AMBIENTES = [
  "Placards",
  "Desayunador",
  "Baño social",
  "Comedor",
  "Living",
  "Estudio",
  "Balcón",
  "Cocina",
  ];

const EXTRAS_GENERALES = [
  "Garaje",
  "Parrillero",
  "Piscina",
  "Patio",
  "Terraza",
  "Ascensor",
  "Amoblado",
  "Jardín",
  ];

const EXTRAS_RURALES = [
  "Luz eléctrica",
  "Agua corriente",
  "Alambrado",
  "Tajamar",
  "Casa de caseros",
  "Galpón",
  "Corral",
  ];

const inputClass =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy";

export function NuevaPropiedadForm({ contactos }: { contactos: Contacto[] }) {
  const [state, formAction, pending] = useActionState(
    crearPropiedad,
    initialState
    );
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      setAbierto(false);
    }
  }, [state?.ok]);

if (contactos.length === 0) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-500">
    Para publicar una propiedad primero necesitás cargar al menos un
    contacto (el dueño). Andá a la sección Contactos.
    </div>
    );
}

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light"
      >
        <span className="text-base leading-none">+</span> Propiedad nueva
      </button>
    );
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-xs font-semibold text-gray-500 hover:text-orion-navy dark:text-gray-400 dark:hover:text-white"
        >
          Cancelar ✕
        </button>
      </div>
      <PropiedadFormFields
        key={state?.ok ?? "initial"}
        contactos={contactos}
        formAction={formAction}
        pending={pending}
        error={state?.error}
        />
    </div>
    );
}

function PropiedadFormFields({
  contactos,
  formAction,
  pending,
  error,
}: {
  contactos: Contacto[];
  formAction: (formData: FormData) => void;
  pending: boolean;
  error?: string;
}) {
  const [tipo, setTipo] = useState("Apartamento");
  
  const esConstruido = TIPOS_CONSTRUIDOS.includes(tipo);
  const esAptoOCasa = TIPOS_APTO_CASA.includes(tipo);
  const esSoloApartamento = TIPOS_SOLO_APARTAMENTO.includes(tipo);
  const sinCaracteristicas = TIPOS_SIN_CARACTERISTICAS.includes(tipo);
  const esTerrenoM2 = TIPOS_TERRENO_M2.includes(tipo);
  const esRural = TIPOS_RURALES.includes(tipo);
  
  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2"
      >
    <div className="sm:col-span-2">
    <h2 className="text-sm font-semibold text-orion-navy">
    Nueva propiedad
    </h2>
    </div>
    
    <input
      name="titulo"
      placeholder="Título (ej. Apto 2 dorm. en Pocitos)"
      required
      className={`sm:col-span-2 ${inputClass}`}
      />
    
    <select
      name="tipo"
      required
      value={tipo}
      onChange={(e) => setTipo(e.target.value)}
      className={inputClass}
      >
      {TIPOS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
        ))}
    </select>
    <select
      name="operacion"
      required
      defaultValue="VENTA"
      className={inputClass}
      >
    <option value="VENTA">Venta</option>
    <option value="ALQUILER">Alquiler</option>
    </select>
    
      {/* Ubicación */}
    <input
      name="zona"
      placeholder="Barrio / Zona (ej. Pocitos)"
      required
      className={inputClass}
      />
    <select name="departamento" defaultValue="Montevideo" className={inputClass}>
      {DEPARTAMENTOS.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
        ))}
    </select>
    <input
      name="direccion"
      placeholder="Dirección (opcional)"
      className="sm:col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      />
    
      {/* Precio */}
    <div className="flex gap-2">
    <select
      name="moneda"
      defaultValue="USD"
      className="w-24 rounded-lg border border-gray-300 px-2 py-2 text-sm outline-none focus:border-orion-navy"
      >
    <option value="USD">USD</option>
    <option value="UYU">UYU</option>
    </select>
    <input
      name="precio"
      type="number"
      placeholder="Precio (opcional)"
      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      />
    </div>
    <select
      name="duenoId"
      required
      defaultValue=""
      className={inputClass}
      >
    <option value="" disabled>
    Elegí el contacto dueño…
    </option>
      {contactos.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nombre}
        </option>
        ))}
    </select>
    
      {/* Características según el tipo */}
      {!sinCaracteristicas && (
        <div className="sm:col-span-2 mt-1 border-t border-gray-100 pt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Características
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {esConstruido && (
          <input
            name="m2Cubiertos"
            type="number"
            placeholder="Superficie total (m²)"
            className={inputClass}
            />
          )}
          {esConstruido && (
          <input
            name="m2Privados"
            type="number"
            placeholder="Superficie privada (m²)"
            className={inputClass}
            />
          )}
          {esAptoOCasa && (
          <input
            name="dormitorios"
            type="number"
            placeholder="Dormitorios"
            className={inputClass}
            />
          )}
          {esConstruido && (
          <input
            name="banos"
            type="number"
            placeholder="Baños"
            className={inputClass}
            />
          )}
          {esConstruido && (
          <input
            name="ambientes"
            type="number"
            placeholder="Ambientes"
            className={inputClass}
            />
          )}
          {esConstruido && (
          <input
            name="cocheras"
            type="number"
            placeholder="Cocheras"
            className={inputClass}
            />
          )}
          {esSoloApartamento && (
          <input
            name="bodegas"
            type="number"
            placeholder="Bodegas"
            className={inputClass}
            />
          )}
          {esConstruido && (
          <input
            name="antiguedad"
            type="number"
            placeholder="Antigüedad (años)"
            className={inputClass}
            />
          )}
          {esSoloApartamento && (
          <input
            name="numeroPiso"
            type="number"
            placeholder="Número de piso"
            className={inputClass}
            />
          )}
          {esAptoOCasa && (
          <input
            name="cantidadPisos"
            type="number"
            placeholder="Cantidad de pisos"
            className={inputClass}
            />
          )}
          {esTerrenoM2 && (
          <input
            name="m2Terreno"
            type="number"
            placeholder="m² de terreno"
            className={inputClass}
            />
          )}
          {esRural && (
          <input
            name="hectareas"
            type="number"
            placeholder="Hectáreas"
            className={inputClass}
            />
          )}
          {esRural && (
          <input
            name="distanciaAsfalto"
            type="number"
            placeholder="Distancia al asfalto (km)"
            className={inputClass}
            />
          )}
        </div>
        
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {esAptoOCasa && (
          <input
            name="subtipo"
            placeholder={
              tipo === "Apartamento" ? "Tipo de apartamento" : "Tipo de casa"
            }
            className={inputClass}
            />
          )}
          {esAptoOCasa && (
          <select name="orientacion" defaultValue="" className={inputClass}>
          <option value="">Orientación (opcional)</option>
            {ORIENTACIONES.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
            ))}
          </select>
          )}
          {esSoloApartamento && (
          <select name="disposicion" defaultValue="" className={inputClass}>
          <option value="">Disposición (opcional)</option>
            {DISPOSICIONES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
            ))}
          </select>
          )}
          {esSoloApartamento && (
          <input
            name="gastosComunes"
            type="number"
            placeholder="Gastos comunes (opcional)"
            className={inputClass}
            />
          )}
          {esConstruido && (
          <select
            name="estadoEdilicio"
            defaultValue=""
            className={inputClass}
            >
          <option value="">Estado edilicio (opcional)</option>
            {ESTADOS_EDILICIOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
              ))}
          </select>
          )}
          {esRural && (
          <input
            name="subtipo"
            placeholder="Tipo de campo"
            className={inputClass}
            />
          )}
          {esRural && (
          <select name="acceso" defaultValue="" className={inputClass}>
          <option value="">Acceso (opcional)</option>
            {ACCESOS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
            ))}
          </select>
          )}
          {esRural && (
          <select name="formaTerreno" defaultValue="" className={inputClass}>
          <option value="">Forma del terreno (opcional)</option>
            {FORMAS_TERRENO.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
            ))}
          </select>
          )}
        </div>
        
          {esAptoOCasa && (
          <label className="mt-3 flex items-center gap-1.5 text-sm text-gray-600">
          <input type="checkbox" name="mascotas" value="true" />
          Admite mascotas
          </label>
          )}
        </div>
        )}
    
      {/* Extras */}
      {esConstruido && (
        <div className="sm:col-span-2">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Servicios
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {EXTRAS_SERVICIOS.map((ex) => (
          <label
            key={ex}
            className="flex items-center gap-1.5 text-sm text-gray-600"
            >
          <input type="checkbox" name="extras" value={ex} />
            {ex}
          </label>
          ))}
        </div>
        
        <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Seguridad
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {EXTRAS_SEGURIDAD.map((ex) => (
          <label
            key={ex}
            className="flex items-center gap-1.5 text-sm text-gray-600"
            >
          <input type="checkbox" name="extras" value={ex} />
            {ex}
          </label>
          ))}
        </div>
        
        <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Ambientes
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {EXTRAS_AMBIENTES.map((ex) => (
          <label
            key={ex}
            className="flex items-center gap-1.5 text-sm text-gray-600"
            >
          <input type="checkbox" name="extras" value={ex} />
            {ex}
          </label>
          ))}
        </div>
        
        <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Otros
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {EXTRAS_GENERALES.map((ex) => (
          <label
            key={ex}
            className="flex items-center gap-1.5 text-sm text-gray-600"
            >
          <input type="checkbox" name="extras" value={ex} />
            {ex}
          </label>
          ))}
        </div>
        </div>
        )}
    
      {esRural && (
        <div className="sm:col-span-2">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Características adicionales
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {EXTRAS_RURALES.map((ex) => (
          <label
            key={ex}
            className="flex items-center gap-1.5 text-sm text-gray-600"
            >
          <input type="checkbox" name="extras" value={ex} />
            {ex}
          </label>
          ))}
        </div>
        </div>
        )}
    
    <textarea
      name="descripcion"
      placeholder="Descripción (opcional, para portales)"
      rows={3}
      className="sm:col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy"
      />
    
      {error && (
        <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
        )}
    <div className="sm:col-span-2">
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-light disabled:opacity-60"
      >
      {pending ? "Guardando…" : "Publicar propiedad"}
    </button>
    </div>

    </form>
      );
}
