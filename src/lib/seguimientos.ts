// Seguimiento semanal y regla de contacto frío (decidida por Rosario):
//
//   1. Se hace seguimiento 1 vez por semana y se registra cada intento.
//   2. Seguimientos 1 y 2 sin respuesta → Orion recuerda el siguiente.
//   3. El 3º es el AVISO FINAL: "si no responde, se da de baja la publicación"
//      (o se pausa la búsqueda, si es comprador/inquilino).
//   4. Si pasa una semana del aviso sin respuesta → el contacto queda FRÍO y
//      Orion propone suspender sus propiedades / pausar sus búsquedas. El
//      agente confirma (nada se suspende solo).
//   Cualquier respuesta vuelve el contador a cero y saca el "frío".

export const DIAS_ENTRE_SEGUIMIENTOS = 7;
export const SIN_RESPUESTA_PARA_AVISO = 2; // después de 2 sin respuesta, el 3º es el aviso
export const SIN_RESPUESTA_TOPE = 3;

export const CANALES = ["WHATSAPP", "LLAMADA", "EMAIL", "VISITA", "OTRO"] as const;
export type Canal = (typeof CANALES)[number];
export const CANAL_LABEL: Record<Canal, string> = {
  WHATSAPP: "WhatsApp",
  LLAMADA: "Llamada",
  EMAIL: "Email",
  VISITA: "En persona",
  OTRO: "Otro",
};
export const CANAL_ICONO: Record<Canal, string> = {
  WHATSAPP: "💬",
  LLAMADA: "📞",
  EMAIL: "✉️",
  VISITA: "🤝",
  OTRO: "📌",
};
export function esCanal(v: unknown): v is Canal {
  return typeof v === "string" && (CANALES as readonly string[]).includes(v);
}

export type SeguimientoMin = {
  fecha: Date;
  respondio: boolean;
  avisoFinal: boolean;
  proximaFecha: Date | null;
};

export type EstadoSeguimiento =
  | { tipo: "SIN_SEGUIMIENTOS"; sinRespuesta: 0; proxima: null; vencido: false }
  | { tipo: "AL_DIA"; sinRespuesta: 0; proxima: Date | null; vencido: boolean }
  | { tipo: "SIN_RESPUESTA"; sinRespuesta: number; proxima: Date | null; vencido: boolean; siguienteEsAviso: boolean }
  | { tipo: "AVISO_ENVIADO"; sinRespuesta: number; proxima: Date; vencido: boolean; avisoEl: Date }
  | { tipo: "NO_RESPONDIO_AVISO"; sinRespuesta: number; proxima: null; vencido: true; avisoEl: Date }
  | { tipo: "FRIO"; sinRespuesta: number; proxima: null; vencido: false; desde: Date };

const DIA = 24 * 3600 * 1000;

/** `lista` en cualquier orden; `ahora` en hora de Uruguay (ver ahoraUY). */
export function estadoSeguimiento(
  lista: SeguimientoMin[],
  frioDesde: Date | null,
  ahora: Date
): EstadoSeguimiento {
  const orden = [...lista].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  let sinRespuesta = 0;
  for (const s of orden) {
    if (s.respondio) break;
    sinRespuesta++;
  }
  if (frioDesde) return { tipo: "FRIO", sinRespuesta, proxima: null, vencido: false, desde: frioDesde };
  if (orden.length === 0) return { tipo: "SIN_SEGUIMIENTOS", sinRespuesta: 0, proxima: null, vencido: false };

  const ultimo = orden[0];
  const proxima = ultimo.proximaFecha;
  const vencido = !!proxima && proxima.getTime() < ahora.getTime();

  if (sinRespuesta === 0) return { tipo: "AL_DIA", sinRespuesta: 0, proxima, vencido };

  const aviso = orden.slice(0, sinRespuesta).find((s) => s.avisoFinal);
  if (aviso || sinRespuesta >= SIN_RESPUESTA_TOPE) {
    const avisoEl = (aviso ?? ultimo).fecha;
    const limite = new Date(avisoEl.getTime() + DIAS_ENTRE_SEGUIMIENTOS * DIA);
    if (limite.getTime() <= ahora.getTime()) {
      return { tipo: "NO_RESPONDIO_AVISO", sinRespuesta, proxima: null, vencido: true, avisoEl };
    }
    return { tipo: "AVISO_ENVIADO", sinRespuesta, proxima: limite, vencido: false, avisoEl };
  }
  return {
    tipo: "SIN_RESPUESTA",
    sinRespuesta,
    proxima,
    vencido,
    siguienteEsAviso: sinRespuesta >= SIN_RESPUESTA_PARA_AVISO,
  };
}

/** Etiqueta corta para listas. */
export function etiquetaEstado(e: EstadoSeguimiento): { texto: string; clase: string } | null {
  const rojo = "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  const ambar = "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  const azul = "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300";
  switch (e.tipo) {
    case "FRIO":
      return { texto: "❄️ Frío", clase: azul };
    case "NO_RESPONDIO_AVISO":
      return { texto: "⛔ No respondió al aviso", clase: rojo };
    case "AVISO_ENVIADO":
      return { texto: "⚠️ Aviso final enviado", clase: ambar };
    case "SIN_RESPUESTA":
      return {
        texto: `${e.vencido ? "⏰ " : ""}${e.sinRespuesta} de ${SIN_RESPUESTA_TOPE} sin respuesta`,
        clase: e.vencido ? rojo : ambar,
      };
    case "AL_DIA":
      return e.vencido ? { texto: "⏰ Seguimiento vencido", clase: rojo } : null;
    default:
      return null;
  }
}

/** Número para wa.me (Uruguay): "099 123 456" → "59899123456". */
export function numeroWhatsApp(tel: string | null | undefined): string | null {
  if (!tel) return null;
  let d = tel.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("598")) return d;
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 8 || d.length === 7) return `598${d}`;
  return d.length >= 8 ? d : null;
}

export function textoAvisoFinal(opts: {
  nombre: string;
  agente: string;
  propiedades: string[];
  esComprador: boolean;
}): string {
  const saludo = `Hola ${opts.nombre.split(" ")[0]}, ¿cómo estás?`;
  if (opts.propiedades.length > 0) {
    const cual =
      opts.propiedades.length === 1 ? `la propiedad ${opts.propiedades[0]}` : `tus propiedades (${opts.propiedades.join(", ")})`;
    return `${saludo} Te escribo por ${cual}. Como no tuvimos respuesta en las últimas semanas, si no sabemos de vos en los próximos 7 días vamos a dar de baja la publicación. Quedo a las órdenes. ${opts.agente}`;
  }
  if (opts.esComprador) {
    return `${saludo} Te escribo por la búsqueda que tenemos para vos. Como no tuvimos respuesta en las últimas semanas, si no sabemos de vos en los próximos 7 días vamos a pausarla. Si seguís buscando, avisame y seguimos. ${opts.agente}`;
  }
  return `${saludo} Como no tuvimos respuesta en las últimas semanas, si no sabemos de vos en los próximos 7 días voy a dar por cerrado el seguimiento. Quedo a las órdenes. ${opts.agente}`;
}
