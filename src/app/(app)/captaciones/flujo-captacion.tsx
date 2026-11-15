"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { completarMensaje, type Plantilla } from "@/lib/plantillas-whatsapp";
import { numeroWhatsApp } from "@/lib/seguimientos";
import {
  CICLOS,
  ETAPAS_CONTACTO,
  MOTIVOS_S12,
  USO_TASACION,
  type Etapa,
  type MotivoS12,
  type UsoTasacion,
} from "@/lib/captacion-flujo";
import {
  marcarSeguimientoCiclo,
  pasarAS12,
  registrarIntento,
  resultadoContacto,
  resultadoTasacion,
} from "./flujo-actions";
import { convertirEnPropiedad, eliminarCaptacion } from "./actions";

// Botonera de cada captación según su etapa: contactar (llamar / WhatsApp),
// marcar qué pasó, seguimientos S8/S12, tasación y publicar.

export type DatosFlujo = {
  id: string;
  etapa: Etapa;
  operacion: string;
  titulo: string;
  contactoNombre: string;
  telefono: string | null;
  contactado: boolean;
  cicloTerminado: boolean;
  hechos: number;
  tasacionId: string | null;
  convertida: boolean;
};

const btn =
  "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const btnGris = `${btn} border-gray-300 text-gray-700 hover:border-orion-navy hover:text-orion-navy dark:border-gray-600 dark:text-gray-200`;
const btnVerde = `${btn} border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300`;
const btnAmbar = `${btn} border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300`;

export function FlujoCaptacion({
  d,
  plantillas,
  agente,
  inmobiliaria,
}: {
  d: DatosFlujo;
  plantillas: Plantilla[];
  agente: string;
  inmobiliaria: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [menuWa, setMenuWa] = useState(false);
  const [eligiendoS12, setEligiendoS12] = useState(false);
  const [motivo, setMotivo] = useState<MotivoS12>("PROBAR_SOLOS");
  const [uso, setUso] = useState<UsoTasacion | null>(null);

  const wa = numeroWhatsApp(d.telefono);
  const enContacto = ETAPAS_CONTACTO.includes(d.etapa);
  const enCiclo = d.etapa === "S8" || d.etapa === "S12";
  const puedeContactar = enContacto || (enCiclo && !d.cicloTerminado);

  function correr(accion: () => Promise<{ ok?: boolean; borrada?: boolean; error?: string } | void>, confirmar?: string) {
    if (confirmar && !window.confirm(confirmar)) return;
    setError(null);
    start(async () => {
      try {
        const r = await accion();
        if (r && r.error) setError(r.error);
        else if (r && r.borrada) setAviso("Se borró y quedó en la Papelera (30 días).");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  }

  function llamar() {
    correr(() => registrarIntento(d.id, "LLAMADA"));
  }

  function whatsapp(texto: string) {
    setMenuWa(false);
    const mensaje = completarMensaje(texto, { nombre: d.contactoNombre, agente, inmobiliaria, propiedad: d.titulo });
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener,noreferrer");
    correr(() => registrarIntento(d.id, "WHATSAPP"));
  }

  if (aviso) return <p className="text-xs font-semibold text-gray-500">{aviso}</p>;

  const siguienteNoResp =
    d.etapa === "LLAMANDO" ? "→ 1er seguimiento" : d.etapa === "SEGUIMIENTO_1" ? "→ 2do seguimiento" : "→ se borra";
  const destinoAutorizo = d.operacion === "ALQUILER" ? "Para publicar" : "Tasando";

  return (
    <div className="flex flex-col gap-2">
      {/* 1. Contactar */}
      {puedeContactar && (
        <div className="flex flex-wrap items-center gap-1.5">
          {d.telefono ? (
            <>
              <a href={`tel:${d.telefono}`} onClick={llamar} className={btnGris}>
                📞 Llamar
              </a>
              {wa && (
                <div className="relative">
                  <button type="button" onClick={() => setMenuWa((v) => !v)} className={btnVerde}>
                    💬 WhatsApp ▾
                  </button>
                  {menuWa && (
                    <div className="absolute left-0 z-20 mt-1 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                      {plantillas.length === 0 && (
                        <p className="px-3 py-2 text-xs text-gray-400">
                          No hay mensajes de captación. La CEO los carga en Mensajes WhatsApp (título “Captación…”).
                        </p>
                      )}
                      {plantillas.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => whatsapp(p.texto)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <span>{p.emoji ?? "💬"}</span>
                          <span>{p.titulo}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => whatsapp("")}
                        className="w-full border-t border-gray-100 px-3 py-2 text-left text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                      >
                        Escribir sin mensaje armado
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <span className="text-xs text-red-600">Sin teléfono cargado</span>
          )}
          {d.contactado && <span className="text-[11px] font-semibold text-emerald-600">✓ contactado</span>}
        </div>
      )}

      {/* 2. Primer contacto: qué pasó */}
      {enContacto && (
        <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-900/40">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {d.contactado ? "¿Qué pasó?" : "Llamalo o escribile y después marcá qué pasó"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={!d.contactado || pending}
              onClick={() =>
                correr(
                  () => resultadoContacto(d.id, "NO_RESPONDIO"),
                  d.etapa === "SEGUIMIENTO_2"
                    ? "Sin respuesta después de 2 seguimientos: la captación se borra (queda 30 días en la Papelera). ¿Confirmás?"
                    : undefined
                )
              }
              className={btnGris}
            >
              🙊 No respondió {siguienteNoResp}
            </button>
            <button
              type="button"
              disabled={!d.contactado || pending}
              onClick={() => correr(() => resultadoContacto(d.id, "POR_AHORA_NO"))}
              className={btnAmbar}
            >
              ⏸ Por ahora no → S8
            </button>
            <button
              type="button"
              disabled={!d.contactado || pending}
              onClick={() => setEligiendoS12((v) => !v)}
              className={btnAmbar}
            >
              📆 Prueba solo / exclusividad → S12
            </button>
            <button
              type="button"
              disabled={!d.contactado || pending}
              onClick={() => correr(() => resultadoContacto(d.id, "AUTORIZO"))}
              className={btnVerde}
            >
              ✅ Nos autorizó → {destinoAutorizo}
            </button>
          </div>
        </div>
      )}

      {/* 3. S8 / S12 */}
      {enCiclo && (
        <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-900/40">
          {d.cicloTerminado ? (
            <p className="mb-1.5 text-xs text-gray-600 dark:text-gray-300">
              Terminó el S8 sin autorización: pasalo a S12 o se borra.
            </p>
          ) : (
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Seguimiento {d.hechos + 1} de {CICLOS[d.etapa as "S8" | "S12"].total}
              {d.contactado ? " · ¿qué pasó?" : " · llamalo o escribile y marcalo"}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {!d.cicloTerminado && (
              <>
                <button
                  type="button"
                  disabled={!d.contactado || pending}
                  onClick={() =>
                    correr(
                      () => marcarSeguimientoCiclo(d.id, true),
                      d.etapa === "S12" && d.hechos + 1 >= CICLOS.S12.total
                        ? "Es el último seguimiento del S12: si sigue sin autorizar, la captación se borra (Papelera). ¿Confirmás?"
                        : undefined
                    )
                  }
                  className={btnGris}
                >
                  ✔ Hecho: sigue sin autorizar
                </button>
                <button
                  type="button"
                  disabled={!d.contactado || pending}
                  onClick={() =>
                    correr(
                      () => marcarSeguimientoCiclo(d.id, false),
                      d.etapa === "S12" && d.hechos + 1 >= CICLOS.S12.total
                        ? "Es el último seguimiento del S12: la captación se borra (Papelera). ¿Confirmás?"
                        : undefined
                    )
                  }
                  className={btnGris}
                >
                  ✔ Hecho: no respondió
                </button>
              </>
            )}
            {d.etapa === "S8" && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  d.cicloTerminado ? correr(() => pasarAS12(d.id)) : setEligiendoS12((v) => !v)
                }
                className={btnAmbar}
              >
                📆 Pasar a S12
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => correr(() => resultadoContacto(d.id, "AUTORIZO"))}
              className={btnVerde}
            >
              ✅ Nos autorizó → {destinoAutorizo}
            </button>
          </div>
        </div>
      )}

      {/* Motivo para pasar a S12 */}
      {eligiendoS12 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-amber-200 p-2 dark:border-amber-900">
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as MotivoS12)}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            {(["PROBAR_SOLOS", "EXCLUSIVIDAD_OTRA", "OTRO"] as MotivoS12[]).map((m) => (
              <option key={m} value={m}>
                {MOTIVOS_S12[m]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setEligiendoS12(false);
              correr(() => resultadoContacto(d.id, "S12", motivo));
            }}
            className={btnAmbar}
          >
            Pasar a S12
          </button>
        </div>
      )}

      {/* 4. Tasando (venta) */}
      {d.etapa === "TASANDO" &&
        (!d.tasacionId ? (
          <Link href={`/tasaciones/nueva?captacion=${d.id}`} className={`${btnAmbar} self-start`}>
            📐 Hacer tasación
          </Link>
        ) : (
          <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-900/40">
            <Link
              href={`/tasaciones/${d.tasacionId}`}
              className="mb-1.5 block text-xs font-semibold text-orion-navy hover:underline dark:text-orion-gold"
            >
              📐 Ver tasación
            </Link>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">La tasación se…</p>
            <div className="mb-2 flex flex-wrap gap-3">
              {(Object.keys(USO_TASACION) as UsoTasacion[]).map((u) => (
                <label key={u} className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-200">
                  <input type="radio" name={`uso-${d.id}`} checked={uso === u} onChange={() => setUso(u)} />
                  {USO_TASACION[u]}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={!uso || pending}
                onClick={() => uso && correr(() => resultadoTasacion(d.id, uso, true))}
                className={btnVerde}
              >
                ✅ Autorizó → Para publicar
              </button>
              <button
                type="button"
                disabled={!uso || pending}
                onClick={() => uso && correr(() => resultadoTasacion(d.id, uso, false))}
                className={btnAmbar}
              >
                ❌ No aceptó → S12
              </button>
            </div>
          </div>
        ))}

      {/* 5. Para publicar */}
      {d.etapa === "PARA_PUBLICAR" &&
        (d.convertida ? (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✅ Ya está en Propiedades</span>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              correr(async () => {
                await convertirEnPropiedad(d.id);
              })
            }
            className="self-start rounded-lg bg-orion-gold px-3 py-1.5 text-xs font-semibold text-orion-navy transition hover:brightness-95 disabled:opacity-60"
          >
            🏠 Publicar propiedad
          </button>
        ))}

      <div className="flex items-center justify-between">
        {error ? <p className="text-xs text-red-600">{error}</p> : <span />}
        {!d.convertida && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              correr(async () => {
                await eliminarCaptacion(d.id);
                return { borrada: true };
              }, "¿Eliminar esta captación? Queda 30 días en la Papelera.")
            }
            className="text-[11px] text-gray-400 hover:text-red-600"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
