"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reservasAlquiler, usuarios, comisiones } from "@/db/schema";
import { obtenerSesion, esAdmin } from "@/lib/auth";
import { ESTADOS_RESERVA_ALQUILER, type EstadoReservaAlquiler } from "@/lib/reservas";
import { calcularReparto, obtenerNivelesComision, resolverNivel } from "@/lib/comisiones";

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
    notas: formData.get("notas") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const d = parsed.data;

  await db.insert(reservasAlquiler).values({
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
    comisionTotalUsd: d.comisionTotalUsd != null ? Math.round(d.comisionTotalUsd) : null,
    notas: d.notas ?? null,
    agenteId: sesion.userId,
  });

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

  const admin = esAdmin(sesion.rol);
  if (reserva.agenteId !== sesion.userId && !admin) return;

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
    const [agente] = await db
      .select({
        id: usuarios.id,
        nivelComision: usuarios.nivelComision,
        teamLeaderId: usuarios.teamLeaderId,
      })
      .from(usuarios)
      .where(eq(usuarios.id, reserva.agenteId));

    if (agente) {
      const niveles = await obtenerNivelesComision();
      const nivel = resolverNivel(agente.nivelComision, niveles);

      const lineas = nivel
        ? calcularReparto({
            comisionTotal: reserva.comisionTotalUsd,
            agenteId: agente.id,
            pctAgente: nivel.porcentaje,
            nivelLabel: nivel.nombre,
            teamLeaderId: agente.teamLeaderId,
          })
        : [];

      if (lineas.length > 0) {
        await db.insert(comisiones).values(
          lineas.map((l) => ({
            tipoOperacion: "ALQUILER" as const,
            reservaAlquilerId: reserva.id,
            beneficiarioId: l.beneficiarioId,
            concepto: l.concepto,
            porcentaje: l.porcentaje,
            monto: l.monto,
          }))
        );
      }

      await db
        .update(reservasAlquiler)
        .set({ comisionesGeneradas: true })
        .where(eq(reservasAlquiler.id, reservaId));
    }
  }

  revalidatePath("/reservas/alquileres");
  revalidatePath("/reservas");
  revalidatePath("/comisiones");
}
