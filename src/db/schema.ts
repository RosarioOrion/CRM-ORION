import {
      pgTable,
      text,
      timestamp,
      integer,
      boolean,
      pgEnum,
      jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const rolEnum = pgEnum("rol", ["AGENTE", "TEAM_LEADER", "ADMINISTRADOR"]);
export const estadoPropiedadEnum = pgEnum("estado_propiedad", [
      "ACTIVA",
      "RESERVADA",
      "PAUSADA",
      "CERRADA",
      "VENDIDA",
      "ALQUILADA",
    ]);
export const operacionEnum = pgEnum("operacion", ["VENTA", "ALQUILER"]);
export const estadoCaptacionEnum = pgEnum("estado_captacion", [
      "LLAMANDO",
      "TASANDO",
      "PARA_PUBLICAR",
    ]);

export const usuarios = pgTable("usuarios", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      nombre: text("nombre").notNull(),
      email: text("email").notNull().unique(),
      passwordHash: text("password_hash").notNull(),
      telefono: text("telefono"),
      rol: rolEnum("rol").notNull().default("AGENTE"),
      teamLeaderId: text("team_leader_id"),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
      teamLeader: one(usuarios, {
              fields: [usuarios.teamLeaderId],
              references: [usuarios.id],
      }),
      contactos: many(contactos),
      propiedades: many(propiedades),
      captaciones: many(captaciones),
}));

export const contactos = pgTable("contactos", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      nombre: text("nombre").notNull(),
      telefono: text("telefono"),
      email: text("email"),
      notas: text("notas"),
      categoria: text("categoria").notNull().default("OTRO"),
      origen: text("origen").notNull().default("OTRO"),
      origenDetalle: text("origen_detalle"),
      archivado: boolean("archivado").notNull().default(false),
      agenteId: text("agente_id")
        .notNull()
        .references(() => usuarios.id),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const contactosRelations = relations(contactos, ({ one, many }) => ({
      agente: one(usuarios, {
              fields: [contactos.agenteId],
              references: [usuarios.id],
      }),
      propiedades: many(propiedades),
      busquedas: many(busquedas),
      captaciones: many(captaciones),
}));

export const propiedades = pgTable("propiedades", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      codigo: text("codigo").notNull().unique(),
      titulo: text("titulo").notNull(),
      operacion: operacionEnum("operacion").notNull(),
      tipo: text("tipo").notNull(),
      zona: text("zona").notNull(),
      direccion: text("direccion"),
      departamento: text("departamento"),
      precio: integer("precio"),
      moneda: text("moneda").notNull().default("USD"),
      m2Cubiertos: integer("m2_cubiertos"),
      m2Privados: integer("m2_privados"),
      m2Terreno: integer("m2_terreno"),
      hectareas: integer("hectareas"),
      dormitorios: integer("dormitorios"),
      banos: integer("banos"),
      ambientes: integer("ambientes"),
      cocheras: integer("cocheras"),
      bodegas: integer("bodegas"),
      antiguedad: integer("antiguedad"),
      numeroPiso: integer("numero_piso"),
      cantidadPisos: integer("cantidad_pisos"),
      orientacion: text("orientacion"),
      disposicion: text("disposicion"),
      subtipo: text("subtipo"),
      gastosComunes: integer("gastos_comunes"),
      mascotas: boolean("mascotas").notNull().default(false),
      acceso: text("acceso"),
      distanciaAsfalto: integer("distancia_asfalto"),
      formaTerreno: text("forma_terreno"),
      estadoEdilicio: text("estado_edilicio"),
      extras: jsonb("extras").$type<string[]>().notNull().default([]),
      fotos: jsonb("fotos").$type<string[]>().notNull().default([]),
      descripcion: text("descripcion"),
      estado: estadoPropiedadEnum("estado").notNull().default("ACTIVA"),
      duenoId: text("dueno_id")
        .notNull()
        .references(() => contactos.id),
      agenteId: text("agente_id")
        .notNull()
        .references(() => usuarios.id),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const propiedadesRelations = relations(propiedades, ({ one }) => ({
      dueno: one(contactos, {
              fields: [propiedades.duenoId],
              references: [contactos.id],
      }),
      agente: one(usuarios, {
              fields: [propiedades.agenteId],
              references: [usuarios.id],
      }),
}));

export const busquedas = pgTable("busquedas", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      contactoId: text("contacto_id")
        .notNull()
        .references(() => contactos.id),
      operacion: operacionEnum("operacion").notNull(),
      tipo: text("tipo").notNull(),
      zona: text("zona").notNull(),
      precioMin: integer("precio_min"),
      precioMax: integer("precio_max"),
      moneda: text("moneda").notNull().default("USD"),
      notas: text("notas"),
      activa: boolean("activa").notNull().default(true),
      vence: timestamp("vence"),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const busquedasRelations = relations(busquedas, ({ one }) => ({
      contacto: one(contactos, {
              fields: [busquedas.contactoId],
              references: [contactos.id],
      }),
}));

export const captaciones = pgTable("captaciones", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      titulo: text("titulo").notNull(),
      contactoId: text("contacto_id")
        .notNull()
        .references(() => contactos.id),
      agenteId: text("agente_id")
        .notNull()
        .references(() => usuarios.id),
      operacion: operacionEnum("operacion").notNull(),
      tipo: text("tipo").notNull(),
      zona: text("zona"),
      direccion: text("direccion"),
      origen: text("origen").notNull().default("OTRO"),
      origenDetalle: text("origen_detalle"),
      notas: text("notas"),
      estado: estadoCaptacionEnum("estado").notNull().default("LLAMANDO"),
      convertidaEnPropiedadId: text("convertida_en_propiedad_id").references(
        () => propiedades.id
      ),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const captacionesRelations = relations(captaciones, ({ one }) => ({
      contacto: one(contactos, {
              fields: [captaciones.contactoId],
              references: [contactos.id],
      }),
      agente: one(usuarios, {
              fields: [captaciones.agenteId],
              references: [usuarios.id],
      }),
      propiedad: one(propiedades, {
              fields: [captaciones.convertidaEnPropiedadId],
              references: [propiedades.id],
      }),
}));
