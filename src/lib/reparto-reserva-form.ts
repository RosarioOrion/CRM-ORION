import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import type { SessionPayload } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";
import { esQuienPaga, esTipoComision, type QuienPaga, type TipoComision } from "@/lib/reparto-reserva";

// Lee y valida los campos de reparto de una reserva (formulario de alta o
// "Cambiar reparto"). Un agente solo puede cargar una reserva donde él sea
// uno de los agentes; la CEO puede cargarla a nombre de cualquiera.

export type DatosReparto = {
  tipoComision: TipoComision;
  quienPaga: QuienPaga;
  agentePropiedadId: string;
  agenteClienteId: string | null;
};

/** Usuarios que pueden figurar como agentes de una reserva. */
export async function usuariosParaReparto() {
  return db
    .select({ id: usuarios.id, nombre: usuarios.nombre, rol: usuarios.rol, teamLeaderId: usuarios.teamLeaderId })
    .from(usuarios)
    .where(and(eq(usuarios.activo, true), eq(usuarios.aprobado, true)))
    .orderBy(usuarios.nombre);
}

export async function leerReparto(
  formData: FormData,
  sesion: SessionPayload
): Promise<{ datos: DatosReparto } | { error: string }> {
  const tipo = formData.get("tipoComision");
  const paga = formData.get("quienPaga");
  const tipoComision: TipoComision = esTipoComision(tipo) ? tipo : "ENTERA";
  const quienPaga: QuienPaga = esQuienPaga(paga) ? paga : "AMBAS";
  const ceo = esCEO(sesion.rol);
  let agentePropiedadId = String(formData.get("agentePropiedadId") || "") || sesion.userId;
  let agenteClienteId = tipoComision === "COMPARTIDA" ? String(formData.get("agenteClienteId") || "") || null : null;

  if (tipoComision === "ENTERA" && !ceo) agentePropiedadId = sesion.userId;
  if (tipoComision === "COMPARTIDA") {
    if (!agenteClienteId) return { error: "Elegí el agente que aportó el cliente." };
    if (agenteClienteId === agentePropiedadId) return { error: "En una comisión compartida tienen que ser dos agentes distintos." };
    if (!ceo && agentePropiedadId !== sesion.userId && agenteClienteId !== sesion.userId) {
      return { error: "Vos tenés que ser uno de los dos agentes de la operación." };
    }
  }
  const validos = new Set((await usuariosParaReparto()).map((u) => u.id));
  if (!validos.has(agentePropiedadId) || (agenteClienteId && !validos.has(agenteClienteId))) {
    return { error: "Alguno de los agentes elegidos no está activo en Orion." };
  }
  if (tipoComision === "ENTERA") agenteClienteId = null;
  return { datos: { tipoComision, quienPaga, agentePropiedadId, agenteClienteId } };
}
