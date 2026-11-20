"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reservasVenta } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";
import {
  ESTADOS_RESERVA_VENTA,
  ESTADOS_VENTA_QUE_GENERAN_COMISION,
  type EstadoReservaVenta,
} from "@/lib/reservas";
import { generarComisionesReserva } from "@/lib/comisiones";
import { leerReparto } from "@/lib/reparto-reserva-form";
import { esQuienPaga, esTipoComision, partesDeComision } from "@/lib/reparto-reserva";
import { registrar } from "@/lib/registro-actividad";
import { ESTADO_RESERVA_VENTA_LABEL } from "@/lib/reservas";

const ReservaVentaSchema = z.object({
  nombrePropiedad: z.string().min(2, "Ingresá el nombre o dirección de la propiedad"),
  codigoExterno: z.string().optional(),
  linkPublicacion: z.string().optional(),
  vendedorNombre: z.string().optional(),
  vendedorTelefono: z.string().optional(),
  vendedorCedula: z.string().optional(),
  compradorNombre: z.string().optional(),
  compradorTelefono: z.string().optional(),
  compradorCedula: z.string().optional(),
  precioCierre: z.coerce.number().positive("Ingresá el precio de cierre"),
  porcentajePorParte: z.coerce.number().min(0).max(100),
  comisionVendedor: z.coerce.number().optional(),
  comisionComprador: z.coerce.number().optional(),
  senaUsd: z.coerce.number().optional(),
  fechaReserva: z.string().optional(),
  fechaBoleto: z.string().optional(),
  fechaEscritura: z.string().optional(),
  escribanoVendedor: z.string().optional(),
  escribanoComprador: z.string().optional(),
  notas: z.string().optional(),
});

export type ReservaVentaState = { error?: string; ok?: number };

function aFecha(v: string | undefined) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function crearReservaVenta(
  _prevState: ReservaVentaState,
  formData: FormData
): Promise<ReservaVentaState> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };

  const parsed = ReservaVentaSchema.safeParse({
    nombrePropiedad: formData.get("nombrePropiedad"),
    codigoExterno: formData.get("codigoExterno") || undefined,
    linkPublicacion: formData.get("linkPublicacion") || undefined,
    vendedorNombre: formData.get("vendedorNombre") || undefined,
    vendedorTelefono: formData.get("vendedorTelefono") || undefined,
    vendedorCedula: formData.get("vendedorCedula") || undefined,
    compradorNombre: formData.get("compradorNombre") || undefined,
    compradorTelefono: formData.get("compradorTelefono") || undefined,
    compradorCedula: formData.get("compradorCedula") || undefined,
    precioCierre: formData.get("precioCierre"),
    porcentajePorParte: formData.get("porcentajePorParte") || 3,
    comisionVendedor: formData.get("comisionVendedor") || undefined,
    comisionComprador: formData.get("comisionComprador") || undefined,
    senaUsd: formData.get("senaUsd") || undefined,
    fechaReserva: formData.get("fechaReserva") || undefined,
    fechaBoleto: formData.get("fechaBoleto") || undefined,
    fechaEscritura: formData.get("fechaEscritura") || undefined,
    escribanoVendedor: formData.get("escribanoVendedor") || undefined,
    escribanoComprador: formData.get("escribanoComprador") || undefined,
    notas: formData.get("notas") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const d = parsed.data;
  const reparto = await leerReparto(formData, sesion);
  if ("error" in reparto) return { error: reparto.error };

  await db.insert(reservasVenta).values({
    ...reparto.datos,
    nombrePropiedad: d.nombrePropiedad,
    codigoExterno: d.codigoExterno ?? null,
    linkPublicacion: d.linkPublicacion ?? null,
    vendedorNombre: d.vendedorNombre ?? null,
    vendedorTelefono: d.vendedorTelefono ?? null,
    vendedorCedula: d.vendedorCedula ?? null,
    compradorNombre: d.compradorNombre ?? null,
    compradorTelefono: d.compradorTelefono ?? null,
    compradorCedula: d.compradorCedula ?? null,
    precioCierre: Math.round(d.precioCierre),
    porcentajePorParte: d.porcentajePorParte,
    comisionVendedor: d.comisionVendedor != null ? Math.round(d.comisionVendedor) : null,
    comisionComprador: d.comisionComprador != null ? Math.round(d.comisionComprador) : null,
    senaUsd: d.senaUsd != null ? Math.round(d.senaUsd) : null,
    fechaReserva: aFecha(d.fechaReserva),
    fechaBoleto: aFecha(d.fechaBoleto),
    fechaEscritura: aFecha(d.fechaEscritura),
    escribanoVendedor: d.escribanoVendedor ?? null,
    escribanoComprador: d.escribanoComprador ?? null,
    notas: d.notas ?? null,
    // La reserva queda a nombre del agente que la cerró o aportó la propiedad.
    agenteId: reparto.datos.agentePropiedadId,
  });

  await registrar("Cargó una reserva de venta", { detalle: d.nombrePropiedad });
  revalidatePath("/reservas/ventas");
  revalidatePath("/reservas");
  return { ok: Date.now() };
}

export async function cambiarEstadoReservaVenta(
  reservaId: string,
  nuevoEstado: EstadoReservaVenta
) {
  const sesion = await obtenerSesion();
  if (!sesion) return;
  if (!ESTADOS_RESERVA_VENTA.includes(nuevoEstado)) return;

  const [reserva] = await db
    .select()
    .from(reservasVenta)
    .where(eq(reservasVenta.id, reservaId));
  if (!reserva) return;

  // La mueven los agentes de la reserva o la CEO.
  if (
    ![reserva.agenteId, reserva.agentePropiedadId, reserva.agenteClienteId].includes(sesion.userId) &&
    !esCEO(sesion.rol)
  )
    return;

  await db
    .update(reservasVenta)
    .set({
      estado: nuevoEstado,
      ...(nuevoEstado === "BOLETO" && !reserva.fechaBoleto ? { fechaBoleto: new Date() } : {}),
      ...(nuevoEstado === "ESCRITURADA" && !reserva.fechaEscritura
        ? { fechaEscritura: new Date() }
        : {}),
    })
    .where(eq(reservasVenta.id, reservaId));

  const generaComision =
    ESTADOS_VENTA_QUE_GENERAN_COMISION.includes(nuevoEstado) && !reserva.comisionesGeneradas;

  if (generaComision) {
    const porDefecto = Math.round((reserva.precioCierre * reserva.porcentajePorParte) / 100);
    const generadas = await generarComisionesReserva({
      tipo: "VENTA",
      reservaVentaId: reserva.id,
      partes: partesDeComision({
        operacion: "VENTA",
        tipoComision: esTipoComision(reserva.tipoComision) ? reserva.tipoComision : "ENTERA",
        quienPaga: esQuienPaga(reserva.quienPaga) ? reserva.quienPaga : "AMBAS",
        agentePropiedadId: reserva.agentePropiedadId ?? reserva.agenteId,
        agenteClienteId: reserva.agenteClienteId,
        comisionPropiedad: reserva.comisionVendedor ?? porDefecto,
        comisionCliente: reserva.comisionComprador ?? porDefecto,
      }),
    });

    if (generadas) {
      await db
        .update(reservasVenta)
        .set({ comisionesGeneradas: true })
        .where(eq(reservasVenta.id, reservaId));
    }
  }

  await registrar("Cambió el estado de una reserva de venta", { entidad: "reserva_venta", id: reservaId, detalle: ESTADO_RESERVA_VENTA_LABEL[nuevoEstado] ?? nuevoEstado });
  revalidatePath("/reservas/ventas");
  revalidatePath("/reservas");
  revalidatePath("/comisiones");
}

/** Cambiar entera/compartida, agentes o quién paga, mientras no se generaron las comisiones. */
export async function guardarRepartoVenta(reservaId: string, formData: FormData): Promise<{ error?: string }> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };
  const [reserva] = await db.select().from(reservasVenta).where(eq(reservasVenta.id, reservaId));
  if (!reserva) return { error: "No existe esa reserva." };
  if (
    ![reserva.agenteId, reserva.agentePropiedadId, reserva.agenteClienteId].includes(sesion.userId) &&
    !esCEO(sesion.rol)
  )
    return { error: "Solo los agentes de la reserva o la CEO pueden cambiarla." };
  if (reserva.comisionesGeneradas) return { error: "Las comisiones ya se generaron: cambialas desde Comisiones." };
  const reparto = await leerReparto(formData, sesion);
  if ("error" in reparto) return { error: reparto.error };
  const extra: { comisionVendedor?: number; comisionComprador?: number } = {};
  if (reparto.datos.quienPaga === "CLIENTE") extra.comisionVendedor = 0;
  if (reparto.datos.quienPaga === "PROPIETARIO") extra.comisionComprador = 0;
  // Si antes no pagaba una punta y ahora sí, vuelve al % por parte.
  if (reparto.datos.quienPaga !== "CLIENTE" && reserva.comisionVendedor === 0) extra.comisionVendedor = undefined;
  if (reparto.datos.quienPaga !== "PROPIETARIO" && reserva.comisionComprador === 0) extra.comisionComprador = undefined;
  await db
    .update(reservasVenta)
    .set({
      ...reparto.datos,
      ...("comisionVendedor" in extra ? { comisionVendedor: extra.comisionVendedor ?? null } : {}),
      ...("comisionComprador" in extra ? { comisionComprador: extra.comisionComprador ?? null } : {}),
    })
    .where(eq(reservasVenta.id, reservaId));
  await registrar("Cambió el reparto de una reserva de venta", { entidad: "reserva_venta", id: reservaId, detalle: reparto.datos.tipoComision === "COMPARTIDA" ? "Compartida" : "Entera" });
  revalidatePath("/reservas/ventas");
  return {};
}
