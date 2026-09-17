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
      // Fecha desde la que corre la cadencia del Pipeline (semana 1 de 14 en
      // venta / semana 1 de 7 en alquiler). Por defecto es cuando se cargó en
      // Orion, pero se puede corregir a mano si la propiedad ya venía en
      // proceso desde antes (por ejemplo, migrada desde Lumen OS).
      fechaInicioPipeline: timestamp("fecha_inicio_pipeline").notNull().defaultNow(),
      duenoId: text("dueno_id")
        .notNull()
        .references(() => contactos.id),
      agenteId: text("agente_id")
        .notNull()
        .references(() => usuarios.id),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const propiedadesRelations = relations(propiedades, ({ one, many }) => ({
      dueno: one(contactos, {
              fields: [propiedades.duenoId],
              references: [contactos.id],
      }),
      agente: one(usuarios, {
              fields: [propiedades.agenteId],
              references: [usuarios.id],
      }),
      historialPrecios: many(historialPrecios),
      pipelineAcciones: many(pipelineAcciones),
      portalesPublicados: many(portalesPublicados),
}));

// Registro manual de dónde está publicada cada propiedad (Mercado Libre,
// InfoCasa, Casas y Más, redes, etc). Simple log de links, no hay
// integración automática con los portales todavía.
export const portalesPublicados = pgTable("portales_publicados", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      propiedadId: text("propiedad_id")
        .notNull()
        .references(() => propiedades.id),
      portal: text("portal").notNull(),
      url: text("url").notNull(),
      agenteId: text("agente_id")
        .notNull()
        .references(() => usuarios.id),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const portalesPublicadosRelations = relations(portalesPublicados, ({ one }) => ({
      propiedad: one(propiedades, {
              fields: [portalesPublicados.propiedadId],
              references: [propiedades.id],
      }),
      agente: one(usuarios, {
              fields: [portalesPublicados.agenteId],
              references: [usuarios.id],
      }),
}));

// Categorías de acciones de la cadencia de Pipeline (14 semanas venta / 7
// semanas alquiler), tal como las define el manual de Rosario: cuatro frentes
// de trabajo en paralelo cada semana.
export const categoriaPipelineEnum = pgEnum("categoria_pipeline", [
      "SEGUIMIENTO_DUENO",
      "MARKETING",
      "VENTAS_NEGOCIACION",
      "REPORTE",
]);

// Historial de ajustes de precio de una propiedad — permite ver en el
// Pipeline si ya se bajó el precio y cuándo, en vez de solo el precio actual.
export const historialPrecios = pgTable("historial_precios", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      propiedadId: text("propiedad_id")
        .notNull()
        .references(() => propiedades.id),
      precioAnterior: integer("precio_anterior"),
      monedaAnterior: text("moneda_anterior"),
      precioNuevo: integer("precio_nuevo").notNull(),
      monedaNueva: text("moneda_nueva").notNull(),
      agenteId: text("agente_id")
        .notNull()
        .references(() => usuarios.id),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const historialPreciosRelations = relations(historialPrecios, ({ one }) => ({
      propiedad: one(propiedades, {
              fields: [historialPrecios.propiedadId],
              references: [propiedades.id],
      }),
}));

// Registro de acciones de seguimiento hechas semana a semana sobre una
// propiedad activa (llamada al dueño, publicación, reporte, etc.). Es lo que
// permite calcular "último contacto" y marcar como cumplida la acción
// sugerida de la semana en curso.
export const pipelineAcciones = pgTable("pipeline_acciones", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      propiedadId: text("propiedad_id")
        .notNull()
        .references(() => propiedades.id),
      agenteId: text("agente_id")
        .notNull()
        .references(() => usuarios.id),
      categoria: categoriaPipelineEnum("categoria").notNull(),
      semana: integer("semana").notNull(),
      descripcion: text("descripcion").notNull(),
      nota: text("nota"),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const pipelineAccionesRelations = relations(pipelineAcciones, ({ one }) => ({
      propiedad: one(propiedades, {
              fields: [pipelineAcciones.propiedadId],
              references: [propiedades.id],
      }),
      agente: one(usuarios, {
              fields: [pipelineAcciones.agenteId],
              references: [usuarios.id],
      }),
}));

// Agenda de visitas: coordinación y seguimiento de visitas a propiedades.
export const estadoVisitaEnum = pgEnum("estado_visita", [
      "PROGRAMADA",
      "REALIZADA",
      "CANCELADA",
      "NO_SE_PRESENTO",
]);

export const visitas = pgTable("visitas", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      propiedadId: text("propiedad_id")
        .notNull()
        .references(() => propiedades.id),
      contactoId: text("contacto_id")
        .notNull()
        .references(() => contactos.id),
      agenteId: text("agente_id")
        .notNull()
        .references(() => usuarios.id),
      fecha: timestamp("fecha").notNull(),
      estado: estadoVisitaEnum("estado").notNull().default("PROGRAMADA"),
      notas: text("notas"),
      resultado: text("resultado"),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const visitasRelations = relations(visitas, ({ one }) => ({
      propiedad: one(propiedades, {
              fields: [visitas.propiedadId],
              references: [propiedades.id],
      }),
      contacto: one(contactos, {
              fields: [visitas.contactoId],
              references: [contactos.id],
      }),
      agente: one(usuarios, {
              fields: [visitas.agenteId],
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

export const busquedasRelations = relations(busquedas, ({ one, many }) => ({
      contacto: one(contactos, {
              fields: [busquedas.contactoId],
              references: [contactos.id],
      }),
      coincidenciasAvisadas: many(coincidenciasAvisadas),
}));

// Motor de coincidencias: el match búsqueda↔propiedad se calcula al vuelo
// (no se guarda), pero acá queda registro de qué pares ya le avisó Rosario
// al cliente, para no repetir el aviso y para llevar una nota de cómo
// reaccionó.
export const coincidenciasAvisadas = pgTable("coincidencias_avisadas", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      busquedaId: text("busqueda_id")
        .notNull()
        .references(() => busquedas.id),
      propiedadId: text("propiedad_id")
        .notNull()
        .references(() => propiedades.id),
      agenteId: text("agente_id")
        .notNull()
        .references(() => usuarios.id),
      nota: text("nota"),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const coincidenciasAvisadasRelations = relations(
  coincidenciasAvisadas,
  ({ one }) => ({
        busqueda: one(busquedas, {
                fields: [coincidenciasAvisadas.busquedaId],
                references: [busquedas.id],
        }),
        propiedad: one(propiedades, {
                fields: [coincidenciasAvisadas.propiedadId],
                references: [propiedades.id],
        }),
        agente: one(usuarios, {
                fields: [coincidenciasAvisadas.agenteId],
                references: [usuarios.id],
        }),
  })
);

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
