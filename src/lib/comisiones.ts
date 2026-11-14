// Reglas de reparto de comisiones.
//
// Escala de los agentes (definida por Rosario, editable en Ajustes):
//   Agente     desde USD 0       40%
//   Asesor     desde USD 10.000  45%
//   Ejecutivo  desde USD 20.000  50% (máximo)
// El nivel de un AGENTE es automático: sale de su facturación acumulada
// (comisiones generadas a su nombre). La operación que lo hace pasar de
// nivel se paga con el nivel que tenía; desde la siguiente, con el nuevo.
// Líder, Administrador y CEO, cuando cierran una operación propia, cobran
// según el nivel que tengan asignado en Usuarios.
//
// Reparto PROVISORIO de cada operación (sobre el total, a definir con el
// equipo; se cambia acá):
//   agente que cerró     su % de la escala (40% al ingresar)
//   Líder                20%  el primer Líder en su cadena de responsables
//   Administrador        15%  el primer Administrador en esa cadena
//   CEO                  15%
//   gastos de la empresa 10%  línea sin beneficiario
// Si en la cadena no hay Líder o Administrador, esa parte queda para la
// inmobiliaria (no se genera línea).
//
// El % de cada nivel de agente vive en la tabla niveles_comision (editable
// desde /ajustes), para poder agregar escalones sin cambiar código. El
// nivel (nivelComision) es un dato del usuario, separado del rol.
//
// "Facturación acumulada" (para saber si a un agente ya le toca subir de
// nivel) es la suma de todas las comisiones que ese usuario cobró o generó
// a lo largo del tiempo (tabla comisiones, por beneficiarioId) — no el
// precio de las propiedades que cerró. Ver facturacionAcumulada() abajo.

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { comisiones, nivelesComision, usuarios } from "@/db/schema";

export const PORCENTAJE_LIDER = 20;
export const PORCENTAJE_ADMINISTRADOR = 15;
export const PORCENTAJE_CEO = 15;
export const PORCENTAJE_GASTOS_EMPRESA = 10;
export const CONCEPTO_GASTOS_EMPRESA = `Gastos de la empresa (${PORCENTAJE_GASTOS_EMPRESA}%)`;

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
  /** null = gastos de la empresa. */
  beneficiarioId: string | null;
  concepto: string;
  porcentaje: number;
  monto: number;
};

/**
 * Calcula cómo se reparte la comisión total de una operación: el agente
 * que la cerró (según su nivel), el Líder, el Administrador y la CEO de su
 * cadena de responsables, y los gastos de la empresa. Todos los % son sobre
 * el total. El % y el nombre del nivel del agente los resuelve el caller.
 */
export function calcularReparto(params: {
  comisionTotal: number;
  agenteId: string;
  pctAgente: number;
  nivelLabel: string;
  liderId: string | null;
  administradorId: string | null;
  ceoId: string | null;
}): LineaComision[] {
  const { comisionTotal, agenteId, pctAgente, nivelLabel } = params;
  const parte = (pct: number) => Math.round((comisionTotal * pct) / 100);
  const lineas: LineaComision[] = [];

  lineas.push({
    beneficiarioId: agenteId,
    concepto: `Comisión agente (${nivelLabel}, ${pctAgente}%)`,
    porcentaje: pctAgente,
    monto: parte(pctAgente),
  });

  const roles: [string | null, string, number][] = [
    [params.liderId, "Líder", PORCENTAJE_LIDER],
    [params.administradorId, "Administrador", PORCENTAJE_ADMINISTRADOR],
    [params.ceoId, "CEO", PORCENTAJE_CEO],
  ];
  for (const [id, rol, pct] of roles) {
    if (!id) continue;
    lineas.push({ beneficiarioId: id, concepto: `${rol} (${pct}%)`, porcentaje: pct, monto: parte(pct) });
  }

  lineas.push({
    beneficiarioId: null,
    concepto: CONCEPTO_GASTOS_EMPRESA,
    porcentaje: PORCENTAJE_GASTOS_EMPRESA,
    monto: Math.round((comisionTotal * PORCENTAJE_GASTOS_EMPRESA) / 100),
  });

  return lineas;
}

/**
 * Genera las comisiones de una operación cerrada (venta a Boleto/Escritura
 * o alquiler Firmado): la del agente según su nivel, la del responsable
 * (override) y la de gastos de la empresa. Después actualiza el nivel
 * automático del agente con lo que lleva facturado.
 */
export async function generarComisionesOperacion(op: {
  tipo: "VENTA" | "ALQUILER";
  reservaVentaId?: string;
  reservaAlquilerId?: string;
  agenteId: string;
  comisionTotal: number;
}): Promise<boolean> {
  const [agente] = await db
    .select({ id: usuarios.id, rol: usuarios.rol, nivelComision: usuarios.nivelComision, teamLeaderId: usuarios.teamLeaderId })
    .from(usuarios)
    .where(eq(usuarios.id, op.agenteId));
  if (!agente) return false;

  const niveles = await obtenerNivelesComision();
  const nivel =
    agente.rol === "AGENTE"
      ? nivelSugerido(await facturacionAcumulada(agente.id), niveles)
      : resolverNivel(agente.nivelComision, niveles);
  if (!nivel) return false;

  // Cadena de responsables hacia arriba: el primer Líder y el primer
  // Administrador que aparezcan (sin contar al propio agente).
  const todos = await db
    .select({ id: usuarios.id, rol: usuarios.rol, teamLeaderId: usuarios.teamLeaderId })
    .from(usuarios);
  let liderId: string | null = null;
  let administradorId: string | null = null;
  let actual = agente.teamLeaderId;
  for (let i = 0; actual && i < todos.length; i++) {
    const u = todos.find((x) => x.id === actual);
    if (!u) break;
    if (u.rol === "TEAM_LEADER" && !liderId) liderId = u.id;
    if (u.rol === "ADMINISTRADOR" && !administradorId) administradorId = u.id;
    actual = u.teamLeaderId;
  }
  const ceoId = todos.find((x) => x.rol === "CEO")?.id ?? null;

  const lineas = calcularReparto({
    comisionTotal: op.comisionTotal,
    agenteId: agente.id,
    pctAgente: nivel.porcentaje,
    nivelLabel: nivel.nombre,
    liderId,
    administradorId,
    ceoId,
  });
  await db.insert(comisiones).values(
    lineas.map((l) => ({
      tipoOperacion: op.tipo,
      reservaVentaId: op.reservaVentaId ?? null,
      reservaAlquilerId: op.reservaAlquilerId ?? null,
      beneficiarioId: l.beneficiarioId,
      concepto: l.concepto,
      porcentaje: l.porcentaje,
      monto: l.monto,
    }))
  );

  if (agente.rol === "AGENTE") {
    const nuevo = nivelSugerido(await facturacionAcumulada(agente.id), niveles);
    if (nuevo && nuevo.clave !== agente.nivelComision) {
      await db.update(usuarios).set({ nivelComision: nuevo.clave }).where(eq(usuarios.id, agente.id));
    }
  }
  return true;
}

export type EscalaAgente = {
  facturado: number;
  nivel: NivelComisionConfig | null;
  siguiente: NivelComisionConfig | null;
  /** 0 a 100: avance desde el nivel actual hasta el siguiente. */
  avance: number;
};

/** Dónde está un agente en la escala, con cuánto le falta para el próximo nivel. */
export function escalaDe(facturado: number, niveles: NivelComisionConfig[]): EscalaAgente {
  const nivel = nivelSugerido(facturado, niveles);
  const siguiente = niveles.find((n) => n.facturacionMinima > facturado) ?? null;
  const desde = nivel?.facturacionMinima ?? 0;
  const avance = siguiente
    ? Math.min(100, Math.round(((facturado - desde) / Math.max(1, siguiente.facturacionMinima - desde)) * 100))
    : 100;
  return { facturado, nivel, siguiente, avance };
}
