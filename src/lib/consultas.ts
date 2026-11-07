// Canales por los que llega una consulta ("+ Consulta" en la ficha).
export const CANALES_CONSULTA = [
  "WHATSAPP",
  "MERCADO_LIBRE",
  "INFOCASAS",
  "CASAS_Y_MAS",
  "WEB_ORION",
  "LLAMADA",
  "REDES",
  "CARTEL",
  "OTRO",
] as const;
export type CanalConsulta = (typeof CANALES_CONSULTA)[number];

export const CANAL_CONSULTA_LABEL: Record<CanalConsulta, string> = {
  WHATSAPP: "💬 WhatsApp",
  MERCADO_LIBRE: "🟡 Mercado Libre",
  INFOCASAS: "🏠 InfoCasas",
  CASAS_Y_MAS: "🏘️ Casas y Más",
  WEB_ORION: "🌐 Web de Orion",
  LLAMADA: "📞 Llamada",
  REDES: "📱 Redes sociales",
  CARTEL: "🪧 Cartel",
  OTRO: "📌 Otro",
};
