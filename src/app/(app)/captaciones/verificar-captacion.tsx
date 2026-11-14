"use client";

import { useState, useTransition } from "react";
import { TIPOS_PROPIEDAD } from "@/lib/propiedades";
import {
  agregarContactoCaptacion,
  compararPropiedadNueva,
  crearCaptacionVerificada,
  verificarTelefono,
  type RegistroTelefono,
  type ResultadoCaptacion,
} from "./verificar-actions";

const campo =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-900 dark:text-white";
const boton = "rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";

type Propiedad = { tipo: string; zona: string; direccion: string };

/**
 * Nueva captación en pasos, con solo lo necesario en cada uno:
 * 1. Nombre y celular → Verificar (contra los contactos de todo el equipo).
 * 2a. Libre → "Agregar contacto".
 * 2b. Lo tiene otro agente → datos básicos de la propiedad para comparar:
 *     si es la misma se bloquea; si es otra, sigue.
 * 3. Captación: título, link, venta/alquiler y notas → queda en "Llamando".
 */
export function VerificarCaptacion() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [registros, setRegistros] = useState<RegistroTelefono[] | null>(null);
  const [paso3, setPaso3] = useState<{ propiedad: Propiedad | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ajenos = registros?.filter((r) => !r.propio) ?? [];
  const propio = registros?.find((r) => r.propio);
  const verificado = registros !== null;

  function verificar() {
    setError(null);
    setListo(null);
    startTransition(async () => {
      const r = await verificarTelefono(telefono);
      if (r.error) return setError(r.error);
      setRegistros(r.registros ?? []);
      const suyo = r.registros?.find((x) => x.propio);
      if (suyo && nombre.trim().length < 2) setNombre(suyo.contacto);
    });
  }

  function agregarContacto() {
    setError(null);
    startTransition(async () => {
      const r = await agregarContactoCaptacion(nombre, telefono);
      if (r.error) return setError(r.error);
      setPaso3({ propiedad: null });
    });
  }

  function empezarDeNuevo(mensaje?: string) {
    setNombre("");
    setTelefono("");
    setRegistros(null);
    setPaso3(null);
    setError(null);
    setListo(mensaje ?? null);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-orion-navy dark:text-white">Nueva captación</h2>
        {verificado && (
          <button type="button" onClick={() => empezarDeNuevo()} className="text-xs text-gray-500 hover:underline">
            Empezar de nuevo
          </button>
        )}
      </div>

      {/* Paso 1: nombre y celular */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          disabled={!!paso3}
          className={campo}
          aria-label="Nombre"
        />
        <input
          type="tel"
          inputMode="tel"
          value={telefono}
          onChange={(e) => {
            setTelefono(e.target.value);
            setRegistros(null);
            setPaso3(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              verificar();
            }
          }}
          placeholder="Celular"
          disabled={!!paso3}
          className={campo}
          aria-label="Celular"
        />
        {!verificado && (
          <button
            type="button"
            onClick={verificar}
            disabled={pending || telefono.replace(/\D/g, "").length < 6}
            className={boton}
          >
            {pending ? "Verificando…" : "Verificar"}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {listo && <p className="mt-2 text-sm font-semibold text-green-700 dark:text-green-400">{listo}</p>}

      {/* Paso 2 */}
      {verificado && !paso3 && (
        <div className="mt-3">
          {registros.length === 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-green-50 px-3 py-2 dark:bg-green-900/20">
              <p className="flex-1 text-sm text-green-800 dark:text-green-200">✓ El número está libre: nadie del equipo lo tiene.</p>
              <button type="button" onClick={agregarContacto} disabled={pending || nombre.trim().length < 2} className={boton}>
                {pending ? "Guardando…" : "Agregar contacto"}
              </button>
            </div>
          )}
          {registros.length > 0 && (
            <div className="flex flex-col gap-2">
              {propio && <Registro r={propio} />}
              {ajenos.map((r, i) => (
                <Registro key={i} r={r} />
              ))}
              {ajenos.length > 0 ? (
                <CompararPropiedad telefono={telefono} onOtra={(propiedad) => setPaso3({ propiedad })} />
              ) : (
                <div>
                  <button type="button" onClick={() => setPaso3({ propiedad: null })} className={boton}>
                    Continuar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Paso 3: la captación */}
      {paso3 && (
        <FormularioCaptacion
          nombre={nombre}
          telefono={telefono}
          propiedad={paso3.propiedad}
          onListo={() => empezarDeNuevo("✓ Listo: quedó en 📞 Llamando para la llamada en frío o el mensaje.")}
        />
      )}
    </div>
  );
}

function Registro({ r }: { r: RegistroTelefono }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${
        r.propio
          ? "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-100"
          : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100"
      }`}
    >
      <p className="font-semibold">
        {r.propio ? `Ya es tu contacto: ${r.contacto}` : `⚠️ Lo tiene ingresado ${r.agente}`}
        <span className="font-normal"> {r.propio ? `(desde el ${r.desde})` : `como “${r.contacto}”, desde el ${r.desde}`}</span>
      </p>
      {r.trabajos.length > 0 && (
        <ul className="mt-1 list-disc pl-5 text-xs">
          {r.trabajos.map((t, i) => (
            <li key={i}>
              {t.origen}: {t.operacion === "ALQUILER" ? "Alquiler" : "Venta"} · {t.tipo}
              {t.zona ? ` · ${t.zona}` : ""}
              {t.direccion ? ` · ${t.direccion}` : ""} — {t.estado}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Número de otro agente: datos básicos de la propiedad para saber si es la misma. */
function CompararPropiedad({ telefono, onOtra }: { telefono: string; onOtra: (p: Propiedad) => void }) {
  const [tipo, setTipo] = useState<string>("Apartamento");
  const [zona, setZona] = useState("");
  const [direccion, setDireccion] = useState("");
  const [resultado, setResultado] = useState<ResultadoCaptacion | null>(null);
  const [pending, startTransition] = useTransition();

  function comparar() {
    setResultado(null);
    startTransition(async () => {
      const r = await compararPropiedadNueva(telefono, { tipo, zona, direccion });
      if (r.ok) onOtra({ tipo, zona, direccion });
      else setResultado(r);
    });
  }

  const b = resultado?.bloqueo;
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <p className="mb-2 text-xs text-gray-600 dark:text-gray-300">
        ¿Qué propiedad querés captar? Con estos datos Orion se fija si es la misma.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo} aria-label="Tipo de propiedad">
          {TIPOS_PROPIEDAD.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Barrio / zona" className={campo} />
        <input
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          placeholder="Dirección (calle y número)"
          className={campo}
        />
      </div>
      {b && (
        <div className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          <p className="font-semibold">🚫 No podés seguir: {b.agente} ya trabaja esta propiedad.</p>
          <p className="text-xs">{b.detalle}</p>
          {b.comparacion === "POSIBLE" && (
            <p className="mt-1 text-xs">
              Falta la dirección para saber si es la misma. Si es otra propiedad, cargá calle y número y volvé a
              comparar, o pedile a {b.agente} que complete la suya.
            </p>
          )}
        </div>
      )}
      {resultado?.error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{resultado.error}</p>}
      <button type="button" onClick={comparar} disabled={pending || !zona.trim()} className={`${boton} mt-2`}>
        {pending ? "Comparando…" : "Comparar"}
      </button>
    </div>
  );
}

function FormularioCaptacion({
  nombre,
  telefono,
  propiedad,
  onListo,
}: {
  nombre: string;
  telefono: string;
  propiedad: Propiedad | null;
  onListo: () => void;
}) {
  const [titulo, setTitulo] = useState(propiedad ? `${propiedad.tipo} en ${propiedad.zona}` : "");
  const [link, setLink] = useState("");
  const [operacion, setOperacion] = useState("VENTA");
  const [notas, setNotas] = useState("");
  const [resultado, setResultado] = useState<ResultadoCaptacion | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar() {
    setResultado(null);
    startTransition(async () => {
      const r = await crearCaptacionVerificada({
        telefono,
        nombre,
        titulo,
        link,
        operacion,
        notas,
        ...(propiedad ?? {}),
      });
      if (r.ok) onListo();
      else setResultado(r);
    });
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      {propiedad && (
        <p className="mb-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800 dark:bg-green-900/20 dark:text-green-200">
          ✓ Es otra propiedad: podés seguir.
        </p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título (ej. Apto 2 dorm. en Pocitos)"
          className={`${campo} sm:col-span-2`}
          aria-label="Título"
        />
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link de la publicación (opcional)"
          type="url"
          className={campo}
          aria-label="Link"
        />
        <select value={operacion} onChange={(e) => setOperacion(e.target.value)} className={campo} aria-label="Venta o alquiler">
          <option value="VENTA">Venta</option>
          <option value="ALQUILER">Alquiler</option>
        </select>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Notas (opcional)"
          rows={2}
          className={`${campo} sm:col-span-2`}
          aria-label="Notas"
        />
      </div>
      {resultado?.bloqueo && (
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          🚫 No podés seguir: {resultado.bloqueo.agente} ya trabaja esta propiedad ({resultado.bloqueo.detalle}).
        </p>
      )}
      {resultado?.error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{resultado.error}</p>}
      <button type="button" onClick={guardar} disabled={pending || titulo.trim().length < 3} className={`${boton} mt-2`}>
        {pending ? "Guardando…" : "Guardar y pasar a 📞 Llamando"}
      </button>
    </div>
  );
}
