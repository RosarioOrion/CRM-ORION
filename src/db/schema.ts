import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const rolEnum = pgEnum("rol", ["AGENTE", "TEAM_LEADER", "ADMINISTRADOR"]);
export const estadoPropiedadEnum = pgEnum("estado_propiedad", [
  "ACTIVA",
  "PAUSADA",
  "CERRADA",
]);
export const operacionEnum = pgEnum("operacion", ["VENTA", "ALQUILER"]);

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
}));

export const contactos = pgTable("contactos", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  nombre: text("nombre").notNull(),
  telefono: text("telefono"),
  email: text("email"),
  notas: text("notas"),
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
}));

export const propiedades = pgTable("propiedades", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  codigo: text("codigo").notNull().unique(),
  titulo: text("titulo").notNull(),
  operacion: operacionEnum("operacion").notNull(),
  tipo: text("tipo").notNull(),
  zona: text("zona").notNull(),
  precio: integer("precio"),
  moneda: text("moneda").notNull().default("USD"),
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
