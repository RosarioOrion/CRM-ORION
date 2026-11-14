"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { usuarios, nivelesComision } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { esCEO } from "@/lib/permisos";
import { numeroWhatsApp } from "@/lib/seguimientos";

// Gestionar usuarios (aprobar, crear, editar, roles, equipos, estado,
// nivel, eliminar) es solo de la CEO.
async function requerirAdmin() {
  const sesion = await obtenerSesion();
  if (!sesion || !esCEO(sesion.rol)) {
    throw new Error("No autorizado.");
  }
  return sesion;
}

export async function aprobarUsuario(usuarioId: string) {
  await requerirAdmin();
  await db
    .update(usuarios)
    .set({ aprobado: true })
    .where(eq(usuarios.id, usuarioId));
  revalidatePath("/admin/usuarios");
}

export async function rechazarUsuario(usuarioId: string) {
  await requerirAdmin();
  // Una solicitud rechazada no tiene por qué quedar en la base: nunca
  // tuvo acceso real, así que se elimina directamente.
  await db.delete(usuarios).where(eq(usuarios.id, usuarioId));
  revalidatePath("/admin/usuarios");
}

const ROLES = ["AGENTE", "TEAM_LEADER", "ADMINISTRADOR"] as const;

/** El rol CEO no se asigna ni se quita desde acá (es uno solo: la fundadora). */
export async function cambiarRolUsuario(usuarioId: string, rol: string) {
  const sesion = await requerirAdmin();
  if (!ROLES.includes(rol as (typeof ROLES)[number])) return;
  if (usuarioId === sesion.userId) return;
  const [u] = await db.select({ rol: usuarios.rol }).from(usuarios).where(eq(usuarios.id, usuarioId));
  if (!u || u.rol === "CEO") return;
  await db.update(usuarios).set({ rol: rol as (typeof ROLES)[number] }).where(eq(usuarios.id, usuarioId));
  revalidatePath("/admin/usuarios");
  revalidatePath("/", "layout");
}

// Quién puede tener a cargo a cada rol: un Agente a un Líder, Administrador
// o la CEO; un Líder a un Administrador o la CEO; un Administrador a la CEO.
const RESPONSABLES_VALIDOS: Record<string, string[]> = {
  AGENTE: ["TEAM_LEADER", "ADMINISTRADOR", "CEO"],
  TEAM_LEADER: ["ADMINISTRADOR", "CEO"],
  ADMINISTRADOR: ["CEO"],
};

/** Equipos: asigna el responsable directo de un usuario (o lo deja sin asignar). */
export async function cambiarResponsable(
  usuarioId: string,
  responsableId: string | null
): Promise<{ error?: string }> {
  await requerirAdmin();
  const [u] = await db.select({ rol: usuarios.rol }).from(usuarios).where(eq(usuarios.id, usuarioId));
  if (!u || u.rol === "CEO") return { error: "A la CEO no se le asigna responsable." };
  if (responsableId) {
    if (responsableId === usuarioId) return { error: "No puede ser su propio responsable." };
    const [r] = await db.select({ rol: usuarios.rol }).from(usuarios).where(eq(usuarios.id, responsableId));
    if (!r || !RESPONSABLES_VALIDOS[u.rol]?.includes(r.rol)) {
      return { error: "Ese usuario no puede tenerlo a cargo por su rol." };
    }
    // Evitar ciclos: el responsable no puede estar a cargo de este usuario.
    const lista = await db.select({ id: usuarios.id, teamLeaderId: usuarios.teamLeaderId }).from(usuarios);
    let actual: string | null = responsableId;
    for (let i = 0; actual && i < lista.length; i++) {
      if (actual === usuarioId) return { error: "Eso armaría un círculo en los equipos." };
      actual = lista.find((x) => x.id === actual)?.teamLeaderId ?? null;
    }
  }
  await db.update(usuarios).set({ teamLeaderId: responsableId }).where(eq(usuarios.id, usuarioId));
  revalidatePath("/admin/usuarios");
  return {};
}

/**
 * Eliminar un usuario: solo si no tiene nada cargado (contactos,
 * propiedades, captaciones, reservas, comisiones…). Si tiene historial se
 * lo desactiva, para no perder datos.
 */
export async function eliminarUsuario(usuarioId: string): Promise<{ error?: string; ok?: boolean }> {
  const sesion = await requerirAdmin();
  if (usuarioId === sesion.userId) return { error: "No te podés eliminar a vos misma." };
  const [u] = await db.select({ rol: usuarios.rol }).from(usuarios).where(eq(usuarios.id, usuarioId));
  if (!u) return { ok: true };
  if (u.rol === "CEO") return { error: "La CEO no se puede eliminar." };
  try {
    await db.transaction(async (tx) => {
      await tx.update(usuarios).set({ teamLeaderId: null }).where(eq(usuarios.teamLeaderId, usuarioId));
      await tx.delete(usuarios).where(eq(usuarios.id, usuarioId));
    });
  } catch {
    return {
      error:
        "Tiene datos cargados en Orion (contactos, propiedades, visitas…), así que no se puede eliminar sin perderlos. Desactivalo: no va a poder entrar y su historial queda.",
    };
  }
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function cambiarNivelComisionUsuario(usuarioId: string, nivel: string) {
  await requerirAdmin();
  const [existe] = await db
    .select({ clave: nivelesComision.clave })
    .from(nivelesComision)
    .where(eq(nivelesComision.clave, nivel));
  if (!existe) return;
  await db
    .update(usuarios)
    .set({ nivelComision: nivel })
    .where(eq(usuarios.id, usuarioId));
  revalidatePath("/admin/usuarios");
}

export async function cambiarEstadoUsuario(usuarioId: string, activo: boolean) {
  const sesion = await requerirAdmin();
  if (usuarioId === sesion.userId) {
    // No te podés desactivar a vos misma por accidente desde acá.
    return;
  }
  await db
    .update(usuarios)
    .set({ activo })
    .where(eq(usuarios.id, usuarioId));
  revalidatePath("/admin/usuarios");
}

const NuevoUsuarioSchema = z.object({
  nombre: z.string().min(2, "Ingresá el nombre"),
  email: z.string().email("Ingresá un email válido"),
  telefono: z.string().optional(),
  descripcion: z.string().optional(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  rol: z.enum(ROLES),
});

export type NuevoUsuarioState = { error?: string; ok?: number };

export async function crearUsuarioAdmin(
  _prevState: NuevoUsuarioState,
  formData: FormData
): Promise<NuevoUsuarioState> {
  try {
    await requerirAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No autorizado." };
  }

  const parsed = NuevoUsuarioSchema.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    telefono: formData.get("telefono") || undefined,
    descripcion: formData.get("descripcion") || undefined,
    password: formData.get("password"),
    rol: formData.get("rol") || "AGENTE",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const [existente] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1);
  if (existente) {
    return { error: "Ya existe una cuenta con ese email." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await db.insert(usuarios).values({
    nombre: parsed.data.nombre,
    email,
    telefono: parsed.data.telefono ?? null,
    descripcion: parsed.data.descripcion ?? null,
    passwordHash,
    rol: parsed.data.rol,
    aprobado: true,
  });

  revalidatePath("/admin/usuarios");
  return { ok: Date.now() };
}

const EditarUsuarioSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresá el nombre"),
  email: z.string().trim().email("Ingresá un email válido"),
  telefono: z.string().trim().optional(),
  descripcion: z.string().trim().optional(),
});

export type EditarUsuarioState = { error?: string; ok?: number };

// Editar los datos de un usuario desde Usuarios (admin / team leader).
// El celular es el que usan los botones de WhatsApp de sus propiedades.
export async function editarUsuarioAdmin(
  usuarioId: string,
  _prevState: EditarUsuarioState,
  formData: FormData
): Promise<EditarUsuarioState> {
  try {
    await requerirAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No autorizado." };
  }

  const parsed = EditarUsuarioSchema.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    telefono: formData.get("telefono") || undefined,
    descripcion: formData.get("descripcion") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const telefono = parsed.data.telefono || null;
  if (telefono && !numeroWhatsApp(telefono)) {
    return { error: "El celular no parece válido. Escribilo así: 099 123 456." };
  }

  const email = parsed.data.email.toLowerCase();
  const [otro] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1);
  if (otro && otro.id !== usuarioId) {
    return { error: "Ya existe otra cuenta con ese email." };
  }

  await db
    .update(usuarios)
    .set({
      nombre: parsed.data.nombre,
      email,
      telefono,
      descripcion: parsed.data.descripcion || null,
    })
    .where(eq(usuarios.id, usuarioId));

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${usuarioId}`);
  return { ok: Date.now() };
}
