"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { contactos, propiedades, visitas, busquedas, captaciones, actividades } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { dependenciasContacto, borrarContacto } from "@/lib/eliminar";
import { buscarDuplicados, type Duplicado } from "@/lib/duplicados";
import {
  CATEGORIAS_CONTACTO,
  ORIGENES_CONTACTO,
  esCategoriaValida,
  esOrigenValido,
  rolesDe,
} from "@/lib/contactos";

const ContactoSchema = z.object({
  nombre: z.string().min(2, "Ingresá un nombre"),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  notas: z.string().optional(),
  categoria: z.enum(CATEGORIAS_CONTACTO).optional(),
  origen: z.enum(ORIGENES_CONTACTO).optional(),
  origenDetalle: z.string().optional(),
});

export type ContactoState = {
  error?: string;
  ok?: number;
  /** Contactos que ya existen con el mismo teléfono o email. */
  duplicados?: Duplicado[];
  /** Lo que se había escrito, para no perderlo al mostrar el aviso. */
  valores?: Record<string, string>;
  /** Cambia en cada respuesta: vuelve a armar el formulario con `valores`. */
  intento?: number;
  /** Adónde ir después (ej. la ficha a la que se le agregó un rol). */
  irA?: string;
};

/** Para avisar mientras se escribe (al salir del campo teléfono o email). */
export async function revisarDuplicados(telefono: string, email: string): Promise<Duplicado[]> {
  const sesion = await obtenerSesion();
  if (!sesion) return [];
  return buscarDuplicados(sesion.userId, telefono, email);
}

export async function crearContacto(
  _prevState: ContactoState,
  formData: FormData
): Promise<ContactoState> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };

  const parsed = ContactoSchema.safeParse({
    nombre: formData.get("nombre"),
    telefono: formData.get("telefono") || undefined,
    email: formData.get("email") || undefined,
    notas: formData.get("notas") || undefined,
    categoria: formData.get("categoria") || undefined,
    origen: formData.get("origen") || undefined,
    origenDetalle: formData.get("origenDetalle") || undefined,
  });

  const valores = Object.fromEntries(
    ["nombre", "telefono", "email", "notas", "categoria", "origen", "origenDetalle"].map((k) => [
      k,
      String(formData.get(k) ?? ""),
    ])
  );

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos", valores, intento: Date.now() };
  }

  // "Es la misma persona: agregarle este rol" desde el aviso de repetido.
  const agregarA = String(formData.get("agregarRolA") ?? "");
  if (agregarA) {
    const [existente] = await db.select().from(contactos).where(eq(contactos.id, agregarA));
    if (!existente || existente.agenteId !== sesion.userId) {
      return { error: "Ese contacto no es tuyo.", valores, intento: Date.now() };
    }
    const nuevos = rolesDe({
      categoria: existente.categoria,
      roles: [...(existente.roles ?? []), parsed.data.categoria ?? "OTRO"],
    });
    await db
      .update(contactos)
      .set({
        categoria: nuevos[0],
        roles: nuevos,
        telefono: existente.telefono || parsed.data.telefono || null,
        email: existente.email || parsed.data.email || null,
        notas: [existente.notas, parsed.data.notas].filter(Boolean).join(" · ") || null,
        archivado: false,
      })
      .where(eq(contactos.id, agregarA));
    revalidatePath("/contactos");
    revalidatePath(`/contactos/${agregarA}`);
    return { ok: Date.now(), irA: `/contactos/${agregarA}` };
  }

  // Aviso de repetido: si ya existe alguien con el mismo teléfono o email, se
  // muestra antes de guardar. El agente puede abrir el existente o guardar igual.
  if (formData.get("confirmarDuplicado") !== "1") {
    const duplicados = await buscarDuplicados(sesion.userId, parsed.data.telefono, parsed.data.email);
    if (duplicados.length > 0) return { duplicados, valores, intento: Date.now() };
  }

  await db.insert(contactos).values({
    ...parsed.data,
    email: parsed.data.email || null,
    categoria: parsed.data.categoria ?? "OTRO",
    origen: parsed.data.origen ?? "OTRO",
    origenDetalle: parsed.data.origenDetalle || null,
    agenteId: sesion.userId,
  });

  revalidatePath("/contactos");
  return { ok: Date.now() };
}

async function requerirPropietario(contactoId: string) {
  const sesion = await obtenerSesion();
  if (!sesion) throw new Error("Sesión expirada, volvé a ingresar.");

  const [contacto] = await db
    .select()
    .from(contactos)
    .where(eq(contactos.id, contactoId));

  if (!contacto || contacto.agenteId !== sesion.userId) {
    throw new Error("Contacto no encontrado.");
  }
  return contacto;
}

export async function actualizarCategoria(contactoId: string, categoria: string) {
  await requerirPropietario(contactoId);
  if (!esCategoriaValida(categoria)) throw new Error("Categoría inválida.");

  await db.update(contactos).set({ categoria }).where(eq(contactos.id, contactoId));

  revalidatePath("/contactos");
  revalidatePath(`/contactos/${contactoId}`);
}

/** Guarda la lista de roles del contacto (el primero es el principal). */
export async function guardarRoles(contactoId: string, roles: string[]) {
  await requerirPropietario(contactoId);
  const validos = rolesDe({ categoria: roles[0] ?? "OTRO", roles });
  await db
    .update(contactos)
    .set({ categoria: validos[0], roles: validos })
    .where(eq(contactos.id, contactoId));
  revalidatePath("/contactos");
  revalidatePath(`/contactos/${contactoId}`);
}

/**
 * Unir dos fichas de la misma persona: todo lo del otro contacto
 * (propiedades, visitas, búsquedas, captaciones, actividades) pasa a este,
 * se suman los roles y se completan los datos que falten. La ficha vieja
 * queda en la Papelera.
 */
export async function unirContactos(
  principalId: string,
  otroId: string
): Promise<{ ok: boolean; error?: string }> {
  if (principalId === otroId) return { ok: false, error: "Elegí otro contacto." };
  let principal, otro;
  try {
    principal = await requerirPropietario(principalId);
    otro = await requerirPropietario(otroId);
  } catch {
    return { ok: false, error: "Solo podés unir contactos tuyos." };
  }

  const roles = rolesDe({
    categoria: principal.categoria,
    roles: [...(principal.roles ?? []), otro.categoria, ...(otro.roles ?? [])],
  });

  try {
    await db.transaction(async (tx) => {
      await tx.update(propiedades).set({ duenoId: principalId }).where(eq(propiedades.duenoId, otroId));
      await tx.update(visitas).set({ contactoId: principalId }).where(eq(visitas.contactoId, otroId));
      await tx.update(busquedas).set({ contactoId: principalId }).where(eq(busquedas.contactoId, otroId));
      await tx.update(captaciones).set({ contactoId: principalId }).where(eq(captaciones.contactoId, otroId));
      await tx.update(actividades).set({ contactoId: principalId }).where(eq(actividades.contactoId, otroId));
      await tx
        .update(contactos)
        .set({
          categoria: roles[0],
          roles,
          telefono: principal.telefono || otro.telefono,
          email: principal.email || otro.email,
          origenDetalle: principal.origenDetalle || otro.origenDetalle,
          notas: [principal.notas, otro.notas].filter(Boolean).join(" · ") || null,
          archivado: principal.archivado && otro.archivado,
        })
        .where(eq(contactos.id, principalId));
    });
    // La ficha vieja (ya sin nada vinculado) va a la Papelera.
    await borrarContacto(otroId, principal.agenteId);
  } catch (e) {
    return { ok: false, error: `No se pudo unir: ${e instanceof Error ? e.message : String(e)}` };
  }

  revalidatePath("/contactos");
  revalidatePath(`/contactos/${principalId}`);
  revalidatePath("/papelera");
  return { ok: true };
}

/** Mis otros contactos, para elegir con cuál unir (posibles repetidos primero). */
export async function candidatosParaUnir(contactoId: string) {
  const c = await requerirPropietario(contactoId);
  const repetidos = (await buscarDuplicados(c.agenteId, c.telefono, c.email)).filter(
    (d) => d.propio && d.id !== contactoId
  );
  const todos = await db
    .select({ id: contactos.id, nombre: contactos.nombre, telefono: contactos.telefono })
    .from(contactos)
    .where(and(eq(contactos.agenteId, c.agenteId), ne(contactos.id, contactoId)))
    .orderBy(contactos.nombre);
  return { repetidos: repetidos.map((r) => r.id), todos };
}

export type DetallesState = { error?: string; ok?: boolean };

export async function actualizarDetalles(
  contactoId: string,
  _prevState: DetallesState,
  formData: FormData
): Promise<DetallesState> {
  await requerirPropietario(contactoId);

  const origen = formData.get("origen");
  const origenDetalle = formData.get("origenDetalle");
  const notas = formData.get("notas");

  if (typeof origen !== "string" || !esOrigenValido(origen)) {
    return { error: "Origen inválido." };
  }

  await db
    .update(contactos)
    .set({
      origen,
      origenDetalle: typeof origenDetalle === "string" && origenDetalle.trim() ? origenDetalle.trim() : null,
      notas: typeof notas === "string" && notas.trim() ? notas.trim() : null,
    })
    .where(eq(contactos.id, contactoId));

  revalidatePath("/contactos");
  revalidatePath(`/contactos/${contactoId}`);
  return { ok: true };
}

export async function archivarContacto(contactoId: string, archivado: boolean) {
  await requerirPropietario(contactoId);

  await db
    .update(contactos)
    .set({ archivado })
    .where(eq(contactos.id, contactoId));

  revalidatePath("/contactos");
  revalidatePath(`/contactos/${contactoId}`);
}

export type EliminarState = { ok: boolean; error?: string };

/** Qué se va a borrar junto con el contacto (para la confirmación). */
export async function resumenEliminarContacto(contactoId: string) {
  await requerirPropietario(contactoId);
  return dependenciasContacto(contactoId);
}

export async function eliminarContacto(contactoId: string): Promise<EliminarState> {
  let agenteId: string;
  try {
    agenteId = (await requerirPropietario(contactoId)).agenteId;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado." };
  }

  const dep = await dependenciasContacto(contactoId);
  if (dep.propiedadesComoDueno.length > 0) {
    return {
      ok: false,
      error: `No se puede eliminar: es dueño de ${dep.propiedadesComoDueno.join(", ")}. Eliminá esa propiedad primero (o asignale otro dueño).`,
    };
  }

  try {
    await borrarContacto(contactoId, agenteId);
  } catch (e) {
    return {
      ok: false,
      error: `No se pudo eliminar: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  revalidatePath("/contactos");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/papelera");
  return { ok: true };
}
