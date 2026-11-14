import "server-only";
import { cache } from "react";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import type { SessionPayload } from "@/lib/auth";

// Roles y equipos de Orion:
//   CEO            acceso total: todos los usuarios, contactos (con
//                  teléfono), propiedades y actividad. Es la única que
//                  gestiona usuarios (aprobar, roles, equipos, eliminar) y
//                  configura el CRM (Ajustes, mensajes, Novedades, Kaizen,
//                  Capacitación, herramientas de Admin).
//   Administrador  ve los datos de todos los usuarios; de su equipo ve la
//                  actividad, las propiedades y los contactos (sin teléfono
//                  ni email).
//   Líder          ve los datos de su equipo, su actividad, sus propiedades
//                  y sus contactos (sin teléfono ni email).
//   Agente         lo suyo para operar; de los demás solo las propiedades
//                  (sin datos del dueño), desde el buscador de Propiedades.
// El equipo de alguien son las personas que tiene a cargo, directa o
// indirectamente (usuarios.teamLeaderId = su responsable directo).

export type Rol = SessionPayload["rol"];

export const ROL_LABEL: Record<Rol, string> = {
  CEO: "CEO",
  ADMINISTRADOR: "Administrador",
  TEAM_LEADER: "Líder",
  AGENTE: "Agente",
};

export function esCEO(rol: Rol | null | undefined): boolean {
  return rol === "CEO";
}

/** Tiene gente a cargo: puede ver la actividad, propiedades y contactos de su equipo. */
export function esSupervisor(rol: Rol | null | undefined): boolean {
  return rol === "CEO" || rol === "ADMINISTRADOR" || rol === "TEAM_LEADER";
}

export type UsuarioEquipo = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  aprobado: boolean;
  teamLeaderId: string | null;
};

const todosLosUsuarios = cache(async (): Promise<UsuarioEquipo[]> =>
  db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
      aprobado: usuarios.aprobado,
      teamLeaderId: usuarios.teamLeaderId,
    })
    .from(usuarios)
    .orderBy(usuarios.nombre)
);

/** Las personas a cargo de `jefeId`, directa o indirectamente (sin él). */
export function aCargoDe(jefeId: string, lista: UsuarioEquipo[]): UsuarioEquipo[] {
  const out: UsuarioEquipo[] = [];
  const pendientes = [jefeId];
  const vistos = new Set(pendientes);
  while (pendientes.length) {
    const actual = pendientes.pop()!;
    for (const u of lista) {
      if (u.teamLeaderId === actual && !vistos.has(u.id)) {
        vistos.add(u.id);
        out.push(u);
        pendientes.push(u.id);
      }
    }
  }
  return out;
}

/**
 * Usuarios cuya actividad, propiedades y contactos puede ver `sesion`
 * (incluido él mismo): la CEO todos; Administrador y Líder, su equipo;
 * el agente, solo él.
 */
export const equipoVisible = cache(async (userId: string, rol: Rol): Promise<UsuarioEquipo[]> => {
  const lista = await todosLosUsuarios();
  if (rol === "CEO") return lista;
  const yo = lista.filter((u) => u.id === userId);
  if (!esSupervisor(rol)) return yo;
  return [...yo, ...aCargoDe(userId, lista)];
});

/** Usuarios cuyos DATOS (nombre, email, rol, equipo) puede ver: CEO y Administrador todos; Líder su equipo. */
export const usuariosVisibles = cache(async (userId: string, rol: Rol): Promise<UsuarioEquipo[]> => {
  if (rol === "CEO" || rol === "ADMINISTRADOR") return todosLosUsuarios();
  return equipoVisible(userId, rol);
});

/** ¿Puede ver lo de `agenteId` (actividad, propiedades con dueño, contactos)? */
export async function puedeVerAgente(sesion: SessionPayload, agenteId: string): Promise<boolean> {
  if (agenteId === sesion.userId || sesion.rol === "CEO") return true;
  if (!esSupervisor(sesion.rol)) return false;
  return (await equipoVisible(sesion.userId, sesion.rol)).some((u) => u.id === agenteId);
}

/** Teléfono y email de contactos ajenos: solo los ve la CEO. */
export function veDatosDeContacto(sesion: SessionPayload, agenteDelContacto: string): boolean {
  return agenteDelContacto === sesion.userId || sesion.rol === "CEO";
}
