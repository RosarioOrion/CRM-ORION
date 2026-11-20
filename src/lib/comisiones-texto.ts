// Cómo se muestra el concepto de una línea de comisión. Decisión de
// Rosario: cada uno ve SUS PROPIOS porcentajes (César el suyo de líder,
// Huillen el suyo); los de los demás, solo la CEO. La escala de los agentes
// (40 / 45 / 50 %) la ve todo el que vea esa línea. En las líneas ajenas
// que no son de agente se muestra solo de qué es la comisión, sin %.

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
