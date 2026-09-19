// Reglas de reparto de comisiones.
//
// El % que le corresponde a cada agente ya NO es un enum fijo en el código:
// vive en la tabla niveles_comision (editable desde /ajustes), justamente
// para que Rosario pueda agregar escalones y metas nuevas sin pedir un
// cambio de código. Escalafón inicial (sembrado por la migración):
//
//   Agente Junior   USD 0        40%
//   Agente          USD 3.000    40%
//   Asesor          USD 10.000   45%
//   Ejecutivo       USD 20.000   50%
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
//
// "Facturación acumulada" (para saber si a un agente ya le toca subir de
// nivel) es la suma de todas las comisiones que ese agente cobró o generó
// a lo largo del tiempo (tabla comisiones, por beneficiarioId) — no el
// precio de las propiedades que cerró. Ver facturacionAcumulada() abajo.

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { comisiones, nivelesComision } from "@/db/schema";

export const PORCENTAJE_OVERRIDE_TEAM_LEADER = 10;

export type NivelComisionConfig = {
  id: string;
  clave: string;
  nombre: string;
  facturacionMinima: number;
  porcentaje: number;
};

/** Todos los escalones configurados, ordenados de menor a mayor facturación. */
export async function obtenerNivelesComision(): Promise<NivelComisionConfig[]> {
  const filas = await db
    .select()
    .from(nivelesComision)
    .orderBy(nivelesComision.facturacionMinima);
  return filas;
}

/** Suma de todas las comisiones (propias + overrides como Team Leader) que
 * ese usuario cobró o tiene generadas, histórico. Es la base para decidir
 * si le toca subir de escalón. */
export async function facturacionAcumulada(usuarioId: string): Promise<number> {
  const [fila] = await db
    .select({ total: sql<string>`coalesce(sum(${comisiones.monto}), 0)` })
    .from(comisiones)
    .where(eq(comisiones.beneficiarioId, usuarioId));
  return Number(fila?.total ?? 0);
}

/** Dado un total facturado, el escalón más alto que ya alcanzó (o el
 * primero de la lista si no hay ninguno definido con mínimo 0). */
export function nivelSugerido(
  facturacion: number,
  niveles: NivelComisionConfig[]
): NivelComisionConfig | null {
  if (niveles.length === 0) return null;
  const alcanzados = niveles.filter((n) => facturacion >= n.facturacionMinima);
  return alcanzados.length > 0 ? alcanzados[alcanzados.length - 1] : niveles[0];
}

/** Busca el nivel de un agente por su clave (usuarios.nivel_comision). Si
 * el escalón ya no existe (se borró, o quedó un dato viejo), cae al de
 * menor facturación mínima para no romper el cálculo de comisiones. */
export function resolverNivel(
  clave: string,
  niveles: NivelComisionConfig[]
): NivelComisionConfig | null {
  return niveles.find((n) => n.clave === clave) ?? niveles[0] ?? null;
}

export type LineaComision = {
  beneficiarioId: string;
  concepto: string;
  porcentaje: number;
  monto: number;
};

/**
 * Calcula cómo se reparte una comisión total entre el agente que cerró la
 * operación y, si corresponde, su Team Leader (override del 10% sobre el
 * total de la operación, no sobre la parte del agente). El % y el nombre
 * del nivel del agente los resuelve el caller (ver obtenerNivelesComision)
 * — esta función ya no hace el lookup, así queda desacoplada de la tabla.
 */
export function calcularReparto(params: {
  comisionTotal: number;
  agenteId: string;
  pctAgente: number;
  nivelLabel: string;
  teamLeaderId: string | null;
}): LineaComision[] {
  const { comisionTotal, agenteId, pctAgente, nivelLabel, teamLeaderId } = params;
  const lineas: LineaComision[] = [];

  lineas.push({
    beneficiarioId: agenteId,
    concepto: `Comisión agente (${nivelLabel}, ${pctAgente}%)`,
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
