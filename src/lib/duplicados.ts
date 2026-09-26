import { eq, isNotNull, or } from "drizzle-orm";
import { db } from "@/db";
import { contactos, usuarios } from "@/db/schema";

// Aviso de contactos repetidos: antes de crear un contacto se busca si ya
// existe alguien con el mismo teléfono (o el mismo email), en todo el equipo.

/**
 * Deja solo los últimos 8 dígitos del teléfono, así "099 123 456",
 * "+598 99 123 456" y "99123456" se reconocen como el mismo número.
 */
export function normalizarTelefono(tel: string | null | undefined): string | null {
  if (!tel) return null;
  const digitos = tel.replace(/\D/g, "");
  if (digitos.length < 6) return null;
  return digitos.length > 8 ? digitos.slice(-8) : digitos;
}

export type Duplicado = {
  id: string;
  nombre: string;
  propio: boolean;
  agente: string;
  motivo: "teléfono" | "email";
  archivado: boolean;
};

export async function buscarDuplicados(
  yo: string,
  telefono?: string | null,
  email?: string | null
): Promise<Duplicado[]> {
  const tel = normalizarTelefono(telefono);
  const mail = email?.trim().toLowerCase() || null;
  if (!tel && !mail) return [];

  const filas = await db
    .select({
      id: contactos.id,
      nombre: contactos.nombre,
      telefono: contactos.telefono,
      email: contactos.email,
      archivado: contactos.archivado,
      agenteId: contactos.agenteId,
      agente: usuarios.nombre,
    })
    .from(contactos)
    .innerJoin(usuarios, eq(contactos.agenteId, usuarios.id))
    .where(or(isNotNull(contactos.telefono), isNotNull(contactos.email)));

  const out: Duplicado[] = [];
  for (const c of filas) {
    let motivo: Duplicado["motivo"] | null = null;
    if (tel && normalizarTelefono(c.telefono) === tel) motivo = "teléfono";
    else if (mail && c.email?.trim().toLowerCase() === mail) motivo = "email";
    if (!motivo) continue;
    out.push({
      id: c.id,
      nombre: c.nombre,
      propio: c.agenteId === yo,
      agente: c.agente,
      motivo,
      archivado: c.archivado,
    });
  }
  // Primero los propios.
  return out.sort((a, b) => Number(b.propio) - Number(a.propio)).slice(0, 5);
}
