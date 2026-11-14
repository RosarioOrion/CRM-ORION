"use server";

import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { captaciones, contactos, propiedades, usuarios } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { normalizarTelefono } from "@/lib/duplicados";
import { esOrigenValido, rolesDe } from "@/lib/contactos";
import { ESTADO_LABEL } from "@/lib/propiedades";
import { ESTADO_CAPTACION_LABEL, type EstadoCaptacion } from "@/lib/captaciones";
import {
  compararPropiedades,
  inferirDeTitulo,
  type Comparacion,
  type PropiedadComparable,
} from "@/lib/captacion-verificar";

// "Verificar teléfono" al empezar una captación: busca el número en los
// contactos de TODO el equipo y, si alguien lo tiene, qué propiedades está
// trabajando con ese propietario (propiedades activas y captaciones en
// curso). Al guardar se vuelve a verificar acá, así no se puede saltear.

export type TrabajoExistente = PropiedadComparable & {
  origen: "Propiedad" | "Captación";
  operacion: string;
  estado: string;
};

export type RegistroTelefono = {
  propio: boolean;
  agente: string;
  contacto: string;
  /** Solo si es propio (no se expone el id de contactos ajenos). */
  contactoId: string | null;
  desde: string;
  trabajos: TrabajoExistente[];
};

export type VerificacionTelefono = { error?: string; registros?: RegistroTelefono[] };

const fecha = (d: Date) =>
  d.toLocaleDateString("es-UY", { timeZone: "America/Montevideo", day: "2-digit", month: "2-digit", year: "numeric" });

async function registrosDelTelefono(telefono: string) {
  const tel = normalizarTelefono(telefono);
  if (!tel) return null;
  const todos = await db
    .select({
      id: contactos.id,
      nombre: contactos.nombre,
      telefono: contactos.telefono,
      agenteId: contactos.agenteId,
      agente: usuarios.nombre,
      archivado: contactos.archivado,
      creadoEn: contactos.creadoEn,
    })
    .from(contactos)
    .innerJoin(usuarios, eq(contactos.agenteId, usuarios.id))
    .where(isNotNull(contactos.telefono))
    .orderBy(desc(contactos.creadoEn));
  const coinciden = todos.filter((c) => normalizarTelefono(c.telefono) === tel);
  if (coinciden.length === 0) return { tel, contactos: coinciden, props: [], caps: [] };

  const ids = coinciden.map((c) => c.id);
  const [props, caps] = await Promise.all([
    db
      .select({
        duenoId: propiedades.duenoId,
        tipo: propiedades.tipo,
        zona: propiedades.zona,
        direccion: propiedades.direccion,
        operacion: propiedades.operacion,
        estado: propiedades.estado,
      })
      .from(propiedades)
      .where(and(inArray(propiedades.duenoId, ids), inArray(propiedades.estado, ["ACTIVA", "RESERVADA", "PAUSADA"]))),
    db
      .select({
        contactoId: captaciones.contactoId,
        tipo: captaciones.tipo,
        zona: captaciones.zona,
        direccion: captaciones.direccion,
        operacion: captaciones.operacion,
        estado: captaciones.estado,
      })
      .from(captaciones)
      .where(and(inArray(captaciones.contactoId, ids), isNull(captaciones.convertidaEnPropiedadId))),
  ]);
  return { tel, contactos: coinciden, props, caps };
}

function armarRegistros(yo: string, r: NonNullable<Awaited<ReturnType<typeof registrosDelTelefono>>>): RegistroTelefono[] {
  return r.contactos.map((c) => ({
    propio: c.agenteId === yo,
    agente: c.agente,
    contacto: c.nombre,
    contactoId: c.agenteId === yo ? c.id : null,
    desde: fecha(c.creadoEn),
    trabajos: [
      ...r.props
        .filter((p) => p.duenoId === c.id)
        .map((p) => ({
          origen: "Propiedad" as const,
          tipo: p.tipo,
          zona: p.zona,
          direccion: p.direccion,
          operacion: p.operacion,
          estado: ESTADO_LABEL[p.estado] ?? p.estado,
        })),
      ...r.caps
        .filter((k) => k.contactoId === c.id)
        .map((k) => ({
          origen: "Captación" as const,
          tipo: k.tipo,
          zona: k.zona,
          direccion: k.direccion,
          operacion: k.operacion,
          estado: ESTADO_CAPTACION_LABEL[k.estado as EstadoCaptacion] ?? k.estado,
        })),
    ],
  }));
}

export async function verificarTelefono(telefono: string): Promise<VerificacionTelefono> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };
  const r = await registrosDelTelefono(telefono);
  if (!r) return { error: "Ingresá un teléfono válido (al menos 6 números)." };
  return { registros: armarRegistros(sesion.userId, r) };
}

export type ResultadoCaptacion = {
  error?: string;
  ok?: boolean;
  /** Otro agente ya trabaja esa propiedad (o no se puede distinguir sin dirección). */
  bloqueo?: { agente: string; detalle: string; comparacion: Comparacion };
};

const describir = (t: PropiedadComparable & { operacion?: string }) =>
  [t.tipo, t.zona, t.direccion].filter(Boolean).join(" · ");

type Registros = NonNullable<Awaited<ReturnType<typeof registrosDelTelefono>>>;

/** ¿Alguien (o el mismo agente) ya trabaja esta propiedad con este propietario? */
function chequearPropiedad(yo: string, r: Registros, nueva: PropiedadComparable): ResultadoCaptacion | null {
  for (const reg of armarRegistros(yo, r)) {
    for (const t of reg.trabajos) {
      const comp = compararPropiedades(nueva, t);
      if (comp === "DISTINTA") continue;
      if (reg.propio && comp === "MISMA") {
        return { error: `Esta propiedad ya la tenés en ${t.origen === "Propiedad" ? "Propiedades" : "Captaciones"} (${describir(t)}).` };
      }
      if (!reg.propio) {
        return { bloqueo: { agente: reg.agente, detalle: `${t.origen}: ${describir(t)} · ${t.estado}`, comparacion: comp } };
      }
    }
  }
  return null;
}

/** Paso "número libre → Agregar contacto": lo guarda como contacto del agente. */
export async function agregarContactoCaptacion(
  nombre: string,
  telefono: string
): Promise<{ error?: string; ok?: boolean }> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };
  nombre = nombre.trim();
  if (nombre.length < 2) return { error: "Ingresá el nombre del propietario." };
  const r = await registrosDelTelefono(telefono);
  if (!r) return { error: "Ingresá un teléfono válido (al menos 6 números)." };
  const ajeno = r.contactos.find((c) => c.agenteId !== sesion.userId);
  if (ajeno) return { error: `Este número ya lo tiene ${ajeno.agente}. Volvé a verificarlo.` };
  if (!r.contactos.some((c) => c.agenteId === sesion.userId)) {
    await db.insert(contactos).values({
      nombre,
      telefono: telefono.trim(),
      categoria: "PROPIETARIO_VENTA",
      roles: ["PROPIETARIO_VENTA"],
      agenteId: sesion.userId,
    });
    revalidatePath("/contactos");
  }
  return { ok: true };
}

/** Paso "número ocupado": con los datos básicos, ¿es la misma propiedad o es otra? */
export async function compararPropiedadNueva(
  telefono: string,
  datos: { tipo: string; zona: string; direccion: string }
): Promise<ResultadoCaptacion> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };
  if (!datos.tipo.trim()) return { error: "Elegí el tipo de propiedad." };
  if (!datos.zona.trim()) return { error: "Ingresá el barrio o zona." };
  const r = await registrosDelTelefono(telefono);
  if (!r) return { error: "Ingresá un teléfono válido (al menos 6 números)." };
  const choque = chequearPropiedad(sesion.userId, r, {
    tipo: datos.tipo.trim(),
    zona: datos.zona.trim(),
    direccion: datos.direccion.trim() || null,
  });
  return choque ?? { ok: true };
}

/**
 * Último paso: la captación (título, link, venta/alquiler, notas). Vuelve a
 * verificar en el servidor y queda en "Llamando" (captando): toca la
 * llamada en frío o el mensaje. Si no se cargaron tipo y barrio (número
 * libre), se sacan del título para poder comparar más adelante.
 */
export async function crearCaptacionVerificada(datos: {
  telefono: string;
  nombre: string;
  titulo: string;
  link: string;
  operacion: string;
  notas: string;
  tipo?: string;
  zona?: string;
  direccion?: string;
}): Promise<ResultadoCaptacion> {
  const sesion = await obtenerSesion();
  if (!sesion) return { error: "Sesión expirada, volvé a ingresar." };
  const yo = sesion.userId;

  const nombre = datos.nombre.trim();
  const titulo = datos.titulo.trim();
  const link = datos.link.trim();
  const operacion = datos.operacion === "ALQUILER" ? "ALQUILER" : "VENTA";
  if (nombre.length < 2) return { error: "Ingresá el nombre del propietario." };
  if (titulo.length < 3) return { error: "Ingresá un título (ej. Apto 2 dorm. en Pocitos)." };
  if (link && !/^https?:\/\//i.test(link)) return { error: "El link tiene que empezar con http:// o https://" };

  const deducido = inferirDeTitulo(titulo);
  const tipo = datos.tipo?.trim() || deducido.tipo;
  const zona = datos.zona?.trim() || deducido.zona;
  const direccion = datos.direccion?.trim() || null;

  const r = await registrosDelTelefono(datos.telefono);
  if (!r) return { error: "Ingresá un teléfono válido (al menos 6 números)." };
  const choque = chequearPropiedad(yo, r, { tipo, zona, direccion });
  if (choque) return choque;

  // Contacto: el propio si ya existe; si no, uno nuevo a nombre del agente.
  const propio = r.contactos.find((c) => c.agenteId === yo);
  const categoria = operacion === "ALQUILER" ? "PROPIETARIO_ALQUILER" : "PROPIETARIO_VENTA";
  let contactoId: string;
  let origen = "OTRO";
  if (propio) {
    contactoId = propio.id;
    const [c] = await db.select().from(contactos).where(eq(contactos.id, propio.id));
    origen = c.origen;
    const roles = rolesDe({ categoria: c.categoria, roles: [...(c.roles ?? []), categoria] });
    await db.update(contactos).set({ roles, categoria: roles[0], archivado: false }).where(eq(contactos.id, propio.id));
  } else {
    const [c] = await db
      .insert(contactos)
      .values({ nombre, telefono: datos.telefono.trim(), categoria, roles: [categoria], agenteId: yo })
      .returning({ id: contactos.id });
    contactoId = c.id;
  }

  await db.insert(captaciones).values({
    titulo,
    contactoId,
    agenteId: yo,
    operacion,
    tipo,
    zona,
    direccion,
    link: link || null,
    origen: esOrigenValido(origen) ? origen : "OTRO",
    notas: datos.notas.trim() || null,
    estado: "LLAMANDO",
  });

  revalidatePath("/captaciones");
  revalidatePath("/contactos");
  return { ok: true };
}
