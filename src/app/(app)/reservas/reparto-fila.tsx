"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CamposReparto, type RepartoInicial } from "./campos-reparto";
import {
  PUNTA_LABEL,
  QUIEN_PAGA_LABEL,
  divisionConOtraInmobiliaria,
  liderDe,
  type UsuarioEquipo,
} from "@/lib/reparto-reserva";

// En cada reserva: cómo se divide la comisión (entera o compartida, quién
// paga y el líder de cada agente) y, mientras no se generaron las
// comisiones, el botón para cambiarlo.

export function RepartoFila({
  reservaId,
  operacion,
  reparto,
  agenteId,
  usuarios,
  yoId,
  esCeo,
  puedeCambiar,
  generadas,
  guardar,
  extra,
  montos,
}: {
  reservaId: string;
  operacion: "VENTA" | "ALQUILER";
  reparto: RepartoInicial;
  agenteId: string;
  usuarios: UsuarioEquipo[];
  yoId: string;
  esCeo: boolean;
  puedeCambiar: boolean;
  generadas: boolean;
  guardar: (id: string, fd: FormData) => Promise<{ error?: string }>;
  /** Campos extra dentro del formulario (ej. montos de cada punta). */
  extra?: ReactNode;
  /** Lo que paga cada punta (para mostrar la parte de Orion con otra inmobiliaria). */
  montos?: { propiedad: number; cliente: number };
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const nombre = (id: string | null) => usuarios.find((u) => u.id === id)?.nombre ?? "—";
  const propiedad = reparto.agentePropiedadId ?? agenteId;
  const compartida = reparto.tipoComision === "COMPARTIDA" && reparto.agenteClienteId;
  const puntas = PUNTA_LABEL[operacion];
  const conOtra = reparto.tipoComision === "OTRA_INMOBILIARIA";
  const division =
    conOtra && montos
      ? divisionConOtraInmobiliaria(
          operacion,
          reparto.quienPaga,
          reparto.orionAporta ?? "PROPIEDAD",
          reparto.quienPaga === "CLIENTE" ? 0 : montos.propiedad,
          reparto.quienPaga === "PROPIETARIO" ? 0 : montos.cliente
        )
      : null;
  const usd = (n: number) => `USD ${n.toLocaleString("es-UY")}`;

  return (
    <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {conOtra ? (
          <>
            <span className="font-semibold text-orion-navy dark:text-white">🏢 Con {reparto.otraInmobiliaria ?? "otra inmobiliaria"}</span>
            <span>
              Orion aportó {reparto.orionAporta === "CLIENTE" ? (operacion === "VENTA" ? "el comprador" : "el inquilino") : "la propiedad"}:{" "}
              {nombre(propiedad)} <span className="text-gray-400">({liderDe(propiedad, usuarios)})</span>
            </span>
            {division && (
              <span>
                Orion {usd(division.orion)} · {reparto.otraInmobiliaria ?? "la otra"} {usd(division.otra)}
              </span>
            )}
          </>
        ) : compartida ? (
          <>
            <span className="font-semibold text-orion-navy dark:text-white">🤝 Compartida</span>
            <span>
              🏠 {nombre(propiedad)} <span className="text-gray-400">({liderDe(propiedad, usuarios)})</span>
            </span>
            <span>
              👤 {nombre(reparto.agenteClienteId)}{" "}
              <span className="text-gray-400">({liderDe(reparto.agenteClienteId, usuarios)})</span>
            </span>
          </>
        ) : (
          <>
            <span className="font-semibold text-orion-navy dark:text-white">💰 Entera</span>
            <span>
              {nombre(propiedad)} <span className="text-gray-400">({liderDe(propiedad, usuarios)})</span>
            </span>
          </>
        )}
        <span className="text-gray-400">
          Paga: {QUIEN_PAGA_LABEL[operacion][reparto.quienPaga]}
          {compartida &&
            (reparto.quienPaga === "AMBAS" ? ` · cada uno su punta (${puntas.propiedad} / ${puntas.cliente})` : " · mitad y mitad")}
        </span>
        {generadas && <span className="text-emerald-600">✓ Comisiones generadas</span>}
        {puedeCambiar && !generadas && !abierto && (
          <button type="button" onClick={() => setAbierto(true)} className="ml-auto font-semibold text-orion-navy underline dark:text-orion-gold">
            Cambiar
          </button>
        )}
      </div>
      {abierto && (
        <form
          className="mt-3 flex flex-col gap-2"
          action={(fd) =>
            start(async () => {
              setError(null);
              const r = await guardar(reservaId, fd);
              if (r.error) setError(r.error);
              else {
                setAbierto(false);
                router.refresh();
              }
            })
          }
        >
          <CamposReparto
            operacion={operacion}
            usuarios={usuarios}
            yoId={yoId}
            esCeo={esCeo}
            inicial={{ ...reparto, agentePropiedadId: propiedad }}
          />
          {extra}
          {error && <p className="text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="rounded-lg bg-orion-navy px-3 py-1.5 font-semibold text-white disabled:opacity-60">
              {pending ? "Guardando…" : "Guardar reparto"}
            </button>
            <button type="button" onClick={() => setAbierto(false)} className="text-gray-500 underline">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
