"use client";

import { useState } from "react";
import {
  PUNTA_LABEL,
  QUIEN_PAGA_LABEL,
  liderDe,
  type OrionAporta,
  type QuienPaga,
  type TipoComision,
  type UsuarioEquipo,
} from "@/lib/reparto-reserva";

// Comisión de una reserva: entera (un agente) o compartida (el de la
// propiedad y el del cliente), y quién paga. Muestra el líder de cada
// agente, que es lo que define cómo se reparte. Ver src/lib/reparto-reserva.ts.

export type RepartoInicial = {
  tipoComision: TipoComision;
  quienPaga: QuienPaga;
  agentePropiedadId: string | null;
  agenteClienteId: string | null;
  otraInmobiliaria?: string | null;
  orionAporta?: OrionAporta | null;
};

const inputClass =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orion-navy dark:border-gray-700 dark:bg-gray-900 dark:text-white";

function ElegirAgente({
  name,
  etiqueta,
  valor,
  onChange,
  usuarios,
  fijo,
}: {
  name: string;
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  usuarios: UsuarioEquipo[];
  fijo?: boolean;
}) {
  const yo = usuarios.find((u) => u.id === valor);
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
      {etiqueta}
      {fijo ? (
        <>
          <input type="hidden" name={name} value={valor} />
          <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
            {yo?.nombre ?? "—"}
          </span>
        </>
      ) : (
        <select name={name} value={valor} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          <option value="">Elegí…</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </select>
      )}
      {valor && <span className="text-[11px] font-semibold text-orion-gold">👥 {liderDe(valor, usuarios)}</span>}
    </label>
  );
}

export function CamposReparto({
  operacion,
  usuarios,
  yoId,
  esCeo,
  inicial,
  onQuienPaga,
}: {
  operacion: "VENTA" | "ALQUILER";
  usuarios: UsuarioEquipo[];
  yoId: string;
  esCeo: boolean;
  inicial?: RepartoInicial;
  onQuienPaga?: (v: QuienPaga) => void;
}) {
  const [tipo, setTipo] = useState<TipoComision>(inicial?.tipoComision ?? "ENTERA");
  const [paga, setPaga] = useState<QuienPaga>(inicial?.quienPaga ?? "AMBAS");
  const [propiedad, setPropiedad] = useState(inicial?.agentePropiedadId ?? yoId);
  const [cliente, setCliente] = useState(inicial?.agenteClienteId ?? "");
  const [otra, setOtra] = useState(inicial?.otraInmobiliaria ?? "");
  const [aporta, setAporta] = useState<OrionAporta>(inicial?.orionAporta ?? "PROPIEDAD");
  const puntas = PUNTA_LABEL[operacion];
  const radio = (activo: boolean) =>
    `flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-xs font-semibold ${
      activo
        ? "border-orion-navy bg-orion-navy text-white"
        : "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300"
    }`;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-orion-gold/40 bg-orion-gold/5 p-3 sm:col-span-2">
      <p className="text-sm font-semibold text-orion-navy dark:text-white">💰 Comisión</p>
      <input type="hidden" name="tipoComision" value={tipo} />
      <input type="hidden" name="quienPaga" value={paga} />
      {tipo === "OTRA_INMOBILIARIA" && <input type="hidden" name="orionAporta" value={aporta} />}

      <div className="flex gap-2">
        <button type="button" onClick={() => setTipo("ENTERA")} className={radio(tipo === "ENTERA")}>
          Entera
          <span className="block text-[10px] font-normal opacity-80">la cerró un agente</span>
        </button>
        <button type="button" onClick={() => setTipo("COMPARTIDA")} className={radio(tipo === "COMPARTIDA")}>
          Compartida
          <span className="block text-[10px] font-normal opacity-80">entre dos agentes de Orion</span>
        </button>
        <button type="button" onClick={() => setTipo("OTRA_INMOBILIARIA")} className={radio(tipo === "OTRA_INMOBILIARIA")}>
          Con otra inmobiliaria
          <span className="block text-[10px] font-normal opacity-80">la otra punta es de afuera</span>
        </button>
      </div>

      {tipo === "OTRA_INMOBILIARIA" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            Inmobiliaria con la que se comparte
            <input
              name="otraInmobiliaria"
              value={otra}
              onChange={(e) => setOtra(e.target.value)}
              placeholder="Nombre de la inmobiliaria"
              required
              className={inputClass}
            />
          </label>
          <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            Orion aportó
            <div className="flex gap-2">
              <button type="button" onClick={() => setAporta("PROPIEDAD")} className={radio(aporta === "PROPIEDAD")}>
                La propiedad
              </button>
              <button type="button" onClick={() => setAporta("CLIENTE")} className={radio(aporta === "CLIENTE")}>
                {operacion === "VENTA" ? "El comprador" : "El inquilino"}
              </button>
            </div>
          </div>
          <ElegirAgente
            name="agentePropiedadId"
            etiqueta="Agente de Orion"
            valor={propiedad}
            onChange={setPropiedad}
            usuarios={usuarios}
            fijo={!esCeo}
          />
        </div>
      ) : tipo === "ENTERA" ? (
        <ElegirAgente
          name="agentePropiedadId"
          etiqueta="Agente que cerró"
          valor={propiedad}
          onChange={setPropiedad}
          usuarios={usuarios}
          fijo={!esCeo}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ElegirAgente
            name="agentePropiedadId"
            etiqueta="Agente que aportó la propiedad"
            valor={propiedad}
            onChange={setPropiedad}
            usuarios={usuarios}
          />
          <ElegirAgente
            name="agenteClienteId"
            etiqueta={operacion === "VENTA" ? "Agente que aportó el comprador" : "Agente que aportó el inquilino"}
            valor={cliente}
            onChange={setCliente}
            usuarios={usuarios}
          />
        </div>
      )}

      <div>
        <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">¿Quién paga comisión?</p>
        <div className="flex flex-wrap gap-2">
          {(["AMBAS", "CLIENTE", "PROPIETARIO"] as QuienPaga[]).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setPaga(q);
                onQuienPaga?.(q);
              }}
              className={radio(paga === q)}
            >
              {QUIEN_PAGA_LABEL[operacion][q]}
            </button>
          ))}
        </div>
      </div>

      {tipo === "OTRA_INMOBILIARIA" && (
        <p className="text-[11px] text-gray-600 dark:text-gray-300">
          {paga === "AMBAS"
            ? `Orion se queda con la ${aporta === "PROPIEDAD" ? puntas.propiedad : puntas.cliente} y la otra inmobiliaria con la suya.`
            : "Paga una sola punta: mitad para Orion y mitad para la otra inmobiliaria."}{" "}
          Solo la parte de Orion se reparte (agente, líder, dirección y empresa).
        </p>
      )}
      {tipo === "COMPARTIDA" && (
        <p className="text-[11px] text-gray-600 dark:text-gray-300">
          {paga === "AMBAS"
            ? `Cada agente se lleva la punta que aportó: la ${puntas.propiedad} el de la propiedad y la ${puntas.cliente} el del cliente.`
            : "Paga una sola punta: la comisión se divide en 2 mitades, una para cada agente."}{" "}
          Después cada parte se reparte con el líder de ese agente.
        </p>
      )}
    </div>
  );
}
