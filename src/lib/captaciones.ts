export const ESTADOS_CAPTACION = ["LLAMANDO", "TASANDO", "PARA_PUBLICAR"] as const;

export type EstadoCaptacion = (typeof ESTADOS_CAPTACION)[number];

export const ESTADO_CAPTACION_LABEL: Record<EstadoCaptacion, string> = {
  LLAMANDO: "Llamando",
  TASANDO: "Tasando",
  PARA_PUBLICAR: "Para publicar",
};

export const ESTADO_CAPTACION_ICONO: Record<EstadoCaptacion, string> = {
  LLAMANDO: "📞",
  TASANDO: "📐",
  PARA_PUBLICAR: "🚩",
};
