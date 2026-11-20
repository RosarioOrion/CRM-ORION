"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reservasAlquiler } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";
import { ESTADOS_RESERVA_ALQUILER, type EstadoReservaAlquiler } from "@/lib/reservas";
import { generarComisionesReserva } from "@/lib/comisiones";
import { leerReparto } from "@/lib/reparto-reserva-form";
import { esOrionAporta, esQuienPaga, esTipoComision, partesDeComision } from "@/lib/reparto-reserva";
import { registrar } from "@/lib/registro-actividad";
import { ESTADO_RESERVA_ALQUILER_LABEL } from "@/lib/reservas";

const ReservaAlquilerSchema = z.object({
  nombrePropiedad: z.string().min(2, "Ingresá el nombre o dirección de la propiedad"),
  codigoExterno: z.string().optional(),
  linkPublicacion: z.string().optional(),
  propietarioNombre: z.string().optional(),
  propietarioTelefono: z.string().optional(),
  propietarioCedula: z.string().optional(),
  inquilinoNombre: z.string().optional(),
  inquilinoTelefono: z.string().optional(),
  inquilinoCedula: z.string().optional(),
  precioMensual: z.coerce.number().optional(),
  moneda: z.enum(["UYU", "USD"]),
  duracionMeses: z.coerce.number().optional(),
  fechaReserva: z.string().optional(),
  fechaFirma: z.string().optional(),
  garantia: z.string().optional(),
  escribano: z.string().optional(),
  comisionTotalUsd: z.coerce.number().optional(),
  comisionPropietarioUsd: z.coerce.number().min(0).optional(),
  comisionInquilinoUsd: z.coerce.number().min(0).optional(),
  notas: z.string().optional(),
});

export type ReservaAlquilerState = { error?: string; ok?: number };

function aFecha(v: string | undefined) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function crearReservaAlquiler(
  _prevState: ReservaAlquilerState,
  formData: FormData
): Promise<ReservaAlquilerState> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };

  const parsed = ReservaAlquilerSchema.safeParse({
    nombrePropiedad: formData.get("nombrePropiedad"),
    codigoExterno: formData.get("codigoExterno") || undefined,
    linkPublicacion: formData.get("linkPublicacion") || undefined,
    propietarioNombre: formData.get("propietarioNombre") || undefined,
    propietarioTelefono: formData.get("propietarioTelefono") || undefined,
    propietarioCedula: formData.get("propietarioCedula") || undefined,
    inquilinoNombre: formData.get("inquilinoNombre") || undefined,
    inquilinoTelefono: formData.get("inquilinoTelefono") || undefined,
    inquilinoCedula: formData.get("inquilinoCedula") || undefined,
    precioMensual: formData.get("precioMensual") || undefined,
    moneda: formData.get("moneda") || "UYU",
    duracionMeses: formData.get("duracionMeses") || undefined,
    fechaReserva: formData.get("fechaReserva") || undefined,
    fechaFirma: formData.get("fechaFirma") || undefined,
    garantia: formData.get("garantia") || undefined,
    escribano: formData.get("escribano") || undefined,
    comisionTotalUsd: formData.get("comisionTotalUsd") || undefined,
    comisionPropietarioUsd: formData.get("comisionPropietarioUsd") || undefined,
    comisionInquilinoUsd: formData.get("comisionInquilinoUsd") || undefined,
    notas: formData.get("notas") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const d = parsed.data;
  const reparto = await leerReparto(formData, sesion);
  if ("error" in reparto) return { error: reparto.error };
  const paga = reparto.datos.quienPaga;
  const comProp = paga === "CLIENTE" ? 0 : d.comisionPropietarioUsd != null ? Math.round(d.comisionPropietarioUsd) : null;
  const comInq = paga === "PROPIETARIO" ? 0 : d.comisionInquilinoUsd != null ? Math.round(d.comisionInquilinoUsd) : null;
  const total =
    comProp != null || comInq != null
      ? (comProp ?? 0) + (comInq ?? 0)
      : d.comisionTotalUsd != null
        ? Math.round(d.comisionTotalUsd)
        : null;

  await db.insert(reservasAlquiler).values({
    ...reparto.datos,
    comisionPropietarioUsd: comProp,
    comisionInquilinoUsd: comInq,
    nombrePropiedad: d.nombrePropiedad,
    codigoExterno: d.codigoExterno ?? null,
    linkPublicacion: d.linkPublicacion ?? null,
    propietarioNombre: d.propietarioNombre ?? null,
    propietarioTelefono: d.propietarioTelefono ?? null,
    propietarioCedula: d.propietarioCedula ?? null,
    inquilinoNombre: d.inquilinoNombre ?? null,
    inquilinoTelefono: d.inquilinoTelefono ?? null,
    inquilinoCedula: d.inquilinoCedula ?? null,
    precioMensual: d.precioMensual != null ? Math.round(d.precioMensual) : null,
    moneda: d.moneda,
    duracionMeses: d.duracionMeses != null ? Math.round(d.duracionMeses) : null,
    fechaReserva: aFecha(d.fechaReserva),
    fechaFirma: aFecha(d.fechaFirma),
    garantia: d.garantia ?? null,
    escribano: d.escribano ?? null,
    comisionTotalUsd: total || null,
    notas: d.notas ?? null,
    agenteId: reparto.datos.agentePropiedadId,
  });

  await registrar("Cargó una reserva de alquiler", { detalle: d.nombrePropiedad });
  revalidatePath("/reservas/alquileres");
  revalidatePath("/reservas");
  return { ok: Date.now() };
}

export async function cambiarEstadoReservaAlquiler(
  reservaId: string,
  nuevoEstado: EstadoReservaAlquiler
) {
  const sesion = await obtenerSesion();
  if (!sesion) return;
  if (!ESTADOS_RESERVA_ALQUILER.includes(nuevoEstado)) return;

  const [reserva] = await db
    .select()
    .from(reservasAlquiler)
    .where(eq(reservasAlquiler.id, reservaId));
  if (!reserva) return;

  const admin = esCEO(sesion.rol);
  if (![reserva.agenteId, reserva.agentePropiedadId, reserva.agenteClienteId].includes(sesion.userId) && !admin) return;

  // "La firma del alquiler la marca Dirección" — igual que en Lumen OS,
  // solo un team leader/administrador puede pasar una reserva a Firmada.
  if (nuevoEstado === "FIRMADA" && !admin) return;

  await db
    .update(reservasAlquiler)
    .set({
      estado: nuevoEstado,
      ...(nuevoEstado === "FIRMADA" && !reserva.fechaFirma ? { fechaFirma: new Date() } : {}),
    })
    .where(eq(reservasAlquiler.id, reservaId));

  if (
    nuevoEstado === "FIRMADA" &&
    !reserva.comisionesGeneradas &&
    reserva.comisionTotalUsd
  ) {
    // Reservas viejas: solo el total → se toma como pagado por el inquilino.
    const porPuntas = reserva.comisionPropietarioUsd != null || reserva.comisionInquilinoUsd != null;
    const generadas = await generarComisionesReserva({
      tipo: "ALQUILER",
      reservaAlquilerId: reserva.id,
      partes: partesDeComision({
        operacion: "ALQUILER",
        tipoComision: esTipoComision(reserva.tipoComision) ? reserva.tipoComision : "ENTERA",
        quienPaga: porPuntas ? (esQuienPaga(reserva.quienPaga) ? reserva.quienPaga : "AMBAS") : "CLIENTE",
        agentePropiedadId: reserva.agentePropiedadId ?? reserva.agenteId,
        agenteClienteId: reserva.agenteClienteId,
        otraInmobiliaria: reserva.otraInmobiliaria,
        orionAporta: esOrionAporta(reserva.orionAporta) ? reserva.orionAporta : null,
        comisionPropiedad: porPuntas ? reserva.comisionPropietarioUsd ?? 0 : 0,
        comisionCliente: porPuntas ? reserva.comisionInquilinoUsd ?? 0 : reserva.comisionTotalUsd,
      }),
    });

    if (generadas) {
      await db
        .update(reservasAlquiler)
        .set({ comisionesGeneradas: true })
        .where(eq(reservasAlquiler.id, reservaId));
    }
  }

  await registrar("Cambió el estado de una reserva de alquiler", { entidad: "reserva_alquiler", id: reservaId, detalle: ESTADO_RESERVA_ALQUILER_LABEL[nuevoEstado] ?? nuevoEstado });
  revalidatePath("/reservas/alquileres");
  revalidatePath("/reservas");
  revalidatePath("/comisiones");
}

/** Cambiar entera/compartida, agentes o quién paga, mientras no se generaron las comisiones. */
export async function guardarRepartoAlquiler(reservaId: string, formData: FormData): Promise<{ error?: string }> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };
  const [reserva] = await db.select().from(reservasAlquiler).where(eq(reservasAlquiler.id, reservaId));
  if (!reserva) return { error: "No existe esa reserva." };
  if (
    ![reserva.agenteId, reserva.agentePropiedadId, reserva.agenteClienteId].includes(sesion.userId) &&
    !esCEO(sesion.rol)
  )
    return { error: "Solo los agentes de la reserva o la CEO pueden cambiarla." };
  if (reserva.comisionesGeneradas) return { error: "Las comisiones ya se generaron: cambialas desde Comisiones." };
  const reparto = await leerReparto(formData, sesion);
  if ("error" in reparto) return { error: reparto.error };
  const leer = (k: string, actual: number | null) => {
    const v = formData.get(k);
    return v === null || v === "" ? actual : Math.max(0, Math.round(Number(v)) || 0);
  };
  const paga = reparto.datos.quienPaga;
  const comProp = paga === "CLIENTE" ? 0 : leer("comisionPropietarioUsd", reserva.comisionPropietarioUsd);
  const comInq = paga === "PROPIETARIO" ? 0 : leer("comisionInquilinoUsd", reserva.comisionInquilinoUsd);
  const porPuntas = comProp != null || comInq != null;
  await db
    .update(reservasAlquiler)
    .set({
      ...reparto.datos,
      ...(porPuntas
        ? { comisionPropietarioUsd: comProp, comisionInquilinoUsd: comInq, comisionTotalUsd: (comProp ?? 0) + (comInq ?? 0) || null }
        : {}),
    })
    .where(eq(reservasAlquiler.id, reservaId));
  await registrar("Cambió el reparto de una reserva de alquiler", { entidad: "reserva_alquiler", id: reservaId, detalle: reparto.datos.tipoComision === "COMPARTIDA" ? "Compartida" : "Entera" });
  revalidatePath("/reservas/alquileres");
  return {};
}
