"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { comisiones, reservasAlquiler, reservasVenta, usuarios } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";

export async function marcarComisionPagada(comisionId: string, pagada: boolean) {
  const sesion = await obtenerSesion();
  if (!sesion || !esCEO(sesion.rol)) return;

  await db
    .update(comisiones)
    .set({ pagada, fechaPago: pagada ? new Date() : null })
    .where(eq(comisiones.id, comisionId));

  revalidatePath("/comisiones");
}

// Edición manual de comisiones (cambios, operaciones compartidas, etc.):
// solo la CEO.
export type DatosComision = {
  /** Usuario que cobra; null = gastos/empresa. */
  beneficiarioId: string | null;
  concepto: string;
  porcentaje: number;
  monto: number;
};

async function validar(d: DatosComision): Promise<string | null> {
  if (!d.concepto.trim()) return "Escribí el concepto.";
  if (!Number.isFinite(d.monto) || d.monto < 0) return "El monto tiene que ser un número.";
  if (!Number.isFinite(d.porcentaje) || d.porcentaje < 0 || d.porcentaje > 100) return "El % tiene que estar entre 0 y 100.";
  if (d.beneficiarioId) {
    const [u] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.id, d.beneficiarioId));
    if (!u) return "Ese usuario no existe.";
  }
  return null;
}

export async function editarComision(comisionId: string, d: DatosComision): Promise<{ error?: string }> {
  const sesion = await obtenerSesion();
  if (!sesion || !esCEO(sesion.rol)) return { error: "Solo la CEO puede modificar comisiones." };
  const error = await validar(d);
  if (error) return { error };
  await db
    .update(comisiones)
    .set({
      beneficiarioId: d.beneficiarioId,
      concepto: d.concepto.trim(),
      porcentaje: d.porcentaje,
      monto: Math.round(d.monto),
    })
    .where(eq(comisiones.id, comisionId));
  revalidatePath("/comisiones");
  return {};
}

export async function eliminarComision(comisionId: string): Promise<{ error?: string }> {
  const sesion = await obtenerSesion();
  if (!sesion || !esCEO(sesion.rol)) return { error: "Solo la CEO puede modificar comisiones." };
  await db.delete(comisiones).where(eq(comisiones.id, comisionId));
  revalidatePath("/comisiones");
  return {};
}

/** Agrega una línea a una operación ("V:<id reserva venta>" o "A:<id reserva alquiler>"). */
export async function agregarComision(operacion: string, d: DatosComision): Promise<{ error?: string }> {
  const sesion = await obtenerSesion();
  if (!sesion || !esCEO(sesion.rol)) return { error: "Solo la CEO puede modificar comisiones." };
  const error = await validar(d);
  if (error) return { error };
  const [tipo, id] = operacion.split(":");
  if (tipo === "V") {
    const [r] = await db.select({ id: reservasVenta.id }).from(reservasVenta).where(eq(reservasVenta.id, id ?? ""));
    if (!r) return { error: "Elegí la operación." };
  } else if (tipo === "A") {
    const [r] = await db.select({ id: reservasAlquiler.id }).from(reservasAlquiler).where(eq(reservasAlquiler.id, id ?? ""));
    if (!r) return { error: "Elegí la operación." };
  } else {
    return { error: "Elegí la operación." };
  }
  await db.insert(comisiones).values({
    tipoOperacion: tipo === "V" ? "VENTA" : "ALQUILER",
    reservaVentaId: tipo === "V" ? id : null,
    reservaAlquilerId: tipo === "A" ? id : null,
    beneficiarioId: d.beneficiarioId,
    concepto: d.concepto.trim(),
    porcentaje: d.porcentaje,
    monto: Math.round(d.monto),
  });
  revalidatePath("/comisiones");
  return {};
}
