"use client";

import { useState, useTransition } from "react";
import { TIPOS_PROPIEDAD } from "@/lib/propiedades";
import { ORIGENES_CONTACTO, ORIGEN_LABEL } from "@/lib/contactos";
import { compararPropiedades } from "@/lib/captacion-verificar";
import {
  crearCaptacionVerificada,
  verificarTelefono,
  type RegistroTelefono,
  type ResultadoCaptacion,
} from "./verificar-actions";

const campo =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-900 dark:text-white";

/**
 * Paso 1 de una captación: verificar el teléfono del propietario contra los
 * contactos de todo el equipo. Paso 2: cargar la propiedad; si otro agente
 * ya trabaja esa misma propiedad no se puede seguir, si es otra sí, y queda
 * en "Llamando" para la llamada en frío o el mensaje.
 */
export function VerificarCaptacion() {
  const [telefono, setTelefono] = useState("");
  const [verificado, setVerificado] = useState<string | null>(null);
  const [registros, setRegistros] = useState<RegistroTelefono[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function verificar() {
    setError(null);
    setListo(null);
    startTransition(async () => {
      const r = await verificarTelefono(telefono);
      if (r.error) {
        setError(r.error);
        setRegistros(null);
        setVerificado(null);
      } else {
        setRegistros(r.registros ?? []);
        setVerificado(telefono);
      }
    });
  }

  function reiniciar(mensaje?: string) {
    setTelefono("");
    setVerificado(null);
    setRegistros(null);
    setListo(mensaje ?? null);
  }

  const ajenos = registros?.filter((r) => !r.propio) ?? [];
  const propio = registros?.find((r) => r.propio);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="text-sm font-semibold text-orion-navy dark:text-white">📞 Nueva captación: verificá el teléfono</h2>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Orion se fija si alguien del equipo ya tiene a este propietario y qué propiedad está trabajando.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          type="tel"
          inputMode="tel"
          value={telefono}
          onChange={(e) => {
            setTelefono(e.target.value);
            if (verificado) {
              setVerificado(null);
              setRegistros(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              verificar();
            }
          }}
          placeholder="Teléfono del propietario (ej. 099 123 456)"
          className={`${campo} min-w-0 flex-1`}
          aria-label="Teléfono del propietario"
        />
        <button
          type="button"
          onClick={verificar}
          disabled={pending || telefono.replace(/\D/g, "").length < 6}
          className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending && !verificado ? "Verificando…" : "Verificar"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {listo && <p className="mt-2 text-sm font-semibold text-green-700 dark:text-green-400">{listo}</p>}

      {registros && verificado && (
        <div className="mt-4">
          {registros.length === 0 ? (
            <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-200">
              ✓ Nadie del equipo tiene este número. Cargá el propietario y la propiedad.
            </p>
          ) : (
            <div className="mb-3 flex flex-col gap-2">
              {propio && <Registro r={propio} />}
              {ajenos.map((r, i) => (
                <Registro key={i} r={r} />
              ))}
              {ajenos.length > 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Si es <b>la misma propiedad</b>, no podés seguir: la trabaja quien la cargó primero. Si es{" "}
                  <b>otra propiedad</b> del mismo dueño, cargala abajo.
                </p>
              )}
            </div>
          )}
          <FormularioCaptacion
            key={verificado}
            telefono={verificado}
            nombreInicial={propio?.contacto ?? ajenos[0]?.contacto ?? ""}
            ajenos={ajenos}
            onListo={() => reiniciar("✓ Listo: quedó en 📞 Llamando para la llamada en frío o el mensaje.")}
          />
        </div>
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
      {r.trabajos.length === 0 ? (
        <p className="text-xs">Sin propiedades ni captaciones en curso con este propietario.</p>
      ) : (
        <ul className="mt-1 list-disc pl-5 text-xs">
          {r.trabajos.map((t, i) => (
            <li key={i}>
              {t.origen}: {t.operacion === "ALQUILER" ? "Alquiler" : "Venta"} · {t.tipo}
              {t.zona ? ` · ${t.zona}` : ""}
              {t.direccion ? ` · ${t.direccion}` : " · sin dirección"} — {t.estado}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FormularioCaptacion({
  telefono,
  nombreInicial,
  ajenos,
  onListo,
}: {
  telefono: string;
  nombreInicial: string;
  ajenos: RegistroTelefono[];
  onListo: () => void;
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [operacion, setOperacion] = useState("VENTA");
  const [tipo, setTipo] = useState<string>("Apartamento");
  const [zona, setZona] = useState("");
  const [direccion, setDireccion] = useState("");
  const [origen, setOrigen] = useState("REFERIDO");
  const [notas, setNotas] = useState("");
  const [resultado, setResultado] = useState<ResultadoCaptacion | null>(null);
  const [pending, startTransition] = useTransition();

  // Aviso mientras se escribe (el servidor vuelve a verificar al guardar).
  const choque = zona.trim()
    ? ajenos
        .flatMap((r) => r.trabajos.map((t) => ({ r, t, c: compararPropiedades({ tipo, zona, direccion }, t) })))
        .find((x) => x.c !== "DISTINTA")
    : undefined;

  function guardar() {
    setResultado(null);
    startTransition(async () => {
      const r = await crearCaptacionVerificada({ telefono, nombre, operacion, tipo, zona, direccion, origen, notas });
      if (r.ok) onListo();
      else setResultado(r);
    });
  }

  const bloqueo = resultado?.bloqueo;

  return (
    <div className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700 sm:grid-cols-2">
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del propietario *" className={campo} />
      <input value={telefono} readOnly className={`${campo} bg-gray-50 text-gray-500 dark:bg-gray-800`} aria-label="Teléfono" />
      <select value={operacion} onChange={(e) => setOperacion(e.target.value)} className={campo} aria-label="Operación">
        <option value="VENTA">Venta</option>
        <option value="ALQUILER">Alquiler</option>
      </select>
      <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo} aria-label="Tipo de propiedad">
        {TIPOS_PROPIEDAD.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <input value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Barrio / zona *" className={campo} />
      <input
        value={direccion}
        onChange={(e) => setDireccion(e.target.value)}
        placeholder="Dirección (calle y número)"
        className={campo}
      />
      <select value={origen} onChange={(e) => setOrigen(e.target.value)} className={campo} aria-label="Origen">
        {ORIGENES_CONTACTO.map((o) => (
          <option key={o} value={o}>
            {ORIGEN_LABEL[o]}
          </option>
        ))}
      </select>
      <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas (opcional)" className={campo} />

      {choque && !bloqueo && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/20 dark:text-amber-100 sm:col-span-2">
          {choque.c === "MISMA"
            ? `⚠️ Parece la misma propiedad que trabaja ${choque.r.agente}.`
            : `⚠️ Puede ser la misma propiedad que trabaja ${choque.r.agente} (${choque.t.tipo} en ${choque.t.zona ?? "—"}, sin dirección para comparar). Si es otra, cargá la dirección.`}
        </p>
      )}
      {bloqueo && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200 sm:col-span-2">
          <p className="font-semibold">🚫 No podés seguir: {bloqueo.agente} ya trabaja esta propiedad.</p>
          <p className="text-xs">{bloqueo.detalle}</p>
          {bloqueo.comparacion === "POSIBLE" && (
            <p className="mt-1 text-xs">
              Falta la dirección para saber si es la misma. Si es otra propiedad, cargá calle y número y volvé a
              guardar, o pedile a {bloqueo.agente} que complete la suya.
            </p>
          )}
        </div>
      )}
      {resultado?.error && <p className="text-xs text-red-600 dark:text-red-400 sm:col-span-2">{resultado.error}</p>}

      <div className="sm:col-span-2">
        <button
          type="button"
          onClick={guardar}
          disabled={pending || nombre.trim().length < 2 || !zona.trim()}
          className="rounded-lg bg-orion-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar y pasar a 📞 Llamando"}
        </button>
      </div>
    </div>
  );
}
