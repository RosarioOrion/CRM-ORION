export const ESTADOS_RESERVA_VENTA = [
  "RESERVADA",
  "BOLETO",
  "ESCRITURADA",
  "CANCELADA",
] as const;
export type EstadoReservaVenta = (typeof ESTADOS_RESERVA_VENTA)[number];

export const ESTADO_RESERVA_VENTA_LABEL: Record<EstadoReservaVenta, string> = {
  RESERVADA: "Reservada",
  BOLETO: "Boleto",
  ESCRITURADA: "Escriturada",
  CANCELADA: "Cancelada",
};

// Estados que, al alcanzarlos, generan las comisiones automáticamente
// (igual que en Lumen OS).
export const ESTADOS_VENTA_QUE_GENERAN_COMISION: EstadoReservaVenta[] = [
  "BOLETO",
  "ESCRITURADA",
];

export const ESTADOS_RESERVA_ALQUILER = ["RESERVADA", "FIRMADA", "CANCELADA"] as const;
export type EstadoReservaAlquiler = (typeof ESTADOS_RESERVA_ALQUILER)[number];

export const ESTADO_RESERVA_ALQUILER_LABEL: Record<EstadoReservaAlquiler, string> = {
  RESERVADA: "Reservada",
  FIRMADA: "Firmada",
  CANCELADA: "Cancelada",
};
