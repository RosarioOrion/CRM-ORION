"use client";

import { useActionState, useState } from "react";
import { crearPropiedad, type PropiedadState } from "./actions";

const initialState: PropiedadState = {};

type Contacto = { id: string; nombre: string };

const TIPOS = [
  "Apartamento",
  "Casa",
  "Local",
  "Oficina",
  "Garage",
  "Terreno",
  "Quinta",
  "Campo",
  "Chacra",
  "Estancia",
];

// Tipos "construidos": tienen m² cubiertos, baños, estado edilicio y extras
const TIPOS_CONSTRUIDOS = ["Apartamento", "Casa", "Local", "Oficina", "Garage"];
// De esos, cuáles suelen tener dormitorios
const TIPOS_CON_DORMITORIOS = ["Apartamento", "Casa"];
// Tipos que se miden en m² de terreno
const TIPOS_TERRENO_M2 = ["Terreno", "Quinta"];
// Tipos rurales que se miden en hectáreas
const TIPOS_RURALES_HA = ["Campo", "Chacra", "Estancia"];

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

const EXTRAS = [
  "Garaje",
  "Parrillero",
  "Piscina",
  "Patio",
  "Terraza",
  "Ascensor",
  "Amoblado",
  "Balcón",
  "Jardín",
  "Conexión lavarropas",
  "Mascotas OK",
];

const inputClass =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy";

export function NuevaPropiedadForm({ contactos }: { contactos: Contacto[] }) {
  const [state, formAction, pending] = useActionState(
    crearPropiedad,
    initialState
  );

  if (contactos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-500">
        Para publicar una propiedad primero necesitás cargar al menos un
        contacto (el dueño). Andá a la sección Contactos.
      </div>
    );
  }

  return (
    <PropiedadFormFields
      key={state?.ok ?? "initial"}
      contactos={contactos}
      formAction={formAction}
      pending={pending}
      error={state?.error}
    />
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
  const tieneDormitorios = TIPOS_CON_DORMITORIOS.includes(tipo);
  const esTerrenoM2 = TIPOS_TERRENO_M2.includes(tipo);
  const esRuralHa = TIPOS_RURALES_HA.includes(tipo);

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
      <div className="sm:col-span-2 mt-1 border-t border-gray-100 pt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Características
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {esConstruido && (
            <input
              name="m2Cubiertos"
              type="number"
              placeholder="m² cubiertos"
              className={inputClass}
            />
          )}
          {tieneDormitorios && (
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
          {esTerrenoM2 && (
            <input
              name="m2Terreno"
              type="number"
              placeholder="m² de terreno"
              className={inputClass}
            />
          )}
          {esRuralHa && (
            <input
              name="hectareas"
              type="number"
              placeholder="Hectáreas"
              className={inputClass}
            />
          )}
        </div>
        {esConstruido && (
          <select
            name="estadoEdilicio"
            defaultValue=""
            className={`mt-3 w-full ${inputClass}`}
          >
            <option value="">Estado edilicio (opcional)</option>
            {ESTADOS_EDILICIOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Extras */}
      {esConstruido && (
        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Extras
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {EXTRAS.map((ex) => (
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
