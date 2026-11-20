// Cómo se divide la comisión de una reserva entre agentes (pedido de
// Rosario, nov. 2026). Después, cada parte se reparte con las reglas de
// src/lib/comisiones.ts (agente, su líder, Administración, Dirección y el
// 10 % de la empresa).
//
// - ENTERA: la cerró un solo agente → toda la comisión es de él.
// - COMPARTIDA: un agente aportó la propiedad y otro el cliente.
//     · Si pagan las dos puntas: cada agente se lleva la punta que aportó
//       (la del vendedor/propietario el de la propiedad; la del comprador/
//       inquilino el del cliente).
//     · Si paga una sola punta: se divide en 2 mitades.
// Las reservas viejas (sin estos datos) cuentan como ENTERA del agente que
// la cargó.

export type TipoComision = "ENTERA" | "COMPARTIDA";
/** Quién paga comisión: las dos puntas, solo el cliente (comprador o inquilino) o solo el propietario. */
export type QuienPaga = "AMBAS" | "CLIENTE" | "PROPIETARIO";

export const QUIEN_PAGA_LABEL: Record<"VENTA" | "ALQUILER", Record<QuienPaga, string>> = {
  VENTA: { AMBAS: "Vendedor y comprador", CLIENTE: "Solo el comprador", PROPIETARIO: "Solo el vendedor" },
  ALQUILER: { AMBAS: "Propietario e inquilino", CLIENTE: "Solo el inquilino", PROPIETARIO: "Solo el propietario" },
};

export const PUNTA_LABEL: Record<"VENTA" | "ALQUILER", { propiedad: string; cliente: string }> = {
  VENTA: { propiedad: "punta vendedora", cliente: "punta compradora" },
  ALQUILER: { propiedad: "punta propietaria", cliente: "punta inquilina" },
};

export const esTipoComision = (v: unknown): v is TipoComision => v === "ENTERA" || v === "COMPARTIDA";
export const esQuienPaga = (v: unknown): v is QuienPaga => v === "AMBAS" || v === "CLIENTE" || v === "PROPIETARIO";

export type ParteComision = { agenteId: string; monto: number; detalle: string | null };

/** Divide la comisión de la reserva en partes, una por agente. */
export function partesDeComision(r: {
  operacion: "VENTA" | "ALQUILER";
  tipoComision: TipoComision;
  quienPaga: QuienPaga;
  /** Agente que cerró (ENTERA) o que aportó la propiedad (COMPARTIDA). */
  agentePropiedadId: string;
  /** Agente que aportó el cliente (solo COMPARTIDA). */
  agenteClienteId: string | null;
  /** Lo que paga el vendedor/propietario y lo que paga el comprador/inquilino. */
  comisionPropiedad: number;
  comisionCliente: number;
}): ParteComision[] {
  const pagaPropiedad = r.quienPaga === "CLIENTE" ? 0 : Math.max(0, Math.round(r.comisionPropiedad));
  const pagaCliente = r.quienPaga === "PROPIETARIO" ? 0 : Math.max(0, Math.round(r.comisionCliente));
  const total = pagaPropiedad + pagaCliente;
  if (total <= 0) return [];

  const compartida =
    r.tipoComision === "COMPARTIDA" && !!r.agenteClienteId && r.agenteClienteId !== r.agentePropiedadId;
  if (!compartida) return [{ agenteId: r.agentePropiedadId, monto: total, detalle: null }];

  const puntas = PUNTA_LABEL[r.operacion];
  if (r.quienPaga === "AMBAS") {
    return [
      { agenteId: r.agentePropiedadId, monto: pagaPropiedad, detalle: `compartida · ${puntas.propiedad}` },
      { agenteId: r.agenteClienteId!, monto: pagaCliente, detalle: `compartida · ${puntas.cliente}` },
    ].filter((p) => p.monto > 0);
  }
  const mitad = Math.round(total / 2);
  return [
    { agenteId: r.agentePropiedadId, monto: mitad, detalle: "compartida · mitad (aportó la propiedad)" },
    { agenteId: r.agenteClienteId!, monto: total - mitad, detalle: "compartida · mitad (aportó el cliente)" },
  ];
}

/** Para mostrar el equipo de un usuario: su líder, o de quién es el equipo directo. */
export type UsuarioEquipo = { id: string; nombre: string; rol: string; teamLeaderId: string | null };

export function liderDe(id: string | null, usuarios: UsuarioEquipo[]): string {
  if (!id) return "";
  const u = usuarios.find((x) => x.id === id);
  if (!u) return "";
  if (u.rol === "TEAM_LEADER") return "Es líder";
  if (u.rol === "ADMINISTRADOR" || u.rol === "CEO") return "Dirección";
  let actual = u.teamLeaderId;
  for (let i = 0; actual && i < usuarios.length; i++) {
    const j = usuarios.find((x) => x.id === actual);
    if (!j) break;
    if (j.rol === "TEAM_LEADER") return `Líder: ${j.nombre}`;
    if (j.rol === "ADMINISTRADOR" || j.rol === "CEO") return `Equipo de ${j.nombre}`;
    actual = j.teamLeaderId;
  }
  return "Sin líder";
}
