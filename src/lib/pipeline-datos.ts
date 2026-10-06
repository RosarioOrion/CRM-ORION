import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  propiedades,
  pipelineAcciones,
  historialPrecios,
  seguimientos,
  visitas,
  contactos,
} from "@/db/schema";
import { limpiarTitulo } from "@/lib/propiedades";
import { ahoraUY } from "@/lib/calendario";
import { CANAL_LABEL, esCanal, numeroWhatsApp } from "@/lib/seguimientos";
import {
  diasEnMercado,
  semanaActual,
  esSemanaFinal,
  accionesDeLaSemana,
  estaVencido,
  DURACION_CICLO,
  UMBRAL_REVISAR_PRECIO_DIAS,
  UMBRAL_ESTANCADA_DIAS,
  proximoLunesQueToca,
  estadoRecurrente,
  diasDeAtraso,
  semanaPideAjuste,
  fechaCorta,
  esFrecuencia,
  lunesDe,
  type CategoriaPipeline,
} from "@/lib/pipeline";
import type { TarjetaPipelineProps } from "@/app/(app)/pipeline/tarjeta-pipeline";

// Sin las fotos: el Pipeline no las usa y pesan mucho.
type Propiedad = Omit<typeof propiedades.$inferSelect, "fotos">;

/** Marca que usa "Republicar" en pipeline_acciones. */
export const DESCRIPCION_REPUBLICADO = "REPUBLICADO";

function hora(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Arma los datos de las tarjetas del Pipeline (lo usan la página Pipeline y
 * la ficha de cada propiedad): semana del plan, seguimiento de los lunes,
 * republicar y visitas agendadas.
 */
export async function armarTarjetasPipeline(
  props: Propiedad[],
  soloLectura: boolean
): Promise<TarjetaPipelineProps[]> {
  const ids = props.map((p) => p.id);
  if (ids.length === 0) return [];
  const duenoIds = [...new Set(props.map((p) => p.duenoId))];

  const [acciones, ajustes, segs, vis, duenos] = await Promise.all([
    db
      .select()
      .from(pipelineAcciones)
      .where(inArray(pipelineAcciones.propiedadId, ids))
      .orderBy(desc(pipelineAcciones.creadoEn)),
    db
      .select()
      .from(historialPrecios)
      .where(inArray(historialPrecios.propiedadId, ids))
      .orderBy(desc(historialPrecios.creadoEn)),
    db
      .select()
      .from(seguimientos)
      .where(inArray(seguimientos.propiedadId, ids))
      .orderBy(desc(seguimientos.fecha)),
    db
      .select({
        propiedadId: visitas.propiedadId,
        fecha: visitas.fecha,
        estado: visitas.estado,
        contacto: contactos.nombre,
      })
      .from(visitas)
      .leftJoin(contactos, eq(contactos.id, visitas.contactoId))
      .where(inArray(visitas.propiedadId, ids))
      .orderBy(desc(visitas.fecha)),
    db
      .select({ id: contactos.id, nombre: contactos.nombre, telefono: contactos.telefono })
      .from(contactos)
      .where(inArray(contactos.id, duenoIds)),
  ]);

  const ahora = new Date();
  const ahoraLocal = ahoraUY();
  const hoy0 = new Date(ahoraLocal.getFullYear(), ahoraLocal.getMonth(), ahoraLocal.getDate());

  return props.map((p) => {
    const dias = diasEnMercado(p.fechaInicioPipeline, ahora);
    const semana = semanaActual(dias, p.operacion);
    const esFinal = esSemanaFinal(semana, p.operacion);
    const accionesSemana = accionesDeLaSemana(p.operacion, semana);

    const deEsta = acciones.filter((a) => a.propiedadId === p.id);
    const hechasEstaSemana = deEsta
      .filter((a) => a.semana === semana && a.descripcion !== DESCRIPCION_REPUBLICADO)
      .map((a) => a.categoria as CategoriaPipeline);

    const segsProp = segs.filter((s) => s.propiedadId === p.id);
    const ultimoSeg = segsProp[0] ?? null;

    // Último movimiento: la acción más reciente o el último seguimiento.
    const ultimaAccion = deEsta[0];
    const candidatos = [ultimaAccion?.creadoEn, ultimoSeg?.fecha].filter(Boolean) as Date[];
    const ultimoMovimiento = candidatos.length
      ? new Date(Math.max(...candidatos.map((d) => d.getTime())))
      : null;
    const diasSinContacto = ultimoMovimiento ? diasEnMercado(ultimoMovimiento, ahora) : null;

    const ultimoAjuste = ajustes.find((a) => a.propiedadId === p.id);
    const diasSinAjuste = ultimoAjuste ? diasEnMercado(ultimoAjuste.creadoEn, ahora) : dias;

    // Frecuencia del seguimiento al dueño (y de republicar).
    const frecuencia = esFrecuencia(p.frecuenciaSeguimiento) ? p.frecuenciaSeguimiento : null;
    // Sin registros todavía: toca el primer lunes desde que entró, pero nunca
    // antes del lunes de esta semana (para no marcar meses de atraso en las
    // propiedades que ya estaban cargadas).
    const inicio = new Date(Math.max(p.fechaInicioPipeline.getTime(), lunesDe(ahoraLocal).getTime()));

    let seguimiento: TarjetaPipelineProps["seguimiento"] = null;
    let republicar: TarjetaPipelineProps["republicar"] = null;
    if (frecuencia) {
      const tocaSeg = proximoLunesQueToca(ultimoSeg?.fecha ?? null, inicio, frecuencia);
      const estSeg = estadoRecurrente(tocaSeg, !!ultimoSeg, ahoraLocal);
      seguimiento = {
        estado: estSeg,
        toca: fechaCorta(tocaSeg),
        diasAtraso: estSeg === "ATRASADO" ? diasDeAtraso(tocaSeg, ahoraLocal) : 0,
        proximaISO: `${tocaSeg.getFullYear()}-${String(tocaSeg.getMonth() + 1).padStart(2, "0")}-${String(tocaSeg.getDate()).padStart(2, "0")}`,
      };

      const ultimaRep = deEsta.find((a) => a.descripcion === DESCRIPCION_REPUBLICADO) ?? null;
      // pipeline_acciones guarda la hora real (UTC): la pasamos a hora de Uruguay.
      const ultimaRepUY = ultimaRep ? new Date(ultimaRep.creadoEn.getTime() - 3 * 3600 * 1000) : null;
      const tocaRep = proximoLunesQueToca(ultimaRepUY, inicio, frecuencia);
      const estRep = estadoRecurrente(tocaRep, !!ultimaRep, ahoraLocal);
      republicar = {
        estado: estRep,
        toca: fechaCorta(tocaRep),
        diasAtraso: estRep === "ATRASADO" ? diasDeAtraso(tocaRep, ahoraLocal) : 0,
        ultima: ultimaRepUY ? fechaCorta(ultimaRepUY) : null,
      };
    }

    // Visitas agendadas para esta propiedad (desde la Agenda).
    const visProp = vis.filter((v) => v.propiedadId === p.id);
    const desde = ultimoSeg?.fecha ?? p.fechaInicioPipeline;
    const visitasProximas = visProp
      .filter((v) => v.estado === "PROGRAMADA" && v.fecha.getTime() >= hoy0.getTime())
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
      .map((v) => `${fechaCorta(v.fecha)} ${hora(v.fecha)}${v.contacto ? ` · ${v.contacto}` : ""}`);
    const visitasDesdeUltimoSeg = visProp.filter(
      (v) => v.estado !== "CANCELADA" && v.fecha.getTime() >= desde.getTime() && v.fecha.getTime() < hoy0.getTime()
    ).length;

    const dueno = duenos.find((d) => d.id === p.duenoId);

    return {
      propiedadId: p.id,
      codigo: p.codigo,
      titulo: limpiarTitulo(p.titulo),
      operacion: p.operacion,
      precio: p.precio,
      moneda: p.moneda,
      dias,
      semana,
      totalSemanas: DURACION_CICLO[p.operacion],
      esFinal,
      vencido: estaVencido(dias, p.operacion),
      revisarPrecio: diasSinAjuste >= UMBRAL_REVISAR_PRECIO_DIAS,
      estancada: diasSinContacto === null || diasSinContacto >= UMBRAL_ESTANCADA_DIAS,
      acciones: accionesSemana,
      hechasEstaSemana,
      diasSinContacto,
      ultimoAjustePrecio: ultimoAjuste
        ? { fecha: ultimoAjuste.creadoEn.toISOString(), precioAnterior: ultimoAjuste.precioAnterior }
        : null,
      fechaInicioPipeline: p.fechaInicioPipeline.toISOString(),
      soloLectura,
      frecuencia,
      seguimiento,
      republicar,
      pideAjuste: semanaPideAjuste(accionesSemana),
      dueno: dueno
        ? { nombre: dueno.nombre, telefono: dueno.telefono ?? null, whatsapp: numeroWhatsApp(dueno.telefono) }
        : null,
      visitasProximas,
      visitasDesdeUltimoSeg,
      historial: segsProp.slice(0, 6).map((s) => ({
        id: s.id,
        fecha: fechaCorta(s.fecha),
        canal: esCanal(s.canal) ? CANAL_LABEL[s.canal] : s.canal,
        respondio: s.respondio,
        nota: s.nota,
        ajustePlanteado: s.ajustePlanteado,
        ajusteAceptado: s.ajusteAceptado,
        ajustePrecio: s.ajustePrecio,
        ajusteMoneda: s.ajusteMoneda,
      })),
    };
  });
}
