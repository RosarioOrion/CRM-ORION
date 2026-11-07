import { and, eq, getTableColumns, inArray } from "drizzle-orm";
import { db } from "@/db";
import { contactos, propiedades, seguimientos } from "@/db/schema";
import { armarTarjetasPipeline } from "@/lib/pipeline-datos";
import { ahoraUY } from "@/lib/calendario";
import { lunesDe } from "@/lib/pipeline";
import { estadoSeguimiento, numeroWhatsApp, textoAvisoFinal, type EstadoSeguimiento } from "@/lib/seguimientos";
import {
  completarMensaje,
  PLANTILLAS_INICIALES,
  TITULO_SEGUIMIENTO_SEMANAL,
  type Plantilla,
} from "@/lib/plantillas-whatsapp";
import { listarPlantillas, datosParaWhatsApp } from "@/app/(app)/mensajes/actions";

// "Seguimiento del lunes": todos los dueños a los que les toca el mensaje
// semanal, agrupados (un solo mensaje por dueño aunque tenga varias
// propiedades), con el texto ya armado. El agente toca "Enviar", se abre
// WhatsApp con el mensaje listo y Orion lo registra como seguimiento.
//
// Respeta la regla de contacto frío: si al dueño le toca el 3º sin
// respuesta, el mensaje es el aviso final; si ya está frío o no respondió el
// aviso, no se le manda nada y queda en "Para decidir".

export type DuenoLunes = {
  contactoId: string;
  nombre: string;
  telefono: string | null;
  whatsapp: string | null;
  propiedades: { id: string; codigo: string; titulo: string; atrasado: boolean }[];
  mensaje: string;
  avisoFinal: boolean;
  /** Qué versión del mensaje semanal le toca (ej. "Seguimiento semanal 2"). */
  version: string | null;
  /** Ya se le mandó el de esta semana. */
  hecho: boolean;
  /** Frío o sin respuesta al aviso final: decide el agente. */
  paraDecidir: string | null;
};

function listaPropiedades(titulos: string[]): string {
  if (titulos.length <= 1) return titulos[0] ?? "la propiedad";
  return `${titulos.slice(0, -1).join(", ")} y ${titulos[titulos.length - 1]}`;
}

/** Versiones del mensaje semanal, en el orden de /mensajes (siempre al menos una). */
export function versionesSeguimientoSemanal(plantillas: Plantilla[]): Plantilla[] {
  const versiones = plantillas.filter((p) => TITULO_SEGUIMIENTO_SEMANAL.test(p.titulo));
  if (versiones.length === 0) {
    versiones.push({ id: "", ...PLANTILLAS_INICIALES.find((p) => TITULO_SEGUIMIENTO_SEMANAL.test(p.titulo))! });
  }
  return versiones;
}

// Para contactos sin propiedades (compradores, inquilinos): la plantilla
// semanal pregunta por "la propiedad", así que se usa este texto.
const TEXTO_SEGUIMIENTO_BUSQUEDA =
  "Hola {nombre}, ¿cómo estás? Te escribo para saber cómo seguís con la búsqueda y si cambió algo de lo que necesitás. Apenas tenga algo que se ajuste, te aviso. ¡Saludos!";

/**
 * Mensaje semanal para un contacto. Las versiones se rotan: le toca la
 * siguiente a la última que recibió (se cuentan sus seguimientos antes de
 * esta semana, un día = uno). Al 3º sin respuesta va el aviso final.
 */
export function mensajeSeguimientoSemanal(o: {
  nombre: string;
  agente: string;
  inmobiliaria: string;
  propiedades: { codigo: string; titulo: string }[];
  visitas: number;
  estado: EstadoSeguimiento;
  fechasPrevias: Date[];
  versiones: Plantilla[];
  ahora: Date;
}): { mensaje: string; avisoFinal: boolean; version: string | null } {
  const esDueno = o.propiedades.length > 0;
  const avisoFinal = o.estado.tipo === "SIN_RESPUESTA" && o.estado.siguienteEsAviso;
  if (avisoFinal) {
    return {
      mensaje: textoAvisoFinal({
        nombre: o.nombre,
        agente: o.agente,
        propiedades: o.propiedades.map((p) => p.codigo),
        esComprador: !esDueno,
      }),
      avisoFinal,
      version: null,
    };
  }
  const variables = {
    nombre: o.nombre,
    agente: o.agente,
    inmobiliaria: o.inmobiliaria,
    propiedad: listaPropiedades(o.propiedades.map((p) => p.titulo)),
    link: null,
  };
  if (!esDueno) {
    return { mensaje: completarMensaje(TEXTO_SEGUIMIENTO_BUSQUEDA, variables), avisoFinal, version: null };
  }
  const lunes = lunesDe(o.ahora).getTime();
  const previos = new Set(o.fechasPrevias.filter((f) => f.getTime() < lunes).map((f) => f.toDateString())).size;
  const version = o.versiones[previos % o.versiones.length];
  let mensaje = completarMensaje(version.texto, variables);
  // Le muestra al dueño que la propiedad se está trabajando.
  if (o.visitas > 0) {
    mensaje += `\n\nTe cuento que desde nuestro último contacto tuvimos ${o.visitas} ${
      o.visitas === 1 ? "visita" : "visitas"
    }.`;
  }
  return { mensaje, avisoFinal, version: o.versiones.length < 2 ? null : version.titulo };
}

export async function armarSeguimientoLunes(agenteId: string): Promise<DuenoLunes[]> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fotos, ...columnasSinFotos } = getTableColumns(propiedades);
  const props = await db
    .select(columnasSinFotos)
    .from(propiedades)
    .where(and(eq(propiedades.agenteId, agenteId), eq(propiedades.estado, "ACTIVA")))
    .orderBy(propiedades.fechaInicioPipeline);
  if (props.length === 0) return [];

  const duenoIds = [...new Set(props.map((p) => p.duenoId))];
  const [tarjetas, duenos, historial, plantillas, datos] = await Promise.all([
    armarTarjetasPipeline(props, false),
    db
      .select({ id: contactos.id, nombre: contactos.nombre, telefono: contactos.telefono, frioDesde: contactos.frioDesde })
      .from(contactos)
      .where(inArray(contactos.id, duenoIds)),
    db
      .select({
        contactoId: seguimientos.contactoId,
        fecha: seguimientos.fecha,
        respondio: seguimientos.respondio,
        avisoFinal: seguimientos.avisoFinal,
        proximaFecha: seguimientos.proximaFecha,
      })
      .from(seguimientos)
      .where(inArray(seguimientos.contactoId, duenoIds)),
    listarPlantillas(),
    datosParaWhatsApp(),
  ]);

  const versiones = versionesSeguimientoSemanal(plantillas);
  const ahora = ahoraUY();

  const resultado: DuenoLunes[] = [];
  for (const d of duenos) {
    const suyas = tarjetas.filter((t) => props.find((p) => p.id === t.propiedadId)?.duenoId === d.id);
    // Le toca: seguimiento de hoy o atrasado. Sin frecuencia elegida, se toma
    // como semanal: toca si no se hizo el de esta semana.
    const pendientes = suyas.filter((t) =>
      t.seguimiento
        ? t.seguimiento.estado === "HOY" || t.seguimiento.estado === "ATRASADO"
        : !t.hechasEstaSemana.includes("SEGUIMIENTO_DUENO")
    );
    const hechas = suyas.filter((t) =>
      t.seguimiento ? t.seguimiento.estado === "HECHO" : t.hechasEstaSemana.includes("SEGUIMIENTO_DUENO")
    );
    if (pendientes.length === 0 && hechas.length === 0) continue; // no le toca esta semana

    const lista = pendientes.length > 0 ? pendientes : hechas;
    const estado = estadoSeguimiento(
      historial.filter((h) => h.contactoId === d.id),
      d.frioDesde,
      ahora
    );
    const { mensaje, avisoFinal, version } = mensajeSeguimientoSemanal({
      nombre: d.nombre,
      agente: datos.agente,
      inmobiliaria: datos.inmobiliaria,
      propiedades: lista,
      visitas: lista.reduce((n, t) => n + t.visitasDesdeUltimoSeg, 0),
      estado,
      fechasPrevias: historial.filter((h) => h.contactoId === d.id).map((h) => h.fecha),
      versiones,
      ahora,
    });

    resultado.push({
      contactoId: d.id,
      nombre: d.nombre,
      telefono: d.telefono,
      whatsapp: numeroWhatsApp(d.telefono),
      propiedades: lista.map((t) => ({
        id: t.propiedadId,
        codigo: t.codigo,
        titulo: t.titulo,
        atrasado: t.seguimiento?.estado === "ATRASADO",
      })),
      mensaje,
      avisoFinal,
      version,
      hecho: pendientes.length === 0,
      paraDecidir:
        estado.tipo === "FRIO"
          ? "Está frío: decidí si suspender sus propiedades."
          : estado.tipo === "NO_RESPONDIO_AVISO"
          ? "No respondió el aviso final: decidí si suspender sus propiedades."
          : null,
    });
  }

  // Los que no tienen celular van al final, para no cortar la ráfaga.
  return resultado.sort(
    (a, b) => Number(!a.whatsapp) - Number(!b.whatsapp) || a.nombre.localeCompare(b.nombre, "es")
  );
}
