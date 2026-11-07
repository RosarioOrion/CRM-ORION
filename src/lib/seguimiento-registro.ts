import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contactos, historialPrecios, pipelineAcciones, propiedades, seguimientos } from "@/db/schema";
import { ahoraUY } from "@/lib/calendario";
import { reemplazarPrecio } from "@/lib/precio-texto";
import { DIAS_ENTRE_SEGUIMIENTOS } from "@/lib/seguimientos";
import { diasEnMercado, esFrecuencia, proximoLunesQueToca, semanaActual } from "@/lib/pipeline";

// Registro del seguimiento semanal al dueño, compartido por el
// "Seguimiento del lunes" (Pipeline) y el "Plan del día" (Inicio). Cada
// mensaje o respuesta queda en el historial del contacto, así sigue valiendo
// la regla de contacto frío (ver src/lib/seguimientos.ts).

type Propiedad = typeof propiedades.$inferSelect;

/** Hora de Uruguay con segundos, para que dos registros del mismo minuto queden en orden. */
export function fechaRegistroUY(): Date {
  const ahora = ahoraUY();
  const real = new Date();
  return new Date(ahora.getTime() + real.getSeconds() * 1000 + real.getMilliseconds());
}

export async function registrarSeguimientoSemanal(opts: {
  agenteId: string;
  contactoId: string;
  /** Propiedades del agente de las que este contacto es dueño (puede no haber). */
  props: Propiedad[];
  respondio: boolean;
  avisoFinal?: boolean;
  nota: string | null;
  /** Si viene, marca la tarea "Seguimiento con el dueño" de la semana del Pipeline. */
  tarea?: string;
}) {
  const fecha = fechaRegistroUY();
  const base = {
    contactoId: opts.contactoId,
    agenteId: opts.agenteId,
    fecha,
    canal: "WHATSAPP",
    respondio: opts.respondio,
    avisoFinal: opts.avisoFinal ?? false,
    nota: opts.nota,
  };

  if (opts.props.length === 0) {
    // Contacto sin propiedades (comprador, inquilino…): el próximo, en 7 días.
    await db.insert(seguimientos).values({
      ...base,
      proximaFecha: new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + DIAS_ENTRE_SEGUIMIENTOS, 10, 0),
    });
  }

  for (const p of opts.props) {
    // Sin frecuencia elegida: el seguimiento semanal la deja semanal.
    const frecuencia = esFrecuencia(p.frecuenciaSeguimiento) ? p.frecuenciaSeguimiento : 7;
    if (!esFrecuencia(p.frecuenciaSeguimiento)) {
      await db.update(propiedades).set({ frecuenciaSeguimiento: 7 }).where(eq(propiedades.id, p.id));
    }
    const proxLunes = proximoLunesQueToca(fecha, p.fechaInicioPipeline, frecuencia);
    await db.insert(seguimientos).values({
      ...base,
      propiedadId: p.id,
      proximaFecha: new Date(proxLunes.getFullYear(), proxLunes.getMonth(), proxLunes.getDate(), 10, 0),
    });
    if (opts.tarea) {
      await db.insert(pipelineAcciones).values({
        propiedadId: p.id,
        agenteId: opts.agenteId,
        categoria: "SEGUIMIENTO_DUENO",
        semana: semanaActual(diasEnMercado(p.fechaInicioPipeline), p.operacion),
        descripcion: opts.tarea,
        nota: opts.nota,
      });
    }
  }

  // Respondió: el contacto deja de estar frío.
  if (opts.respondio) {
    await db.update(contactos).set({ frioDesde: null }).where(eq(contactos.id, opts.contactoId));
  }
}

/** Cambia el precio (y el precio escrito en título/descripción) y lo deja en el historial. */
export async function aplicarAjustePrecio(
  propiedadId: string,
  precio: number,
  moneda: "USD" | "UYU",
  agenteId: string
) {
  const [actual] = await db
    .select({
      precio: propiedades.precio,
      moneda: propiedades.moneda,
      titulo: propiedades.titulo,
      descripcion: propiedades.descripcion,
    })
    .from(propiedades)
    .where(eq(propiedades.id, propiedadId));

  // El precio viejo escrito en el título y la descripción también se actualiza.
  let titulo = actual?.titulo;
  let descripcion = actual?.descripcion ?? null;
  if (actual?.precio) {
    const ant = { precio: actual.precio, moneda: actual.moneda };
    const nue = { precio: precio, moneda: moneda };
    if (titulo) titulo = reemplazarPrecio(titulo, ant, nue).texto;
    if (descripcion) descripcion = reemplazarPrecio(descripcion, ant, nue).texto;
  }

  await db.insert(historialPrecios).values({
    propiedadId,
    precioAnterior: actual?.precio ?? null,
    monedaAnterior: actual?.moneda ?? null,
    precioNuevo: precio,
    monedaNueva: moneda,
    agenteId: agenteId,
  });

  await db
    .update(propiedades)
    .set({ precio: precio, moneda: moneda, titulo, descripcion })
    .where(eq(propiedades.id, propiedadId));
}
