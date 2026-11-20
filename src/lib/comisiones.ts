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
// Reparto de cada operación (acordado por Rosario con César y Huillen,
// noviembre 2026). Todos los % son sobre la comisión total:
//   gastos de la empresa  10% fijo (línea sin beneficiario), nunca baja.
//   agente que cerró      su % de la escala (40 / 45 / 50).
//   Team leader           su % de líder (usuarios.porcentaje_lider:
//                         César 25%, un líder nuevo 10%). Si el agente es
//                         de su equipo (primer Líder en su cadena).
//   Administrador y CEO   se reparten por mitades lo que queda.
// Escalas: cada escala el agente sube 5%. Esos 5% los ceden los de
// arriba: el líder baja 2,5% y el resto sale de la parte de Administrador
// y CEO (1,25% cada una). Sin líder, Administrador y CEO bajan 2,5% cada una.
//   Equipo de César:  agente 40 / César 25 / Huillen 12,5 / Rosario 12,5
//                     asesor 45 / 22,5 / 11,25 / 11,25 — ejecutivo 50 / 20 / 10 / 10
//   Equipo de Huillen o de Rosario: agente 40 / Huillen 25 / Rosario 25 …
// Si el que vende es un Líder: cobra como agente (su nivel) + su % de líder.
// Si vende la Administradora o la CEO: 45% cada una + 10% empresa (acuerdo
// original entre Rosario y Huillen, sin importar quién vendió).
// Si falta el Administrador o la CEO, su parte va a la otra.

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

export const PORCENTAJE_GASTOS_EMPRESA = 10;
/** % de líder por defecto para un Team leader nuevo (César tiene 25). */
export const PORCENTAJE_LIDER_DEFECTO = 10;
/** Cuánto cede el líder por cada escala que sube el agente. */
export const BAJA_LIDER_POR_ESCALA = 2.5;
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

/** Redondeo a 2 decimales (los % pueden ser 11,25). */
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Calcula cómo se reparte la comisión total de una operación (ver reglas
 * arriba). `pctBase` es el % del primer nivel de la escala (40): la
 * diferencia con `pctAgente` es cuánto subió el agente.
 */
export function calcularReparto(params: {
  comisionTotal: number;
  agenteId: string;
  rolAgente: "AGENTE" | "TEAM_LEADER" | "ADMINISTRADOR" | "CEO";
  pctAgente: number;
  pctBase: number;
  nivelLabel: string;
  /** Líder del equipo (o el propio agente si es líder) y su %. */
  lider: { id: string; porcentaje: number } | null;
  administradorId: string | null;
  ceoId: string | null;
}): LineaComision[] {
  const { comisionTotal, agenteId, rolAgente, nivelLabel } = params;
  const lineas: LineaComision[] = [];
  const agregar = (beneficiarioId: string | null, concepto: string, porcentaje: number) => {
    if (porcentaje <= 0) return;
    lineas.push({ beneficiarioId, concepto, porcentaje: r2(porcentaje), monto: Math.round((comisionTotal * porcentaje) / 100) });
  };
  const fmt = (n: number) => String(r2(n)).replace(".", ",");
  const disponible = 100 - PORCENTAJE_GASTOS_EMPRESA;

  // Si falta una de las dos, su mitad va a la otra (y si faltan las dos, a la empresa).
  const repartirArriba = (pct: number, etiqueta: string) => {
    const ids = [
      [params.administradorId, "Administración"],
      [params.ceoId, "Dirección"],
    ].filter((x): x is [string, string] => !!x[0]);
    if (!ids.length) return pct;
    for (const [id, quien] of ids) agregar(id, `${quien} · ${etiqueta} (${fmt(pct / ids.length)}%)`, pct / ids.length);
    return 0;
  };

  let empresa = PORCENTAJE_GASTOS_EMPRESA;

  if (rolAgente === "ADMINISTRADOR" || rolAgente === "CEO") {
    // Acuerdo Rosario–Huillen: 45 y 45, gane quien gane la operación. La
    // parte de quien vendió va como "Comisión agente" (cuenta para su
    // objetivo del mes); la de la otra, como su parte de socia.
    const socia = rolAgente === "CEO" ? params.administradorId : params.ceoId;
    const mitad = socia && socia !== agenteId ? disponible / 2 : disponible;
    agregar(agenteId, `Comisión agente (operación propia, ${fmt(mitad)}%)`, mitad);
    if (socia && socia !== agenteId) {
      agregar(socia, `${rolAgente === "CEO" ? "Administración" : "Dirección"} · operación de socia (${fmt(mitad)}%)`, mitad);
    }
  } else {
    const subida = Math.max(0, params.pctAgente - params.pctBase);
    const escalas = subida / 5;
    agregar(agenteId, `Comisión agente (${nivelLabel}, ${fmt(params.pctAgente)}%)`, params.pctAgente);
    let resto = disponible - params.pctAgente;
    if (params.lider) {
      const pctLider = Math.max(0, Math.min(resto, params.lider.porcentaje - BAJA_LIDER_POR_ESCALA * escalas));
      agregar(params.lider.id, `Team leader (${fmt(pctLider)}%)`, pctLider);
      resto -= pctLider;
    }
    empresa += repartirArriba(resto, params.lider ? "equipo de líder" : "equipo directo");
  }

  lineas.push({
    beneficiarioId: null,
    concepto: CONCEPTO_GASTOS_EMPRESA,
    porcentaje: r2(empresa),
    monto: Math.round((comisionTotal * empresa) / 100),
  });

  // Que los montos sumen exacto el total (diferencias de redondeo de 1 dólar).
  // Va a la línea de la CEO (o a la primera): la de la empresa queda fija.
  const dif = comisionTotal - lineas.reduce((t, l) => t + l.monto, 0);
  if (dif) (lineas.find((l) => l.beneficiarioId && l.beneficiarioId === params.ceoId) ?? lineas[0]).monto += dif;
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
  /** Se agrega al concepto de cada línea (ej. "compartida · punta vendedora"). */
  detalle?: string | null;
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

  // Líder: el propio usuario si es Líder; si no, el primer Líder en su
  // cadena de responsables. Administración y Dirección: el primer
  // Administrador de la cadena (o el único activo) y la CEO.
  const todos = await db
    .select({
      id: usuarios.id,
      rol: usuarios.rol,
      teamLeaderId: usuarios.teamLeaderId,
      activo: usuarios.activo,
      porcentajeLider: usuarios.porcentajeLider,
    })
    .from(usuarios);
  const yo = todos.find((x) => x.id === agente.id);
  let lider: { id: string; porcentaje: number } | null =
    agente.rol === "TEAM_LEADER" && yo ? { id: yo.id, porcentaje: yo.porcentajeLider } : null;
  let administradorId: string | null = agente.rol === "ADMINISTRADOR" ? agente.id : null;
  let actual = agente.teamLeaderId;
  for (let i = 0; actual && i < todos.length; i++) {
    const u = todos.find((x) => x.id === actual);
    if (!u) break;
    if (u.rol === "TEAM_LEADER" && !lider && agente.rol === "AGENTE") lider = { id: u.id, porcentaje: u.porcentajeLider };
    if (u.rol === "ADMINISTRADOR" && !administradorId) administradorId = u.id;
    actual = u.teamLeaderId;
  }
  if (!administradorId) {
    const admins = todos.filter((x) => x.rol === "ADMINISTRADOR" && x.activo);
    if (admins.length === 1) administradorId = admins[0].id;
  }
  const ceoId =
    agente.rol === "CEO" ? agente.id : (todos.find((x) => x.rol === "CEO" && x.activo) ?? todos.find((x) => x.rol === "CEO"))?.id ?? null;

  const lineas = calcularReparto({
    comisionTotal: op.comisionTotal,
    agenteId: agente.id,
    rolAgente: agente.rol,
    pctAgente: nivel.porcentaje,
    pctBase: niveles[0]?.porcentaje ?? nivel.porcentaje,
    nivelLabel: nivel.nombre,
    lider,
    administradorId,
    ceoId,
  });
  await db.insert(comisiones).values(
    lineas.map((l) => ({
      tipoOperacion: op.tipo,
      reservaVentaId: op.reservaVentaId ?? null,
      reservaAlquilerId: op.reservaAlquilerId ?? null,
      beneficiarioId: l.beneficiarioId,
      concepto: op.detalle ? `${l.concepto} · ${op.detalle}` : l.concepto,
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

/**
 * Genera las comisiones de una reserva, dividida por agente (entera o
 * compartida, ver src/lib/reparto-reserva.ts). Devuelve false si no había
 * nada que generar o si alguna parte falló.
 */
export async function generarComisionesReserva(op: {
  tipo: "VENTA" | "ALQUILER";
  reservaVentaId?: string;
  reservaAlquilerId?: string;
  partes: { agenteId: string; monto: number; detalle: string | null }[];
}): Promise<boolean> {
  if (!op.partes.length) return false;
  let todas = true;
  for (const p of op.partes) {
    const ok = await generarComisionesOperacion({
      tipo: op.tipo,
      reservaVentaId: op.reservaVentaId,
      reservaAlquilerId: op.reservaAlquilerId,
      agenteId: p.agenteId,
      comisionTotal: p.monto,
      detalle: p.detalle,
    });
    todas &&= ok;
  }
  return todas;
}
