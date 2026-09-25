import {
      pgTable,
      text,
      timestamp,
      integer,
      boolean,
      pgEnum,
      jsonb,
      unique,
      doublePrecision,
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
      // Presentación / bio profesional que el agente carga al registrarse
      // (para su perfil dentro de Orion).
      descripcion: text("descripcion"),
      // Cuentas creadas por un administrador nacen aprobadas; las que se
      // crean solas desde /registro quedan en false hasta que un
      // administrador o team leader las aprueba.
      aprobado: boolean("aprobado").notNull().default(true),
      // Permite desactivar a un agente (licencia, se va del equipo, etc.)
      // sin borrar su historial ni sus datos. Un usuario inactivo no puede
      // iniciar sesión, pero sigue apareciendo en reportes e historial.
      activo: boolean("activo").notNull().default(true),
      // Nivel de comisión (clave de niveles_comision.clave, ver más abajo).
      // Es texto libre — no un enum — justamente para poder agregar
      // escalones nuevos sin migración. Lo fija un admin/team leader desde
      // Usuarios a medida que el agente progresa, guiado por la
      // facturación acumulada que se calcula en src/lib/comisiones.ts.
      nivelComision: text("nivel_comision").notNull().default("AGENTE_JUNIOR"),
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
      // Duración estimada en minutos (opcional) — para detectar superposiciones.
      duracionMin: integer("duracion_min"),
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

// Configuración de la cuenta a nivel inmobiliaria (no personal): nombre del
// CRM, datos de la empresa, filosofía, colores de marca, logo y sistema de
// comisiones. Es una tabla singleton — siempre hay una sola fila, la primera
// que se crea (o se crea de forma perezosa la primera vez que se guarda).
export const configuracionEmpresa = pgTable("configuracion_empresa", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      nombreCrm: text("nombre_crm").notNull().default("Orion"),
      nombreEmpresa: text("nombre_empresa"),
      filosofia: text("filosofia"),
      colorPrimario: text("color_primario"),
      colorSecundario: text("color_secundario"),
      // Logo guardado como data URI base64, mismo patrón que las fotos de
      // propiedades (sin storage externo).
      logo: text("logo"),
      // Por ahora texto libre; si Rosario define reglas/tramos concretos más
      // adelante conviene pasar esto a una estructura propia (tabla o jsonb
      // con porcentajes por rol/nivel).
      sistemaComisiones: text("sistema_comisiones"),
      telefonoEmpresa: text("telefono_empresa"),
      emailEmpresa: text("email_empresa"),
      direccion: text("direccion"),
      actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
      actualizadoPorId: text("actualizado_por_id").references(() => usuarios.id),
});

export const configuracionEmpresaRelations = relations(configuracionEmpresa, ({ one }) => ({
      actualizadoPor: one(usuarios, {
              fields: [configuracionEmpresa.actualizadoPorId],
              references: [usuarios.id],
      }),
}));

// Cartelera de novedades del equipo: avisos y anuncios que publica un
// team leader/administrador y que ve todo el equipo.
export const novedades = pgTable("novedades", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      titulo: text("titulo").notNull(),
      cuerpo: text("cuerpo").notNull(),
      destacada: boolean("destacada").notNull().default(false),
      autorId: text("autor_id")
        .notNull()
        .references(() => usuarios.id),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const novedadesRelations = relations(novedades, ({ one }) => ({
      autor: one(usuarios, {
              fields: [novedades.autorId],
              references: [usuarios.id],
      }),
}));

// Kaizen 5S: checklist semanal de mejora continua, con un foco distinto
// cada día de la semana. El catálogo de tareas (kaizenTareas) es editable
// por un admin; kaizenCompletados registra, por agente y por semana, qué
// tareas se marcaron como hechas (se reinicia cada semana).
export const diaKaizenEnum = pgEnum("dia_kaizen", [
      "LUNES",
      "MARTES",
      "MIERCOLES",
      "JUEVES",
      "VIERNES",
]);

export const kaizenTareas = pgTable("kaizen_tareas", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      dia: diaKaizenEnum("dia").notNull(),
      orden: integer("orden").notNull().default(0),
      texto: text("texto").notNull(),
      // Desactivar en vez de borrar, para no perder el historial de
      // completados de semanas anteriores (mismo patrón que usuarios.activo).
      activa: boolean("activa").notNull().default(true),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const kaizenCompletados = pgTable(
  "kaizen_completados",
  {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      tareaId: text("tarea_id")
        .notNull()
        .references(() => kaizenTareas.id),
      agenteId: text("agente_id")
        .notNull()
        .references(() => usuarios.id),
      // Lunes de la semana en formato "YYYY-MM-DD" — clave de "qué semana es".
      semanaInicio: text("semana_inicio").notNull(),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
  },
  (table) => ({
        unicoPorSemana: unique().on(table.tareaId, table.agenteId, table.semanaInicio),
  })
);

export const kaizenCompletadosRelations = relations(kaizenCompletados, ({ one }) => ({
      tarea: one(kaizenTareas, {
              fields: [kaizenCompletados.tareaId],
              references: [kaizenTareas.id],
      }),
      agente: one(usuarios, {
              fields: [kaizenCompletados.agenteId],
              references: [usuarios.id],
      }),
}));

// Reservas de Venta y de Alquiler — mismos campos que usa Lumen OS. Cuando
// una reserva de venta pasa a BOLETO o ESCRITURADA (o una de alquiler pasa
// a FIRMADA), se calculan y guardan las líneas de comisiones
// correspondientes en la tabla `comisiones`.
export const estadoReservaVentaEnum = pgEnum("estado_reserva_venta", [
      "RESERVADA",
      "BOLETO",
      "ESCRITURADA",
      "CANCELADA",
]);

export const reservasVenta = pgTable("reservas_venta", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      // Si la reserva corresponde a una propiedad ya cargada en Orion, se
      // puede vincular acá — pero el nombre/dirección queda siempre como
      // texto libre (igual que en Lumen OS), por si la propiedad todavía no
      // está cargada como tal.
      propiedadId: text("propiedad_id").references(() => propiedades.id),
      nombrePropiedad: text("nombre_propiedad").notNull(),
      codigoExterno: text("codigo_externo"),
      linkPublicacion: text("link_publicacion"),
      estado: estadoReservaVentaEnum("estado").notNull().default("RESERVADA"),
      vendedorNombre: text("vendedor_nombre"),
      vendedorTelefono: text("vendedor_telefono"),
      vendedorCedula: text("vendedor_cedula"),
      compradorNombre: text("comprador_nombre"),
      compradorTelefono: text("comprador_telefono"),
      compradorCedula: text("comprador_cedula"),
      precioCierre: integer("precio_cierre").notNull(),
      porcentajePorParte: doublePrecision("porcentaje_por_parte").notNull().default(3),
      comisionVendedor: integer("comision_vendedor"),
      comisionComprador: integer("comision_comprador"),
      senaUsd: integer("sena_usd"),
      fechaReserva: timestamp("fecha_reserva"),
      fechaBoleto: timestamp("fecha_boleto"),
      fechaEscritura: timestamp("fecha_escritura"),
      escribanoVendedor: text("escribano_vendedor"),
      escribanoComprador: text("escribano_comprador"),
      notas: text("notas"),
      // Marca si ya se generaron las líneas de comisiones para esta reserva,
      // para no duplicarlas si el estado se vuelve a guardar.
      comisionesGeneradas: boolean("comisiones_generadas").notNull().default(false),
      agenteId: text("agente_id")
        .notNull()
        .references(() => usuarios.id),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const reservasVentaRelations = relations(reservasVenta, ({ one }) => ({
      propiedad: one(propiedades, {
              fields: [reservasVenta.propiedadId],
              references: [propiedades.id],
      }),
      agente: one(usuarios, {
              fields: [reservasVenta.agenteId],
              references: [usuarios.id],
      }),
}));

export const estadoReservaAlquilerEnum = pgEnum("estado_reserva_alquiler", [
      "RESERVADA",
      "FIRMADA",
      "CANCELADA",
]);

export const reservasAlquiler = pgTable("reservas_alquiler", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      propiedadId: text("propiedad_id").references(() => propiedades.id),
      nombrePropiedad: text("nombre_propiedad").notNull(),
      codigoExterno: text("codigo_externo"),
      linkPublicacion: text("link_publicacion"),
      estado: estadoReservaAlquilerEnum("estado").notNull().default("RESERVADA"),
      propietarioNombre: text("propietario_nombre"),
      propietarioTelefono: text("propietario_telefono"),
      propietarioCedula: text("propietario_cedula"),
      inquilinoNombre: text("inquilino_nombre"),
      inquilinoTelefono: text("inquilino_telefono"),
      inquilinoCedula: text("inquilino_cedula"),
      precioMensual: integer("precio_mensual"),
      moneda: text("moneda").notNull().default("UYU"),
      duracionMeses: integer("duracion_meses"),
      fechaReserva: timestamp("fecha_reserva"),
      fechaFirma: timestamp("fecha_firma"),
      garantia: text("garantia"),
      escribano: text("escribano"),
      comisionTotalUsd: integer("comision_total_usd"),
      notas: text("notas"),
      comisionesGeneradas: boolean("comisiones_generadas").notNull().default(false),
      agenteId: text("agente_id")
        .notNull()
        .references(() => usuarios.id),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const reservasAlquilerRelations = relations(reservasAlquiler, ({ one }) => ({
      propiedad: one(propiedades, {
              fields: [reservasAlquiler.propiedadId],
              references: [propiedades.id],
      }),
      agente: one(usuarios, {
              fields: [reservasAlquiler.agenteId],
              references: [usuarios.id],
      }),
}));

// Reparto de comisiones: una fila por beneficiario y por operación (el
// agente que cerró +, si corresponde, el override del Team Leader). Ver
// src/lib/comisiones.ts para cómo se calculan los montos.
export const tipoOperacionComisionEnum = pgEnum("tipo_operacion_comision", [
      "VENTA",
      "ALQUILER",
]);

export const comisiones = pgTable("comisiones", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      tipoOperacion: tipoOperacionComisionEnum("tipo_operacion").notNull(),
      reservaVentaId: text("reserva_venta_id").references(() => reservasVenta.id),
      reservaAlquilerId: text("reserva_alquiler_id").references(() => reservasAlquiler.id),
      beneficiarioId: text("beneficiario_id")
        .notNull()
        .references(() => usuarios.id),
      concepto: text("concepto").notNull(),
      porcentaje: doublePrecision("porcentaje").notNull(),
      monto: integer("monto").notNull(),
      pagada: boolean("pagada").notNull().default(false),
      fechaPago: timestamp("fecha_pago"),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const comisionesRelations = relations(comisiones, ({ one }) => ({
      reservaVenta: one(reservasVenta, {
              fields: [comisiones.reservaVentaId],
              references: [reservasVenta.id],
      }),
      reservaAlquiler: one(reservasAlquiler, {
              fields: [comisiones.reservaAlquilerId],
              references: [reservasAlquiler.id],
      }),
      beneficiario: one(usuarios, {
              fields: [comisiones.beneficiarioId],
              references: [usuarios.id],
      }),
}));

// Biblioteca de Capacitación: documentos de entrenamiento (PDF subido acá,
// o un link externo cuando el archivo es muy pesado para guardarlo en la
// base). El buscador inteligente con IA (preguntar en lenguaje natural)
// todavía no está — ver nota en /capacitacion — así que por ahora esto es
// solo la biblioteca con filtro por texto.
export const documentosCapacitacion = pgTable("documentos_capacitacion", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      titulo: text("titulo").notNull(),
      descripcion: text("descripcion"),
      archivo: text("archivo"), // data URI base64 (PDF chico) o null si se usa link
      archivoNombre: text("archivo_nombre"),
      archivoPesoBytes: integer("archivo_peso_bytes"),
      link: text("link"), // alternativa a subir el archivo (ej. Google Drive)
      paginas: integer("paginas"),
      subidoPorId: text("subido_por_id")
        .notNull()
        .references(() => usuarios.id),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const documentosCapacitacionRelations = relations(documentosCapacitacion, ({ one }) => ({
      subidoPor: one(usuarios, {
              fields: [documentosCapacitacion.subidoPorId],
              references: [usuarios.id],
      }),
}));

// Tasaciones: Método Comparativo de Mercado. Se carga la propiedad a tasar
// más un mínimo de 4 comparables (cada uno con su propio precio, m²,
// estado 1-4 y ubicación 1-4); el cálculo pondera cada comparable según
// qué tan parecido es a la propiedad sujeto (ver src/lib/tasaciones.ts)
// para llegar a un USD/m² y un valor estimado. El "Análisis Inteligente"
// (score de liquidez, riesgo de sobreprecio, rango mínimo/máximo con
// comentario) que tiene Lumen OS todavía no está — depende de la misma
// decisión de proveedor de IA que Capacitación / Carta Semanal.
export const tasaciones = pgTable("tasaciones", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      tipo: text("tipo").notNull(),
      direccion: text("direccion"),
      zona: text("zona"),
      link: text("link"),
      m2: doublePrecision("m2").notNull(),
      estado: integer("estado").notNull(),
      ubicacion: integer("ubicacion").notNull(),
      comparables: jsonb("comparables").notNull().$type<
        {
          link: string;
          m2: number;
          precio: number;
          esCierre: boolean;
          estado: number;
          ubicacion: number;
        }[]
      >(),
      promedioUsdM2: doublePrecision("promedio_usd_m2").notNull(),
      valorEstimado: integer("valor_estimado").notNull(),
      ajusteManual: integer("ajuste_manual"),
      notas: text("notas"),
      agenteId: text("agente_id")
        .notNull()
        .references(() => usuarios.id),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const tasacionesRelations = relations(tasaciones, ({ one }) => ({
      agente: one(usuarios, {
              fields: [tasaciones.agenteId],
              references: [usuarios.id],
      }),
}));

// Escalafón de comisiones: los "escalones" (Agente Junior, Agente, Asesor,
// Ejecutivo, y los que se agreguen a futuro) con la facturación acumulada
// necesaria para alcanzar cada uno y el % de comisión que corresponde.
// Editable desde /ajustes — a propósito no es un enum fijo en el código,
// para que Rosario pueda agregar escalones nuevos sin pedir un cambio de
// código. `clave` es lo que se guarda en usuarios.nivel_comision.
export const nivelesComision = pgTable("niveles_comision", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      clave: text("clave").notNull().unique(),
      nombre: text("nombre").notNull(),
      facturacionMinima: integer("facturacion_minima").notNull().default(0),
      porcentaje: doublePrecision("porcentaje").notNull(),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

// Agenda completa: todo lo que no es una "visita a propiedad" (esas siguen
// en `visitas`, con su flujo de Realizada / No se presentó). Acá entran
// visitas de captación, reuniones, reuniones de equipo, tasaciones, firmas,
// creación de material gráfico y otros. Propiedad y contacto son opcionales.
// `tipo` y `estado` son texto (no enum) para poder sumar tipos nuevos sin
// migrar la base. Ver src/lib/calendario.ts.
export const actividades = pgTable("actividades", {
      id: text("id").primaryKey().$defaultFn(() => createId()),
      tipo: text("tipo").notNull(),
      titulo: text("titulo").notNull(),
      fecha: timestamp("fecha").notNull(),
      duracionMin: integer("duracion_min"),
      lugar: text("lugar"),
      notas: text("notas"),
      resultado: text("resultado"),
      estado: text("estado").notNull().default("PENDIENTE"),
      propiedadId: text("propiedad_id").references(() => propiedades.id),
      contactoId: text("contacto_id").references(() => contactos.id),
      agenteId: text("agente_id")
        .notNull()
        .references(() => usuarios.id),
      creadoEn: timestamp("creado_en").notNull().defaultNow(),
});
