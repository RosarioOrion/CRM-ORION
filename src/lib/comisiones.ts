// Reglas de reparto de comisiones, tal como las definió Rosario:
//
//   Agente Junior   40%
//   Asesor          45%
//   Ejecutivo       50%
//   Team Leader     50% de sus propias ventas + 10% de cada operación de
//                    los agentes que capacitó (override, además de lo que
//                    se lleva el agente)
//
// El nivel de comisión (nivelComision) es un dato del usuario, separado del
// rol (rol = permisos: agente / team leader / administrador). Un Team
// Leader que cierra una venta propia cobra lo mismo que un Ejecutivo (50%),
// así que alcanza con tenerlo también en nivel "EJECUTIVO" — no hace falta
// un caso especial. El 10% de override para el Team Leader se calcula
// aparte, a partir de teamLeaderId del agente que cerró la operación.
export const NIVELES_COMISION = ["AGENTE_JUNIOR", "ASESOR", "EJECUTIVO"] as const;
export type NivelComision = (typeof NIVELES_COMISION)[number];

export const NIVEL_COMISION_LABEL: Record<NivelComision, string> = {
  AGENTE_JUNIOR: "Agente Junior",
  ASESOR: "Asesor",
  EJECUTIVO: "Ejecutivo",
};

export const NIVEL_COMISION_PORCENTAJE: Record<NivelComision, number> = {
  AGENTE_JUNIOR: 40,
  ASESOR: 45,
  EJECUTIVO: 50,
};

export const PORCENTAJE_OVERRIDE_TEAM_LEADER = 10;

export type LineaComision = {
  beneficiarioId: string;
  concepto: string;
  porcentaje: number;
  monto: number;
};

/**
 * Calcula cómo se reparte una comisión total entre el agente que cerró la
 * operación y, si corresponde, su Team Leader (override del 10% sobre el
 * total de la operación, no sobre la parte del agente).
 */
export function calcularReparto(params: {
  comisionTotal: number;
  agenteId: string;
  agenteNivel: NivelComision;
  teamLeaderId: string | null;
}): LineaComision[] {
  const { comisionTotal, agenteId, agenteNivel, teamLeaderId } = params;
  const lineas: LineaComision[] = [];

  const pctAgente = NIVEL_COMISION_PORCENTAJE[agenteNivel];
  lineas.push({
    beneficiarioId: agenteId,
    concepto: `Comisión agente (${NIVEL_COMISION_LABEL[agenteNivel]}, ${pctAgente}%)`,
    porcentaje: pctAgente,
    monto: Math.round((comisionTotal * pctAgente) / 100),
  });

  if (teamLeaderId && teamLeaderId !== agenteId) {
    lineas.push({
      beneficiarioId: teamLeaderId,
      concepto: `Override Team Leader (${PORCENTAJE_OVERRIDE_TEAM_LEADER}%)`,
      porcentaje: PORCENTAJE_OVERRIDE_TEAM_LEADER,
      monto: Math.round((comisionTotal * PORCENTAJE_OVERRIDE_TEAM_LEADER) / 100),
    });
  }

  return lineas;
}
