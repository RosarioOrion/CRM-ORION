import { and, eq, getTableColumns, inArray } from "drizzle-orm";
import { db } from "@/db";
import { contactos, propiedades, seguimientos } from "@/db/schema";
import { armarTarjetasPipeline } from "@/lib/pipeline-datos";
import { ahoraUY } from "@/lib/calendario";
import { lunesDe } from "@/lib/pipeline";
import { estadoSeguimiento, numeroWhatsApp, textoAvisoFinal } from "@/lib/seguimientos";
import { completarMensaje, PLANTILLAS_INICIALES, TITULO_SEGUIMIENTO_SEMANAL } from "@/lib/plantillas-whatsapp";
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

  // Versiones del mensaje semanal, en el orden de /mensajes. Se van rotando
  // para que el dueño no reciba siempre el mismo texto.
  const versiones = plantillas.filter((p) => TITULO_SEGUIMIENTO_SEMANAL.test(p.titulo));
  if (versiones.length === 0) {
    versiones.push({ id: "", ...PLANTILLAS_INICIALES.find((p) => TITULO_SEGUIMIENTO_SEMANAL.test(p.titulo))! });
  }
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
    const titulos = lista.map((t) => t.titulo);
    // Le toca la versión siguiente a la última que recibió: se cuenta cuántos
    // seguimientos tuvo (un día = uno) antes de esta semana.
    const lunes = lunesDe(ahora).getTime();
    const contactosPrevios = new Set(
      historial
        .filter((h) => h.contactoId === d.id && h.fecha.getTime() < lunes)
        .map((h) => h.fecha.toDateString())
    ).size;
    const version = versiones[contactosPrevios % versiones.length];
    const avisoFinal = estado.tipo === "SIN_RESPUESTA" && estado.siguienteEsAviso;

    let mensaje = avisoFinal
      ? textoAvisoFinal({
          nombre: d.nombre,
          agente: datos.agente,
          propiedades: lista.map((t) => t.codigo),
          esComprador: false,
        })
      : completarMensaje(version.texto, {
          nombre: d.nombre,
          agente: datos.agente,
          inmobiliaria: datos.inmobiliaria,
          propiedad: listaPropiedades(titulos),
          link: null,
        });
    // Le muestra al dueño que la propiedad se está trabajando.
    const visitas = lista.reduce((n, t) => n + t.visitasDesdeUltimoSeg, 0);
    if (!avisoFinal && visitas > 0) {
      mensaje += `\n\nTe cuento que desde nuestro último contacto tuvimos ${visitas} ${
        visitas === 1 ? "visita" : "visitas"
      }.`;
    }

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
      version: avisoFinal || versiones.length < 2 ? null : version.titulo,
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
