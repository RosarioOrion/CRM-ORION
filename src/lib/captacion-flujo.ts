// Circuito de captación (definido por Rosario):
//
// 1. Llamando (48 hs): el agente llama (llamada en frío) o escribe por
//    WhatsApp. Si en 48 hs no lo hizo, la captación se borra.
// 2. Sin respuesta → 1er seguimiento (48 hs) → 2do seguimiento (48 hs) →
//    si sigue sin respuesta, se borra.
// 3. Respondió:
//    - "Por ahora no" → S8: seguimiento semanal durante 8 semanas.
//    - Quiere probar solo, dio exclusividad a otra empresa o no aceptó la
//      tasación → S12: seguimiento mensual durante 12 meses.
//    - Nos autoriza → alquiler: Para publicar; venta: Tasando.
// 4. S8 / S12: cada seguimiento hay que hacerlo (llamar o escribir) y
//    marcarlo; hay 48 hs de margen. Si no, se borra. Al terminar S8 se
//    puede pasar a S12; al terminar S12 se borra.
// 5. Tasando (venta): se hace la tasación, se entrega al propietario o se
//    usa internamente, y si autoriza pasa a Para publicar.
//
// "Se borra" = va a la Papelera (30 días para recuperarlo) y el número
// queda libre para otro agente.

import type { EstadoCaptacion } from "@/lib/captaciones";

export const ETAPAS = [
  "LLAMANDO",
  "SEGUIMIENTO_1",
  "SEGUIMIENTO_2",
  "S8",
  "S12",
  "TASANDO",
  "PARA_PUBLICAR",
] as const;
export type Etapa = (typeof ETAPAS)[number];

export const ETAPA_LABEL: Record<Etapa, string> = {
  LLAMANDO: "Llamando",
  SEGUIMIENTO_1: "1er seguimiento",
  SEGUIMIENTO_2: "2do seguimiento",
  S8: "S8 · semanal",
  S12: "S12 · mensual",
  TASANDO: "Tasando",
  PARA_PUBLICAR: "Para publicar",
};

/** Columnas del tablero de Captaciones. */
export const COLUMNAS: { clave: string; label: string; icono: string; etapas: Etapa[] }[] = [
  { clave: "llamando", label: "Llamando", icono: "📞", etapas: ["LLAMANDO", "SEGUIMIENTO_1", "SEGUIMIENTO_2"] },
  { clave: "seguimiento", label: "Seguimiento S8 / S12", icono: "🔁", etapas: ["S8", "S12"] },
  { clave: "tasando", label: "Tasando", icono: "📐", etapas: ["TASANDO"] },
  { clave: "publicar", label: "Para publicar", icono: "🚩", etapas: ["PARA_PUBLICAR"] },
];

/** Etapas de primer contacto (48 hs cada una). */
export const ETAPAS_CONTACTO: Etapa[] = ["LLAMANDO", "SEGUIMIENTO_1", "SEGUIMIENTO_2"];

export const HORAS_PLAZO = 48;
const HORA = 3600 * 1000;
const DIA = 24 * HORA;

export const CICLOS = {
  S8: { cada: 7, total: 8, nombre: "semanal" },
  S12: { cada: 30, total: 12, nombre: "mensual" },
} as const;

export const MOTIVOS_S12 = {
  PROBAR_SOLOS: "Quiere probar un tiempo solo",
  EXCLUSIVIDAD_OTRA: "Dio exclusividad a otra empresa",
  NO_ACEPTO_TASACION: "No aceptó la tasación",
  OTRO: "Otro motivo",
} as const;
export type MotivoS12 = keyof typeof MOTIVOS_S12;

export const USO_TASACION = {
  ENTREGADA: "Entregada al propietario",
  INTERNA: "Uso interno (para posicionarnos)",
} as const;
export type UsoTasacion = keyof typeof USO_TASACION;

/** La columna "estado" de siempre (la usan otras pantallas). */
export function estadoDeEtapa(etapa: Etapa): EstadoCaptacion {
  if (etapa === "TASANDO") return "TASANDO";
  if (etapa === "PARA_PUBLICAR") return "PARA_PUBLICAR";
  return "LLAMANDO";
}

export function esEtapa(e: string): e is Etapa {
  return (ETAPAS as readonly string[]).includes(e);
}

export type DatosPlazo = {
  etapa: string;
  etapaDesde: Date;
  intentoEn: Date | null;
  seguimientosHechos: number;
  ultimoSeguimiento: Date | null;
};

export type Plazo = {
  /** Cuándo se borra si no se hace nada (null: no vence). */
  vence: Date | null;
  /** S8/S12: cuándo toca el próximo seguimiento. */
  proximo: Date | null;
  /** S8/S12: ya hizo todos los seguimientos del ciclo. */
  cicloTerminado: boolean;
  /**
   * Hubo llamada o WhatsApp en este tramo (habilita marcar el resultado).
   * El intento se limpia en cada cambio de etapa y en cada seguimiento.
   */
  contactado: boolean;
};

export function calcularPlazo(c: DatosPlazo): Plazo {
  const etapa = c.etapa as Etapa;
  if (ETAPAS_CONTACTO.includes(etapa)) {
    return {
      vence: new Date(c.etapaDesde.getTime() + HORAS_PLAZO * HORA),
      proximo: null,
      cicloTerminado: false,
      contactado: !!c.intentoEn,
    };
  }
  if (etapa === "S8" || etapa === "S12") {
    const ciclo = CICLOS[etapa];
    const base = c.ultimoSeguimiento ?? c.etapaDesde;
    const terminado = c.seguimientosHechos >= ciclo.total;
    const proximo = new Date(base.getTime() + ciclo.cada * DIA);
    return {
      vence: terminado ? new Date(base.getTime() + HORAS_PLAZO * HORA) : new Date(proximo.getTime() + HORAS_PLAZO * HORA),
      proximo: terminado ? null : proximo,
      cicloTerminado: terminado,
      contactado: !!c.intentoEn,
    };
  }
  return { vence: null, proximo: null, cicloTerminado: false, contactado: false };
}

/** "en 31 h", "en 3 días", "vencido". */
export function faltaTexto(vence: Date, ahora: Date = new Date()): string {
  const ms = vence.getTime() - ahora.getTime();
  if (ms <= 0) return "vencido";
  const horas = Math.floor(ms / HORA);
  if (horas < 1) return `en ${Math.max(1, Math.round(ms / 60000))} min`;
  if (horas < 48) return `en ${horas} h`;
  return `en ${Math.floor(ms / DIA)} días`;
}

export function horasRestantes(vence: Date, ahora: Date = new Date()): number {
  return (vence.getTime() - ahora.getTime()) / HORA;
}

/** Plantillas de WhatsApp de captación: las que se llaman "Captación…". */
export const TITULO_CAPTACION = /^\W*captaci[oó]n/i;
