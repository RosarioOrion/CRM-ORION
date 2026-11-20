// Cómo se muestra el concepto de una línea de comisión. Decisión de
// Rosario: el reparto completo (% de líder, Administración y Dirección) lo
// ve solo la CEO. Los demás ven la escala de los agentes (40 / 45 / 50 %) y,
// en las otras líneas, solo de qué es la comisión, sin porcentaje.

/** ¿Es una línea de agente de la escala (no una operación propia de la dirección)? */
export const esLineaDeEscala = (concepto: string) =>
  concepto.startsWith("Comisión agente (") && !concepto.includes("operación propia");

export function conceptoVisible(concepto: string, verDetalle: boolean): string {
  if (verDetalle || esLineaDeEscala(concepto)) return concepto;
  if (concepto.startsWith("Comisión agente")) return "Comisión por operación propia";
  if (/^Team leader|^L[ií]der/i.test(concepto)) return "Comisión como team leader";
  if (/^(Administraci[oó]n|Direcci[oó]n|Administrador|CEO)\b/i.test(concepto)) return "Comisión de dirección";
  // Cualquier otro (cargado a mano): sin el porcentaje.
  return concepto.replace(/\s*\([^)]*%\)/g, "").trim() || "Comisión";
}
