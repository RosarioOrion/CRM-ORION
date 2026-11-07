import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { coincidenciasAvisadas, propiedades, reservasAlquiler, reservasVenta, visitas } from "@/db/schema";
import { ahoraUY } from "@/lib/calendario";

// Panel "Mis propiedades" del Inicio (como en Lumen OS): en qué etapa está
// cada propiedad disponible del agente, con los datos que ya hay en Orion.
// Cada propiedad cae en una sola etapa, la más avanzada:
//   - En negociación: reservada, o con una reserva en curso vinculada.
//   - En visitas: visita agendada a futuro o hecha en los últimos 14 días.
//   - Con consultas: desde que se publicó tuvo alguna visita o se le avisó a
//     algún cliente con una búsqueda que coincide (Coincidencias).
//   - Sin consultas: nada de lo anterior.
// Aparte, "quietas": disponibles hace 21+ días (y no en negociación) sin consultas en los
// últimos 21 días → plantear ajuste de precio en el próximo seguimiento.

export const ETAPAS = ["SIN_CONSULTAS", "CON_CONSULTAS", "EN_VISITAS", "EN_NEGOCIACION"] as const;
export type Etapa = (typeof ETAPAS)[number];

export const ETAPA_LABEL: Record<Etapa, string> = {
  SIN_CONSULTAS: "Sin consultas",
  CON_CONSULTAS: "Con consultas",
  EN_VISITAS: "En visitas",
  EN_NEGOCIACION: "En negociación",
};

/** Filtro extra de la lista de Propiedades para el aviso de 21 días. */
export const FILTRO_SIN_CONSULTAS_21 = "SIN_CONSULTAS_21";
export const DIAS_SIN_CONSULTAS = 21;
const DIAS_VISITA_RECIENTE = 14;
const DIA = 24 * 3600 * 1000;

export function esEtapa(v: unknown): v is Etapa {
  return typeof v === "string" && (ETAPAS as readonly string[]).includes(v);
}

export type ResumenMisPropiedades = {
  etapa: Map<string, Etapa>;
  /** Activas hace 21+ días sin consultas en los últimos 21 días. */
  sinConsultas21: Set<string>;
  conteo: Record<Etapa, number>;
};

export async function resumenMisPropiedades(agenteId: string): Promise<ResumenMisPropiedades> {
  const props = await db
    .select({ id: propiedades.id, estado: propiedades.estado, inicio: propiedades.fechaInicioPipeline })
    .from(propiedades)
    .where(and(eq(propiedades.agenteId, agenteId), inArray(propiedades.estado, ["ACTIVA", "RESERVADA"])));

  const conteo: Record<Etapa, number> = { SIN_CONSULTAS: 0, CON_CONSULTAS: 0, EN_VISITAS: 0, EN_NEGOCIACION: 0 };
  const etapa = new Map<string, Etapa>();
  const sinConsultas21 = new Set<string>();
  if (props.length === 0) return { etapa, sinConsultas21, conteo };

  const ids = props.map((p) => p.id);
  const [vis, avisos, resV, resA] = await Promise.all([
    db
      .select({ propiedadId: visitas.propiedadId, fecha: visitas.fecha, estado: visitas.estado })
      .from(visitas)
      .where(and(inArray(visitas.propiedadId, ids), ne(visitas.estado, "CANCELADA"))),
    db
      .select({ propiedadId: coincidenciasAvisadas.propiedadId, fecha: coincidenciasAvisadas.creadoEn })
      .from(coincidenciasAvisadas)
      .where(inArray(coincidenciasAvisadas.propiedadId, ids)),
    db
      .select({ propiedadId: reservasVenta.propiedadId })
      .from(reservasVenta)
      .where(and(inArray(reservasVenta.propiedadId, ids), inArray(reservasVenta.estado, ["RESERVADA", "BOLETO"]))),
    db
      .select({ propiedadId: reservasAlquiler.propiedadId })
      .from(reservasAlquiler)
      .where(and(inArray(reservasAlquiler.propiedadId, ids), eq(reservasAlquiler.estado, "RESERVADA"))),
  ]);

  // visitas.fecha está en hora de Uruguay; coincidencias.creadoEn en UTC.
  const ahora = ahoraUY().getTime();
  const ahoraReal = Date.now();
  const enNegociacion = new Set([...resV, ...resA].map((r) => r.propiedadId));

  for (const p of props) {
    const suyas = vis.filter((v) => v.propiedadId === p.id);
    const avisadas = avisos.filter((a) => a.propiedadId === p.id);
    const desde = p.inicio.getTime();
    const consultas = [
      ...suyas.map((v) => v.fecha.getTime()),
      ...avisadas.map((a) => a.fecha.getTime() - (ahoraReal - ahora)),
    ].filter((t) => t >= desde);

    let e: Etapa;
    if (p.estado === "RESERVADA" || enNegociacion.has(p.id)) e = "EN_NEGOCIACION";
    else if (
      suyas.some(
        (v) =>
          (v.estado === "PROGRAMADA" && v.fecha.getTime() >= ahora - DIA) ||
          v.fecha.getTime() >= ahora - DIAS_VISITA_RECIENTE * DIA
      )
    )
      e = "EN_VISITAS";
    else if (consultas.length > 0) e = "CON_CONSULTAS";
    else e = "SIN_CONSULTAS";
    etapa.set(p.id, e);
    conteo[e]++;

    const limite = ahora - DIAS_SIN_CONSULTAS * DIA;
    // En negociación no se sugiere bajar el precio aunque no tenga consultas nuevas.
    if (e !== "EN_NEGOCIACION" && desde <= limite && !consultas.some((t) => t >= limite)) {
      sinConsultas21.add(p.id);
    }
  }
  return { etapa, sinConsultas21, conteo };
}
