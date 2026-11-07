"use server";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { busquedas, contactos, propiedades, usuarios } from "@/db/schema";
import { obtenerSesion } from "@/lib/auth";
import { ESTADO_LABEL, limpiarTitulo } from "@/lib/propiedades";
import { CATEGORIA_LABEL } from "@/lib/contactos";

// Buscador rápido (Ctrl+K o la lupa): contactos y búsquedas propios, y
// propiedades de todo el equipo (igual que el buscador de Propiedades: las
// ajenas se ven en solo lectura).

export type ResultadoRapido = {
  tipo: "contacto" | "propiedad" | "busqueda";
  titulo: string;
  detalle: string;
  href: string;
};

export async function buscarRapido(texto: string): Promise<ResultadoRapido[]> {
  const sesion = await obtenerSesion();
  if (!sesion) return [];
  const q = texto.trim().slice(0, 80);
  if (q.length < 2) return [];
  const patron = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const digitos = q.replace(/\D/g, "");

  const [cs, ps, bs] = await Promise.all([
    db
      .select({
        id: contactos.id,
        nombre: contactos.nombre,
        telefono: contactos.telefono,
        categoria: contactos.categoria,
        archivado: contactos.archivado,
      })
      .from(contactos)
      .where(
        and(
          eq(contactos.agenteId, sesion.userId),
          or(
            ilike(contactos.nombre, patron),
            ilike(contactos.email, patron),
            digitos.length >= 4
              ? sql`regexp_replace(coalesce(${contactos.telefono}, ''), '\\D', '', 'g') like ${`%${digitos}%`}`
              : undefined
          )
        )
      )
      .orderBy(contactos.archivado, contactos.nombre)
      .limit(6),
    db
      .select({
        id: propiedades.id,
        codigo: propiedades.codigo,
        titulo: propiedades.titulo,
        zona: propiedades.zona,
        estado: propiedades.estado,
        agenteId: propiedades.agenteId,
        agente: usuarios.nombre,
      })
      .from(propiedades)
      .leftJoin(usuarios, eq(propiedades.agenteId, usuarios.id))
      .where(
        or(
          ilike(propiedades.codigo, patron),
          ilike(propiedades.titulo, patron),
          ilike(propiedades.direccion, patron),
          ilike(propiedades.zona, patron)
        )
      )
      .orderBy(sql`${propiedades.agenteId} = ${sesion.userId} desc`, desc(propiedades.creadoEn))
      .limit(6),
    db
      .select({
        id: busquedas.id,
        operacion: busquedas.operacion,
        tipo: busquedas.tipo,
        zona: busquedas.zona,
        activa: busquedas.activa,
        contacto: contactos.nombre,
      })
      .from(busquedas)
      .innerJoin(contactos, eq(busquedas.contactoId, contactos.id))
      .where(
        and(
          eq(contactos.agenteId, sesion.userId),
          or(ilike(contactos.nombre, patron), ilike(busquedas.zona, patron), ilike(busquedas.tipo, patron))
        )
      )
      .orderBy(desc(busquedas.activa), desc(busquedas.creadoEn))
      .limit(4),
  ]);

  return [
    ...cs.map((c) => ({
      tipo: "contacto" as const,
      titulo: c.nombre,
      detalle: [
        CATEGORIA_LABEL[c.categoria as keyof typeof CATEGORIA_LABEL] ?? c.categoria,
        c.telefono,
        c.archivado ? "archivado" : null,
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/contactos/${c.id}`,
    })),
    ...ps.map((p) => ({
      tipo: "propiedad" as const,
      titulo: `${p.codigo} — ${limpiarTitulo(p.titulo)}`,
      detalle: [p.zona, ESTADO_LABEL[p.estado], p.agenteId !== sesion.userId && p.agente ? `👤 ${p.agente}` : null]
        .filter(Boolean)
        .join(" · "),
      href: `/propiedades/${p.id}`,
    })),
    ...bs.map((b) => ({
      tipo: "busqueda" as const,
      titulo: `${b.contacto}: ${b.operacion === "VENTA" ? "compra" : "alquiler"} · ${b.tipo}`,
      detalle: [b.zona, b.activa ? null : "pausada"].filter(Boolean).join(" · "),
      href: `/busquedas?q=${encodeURIComponent(b.contacto)}`,
    })),
  ];
}
