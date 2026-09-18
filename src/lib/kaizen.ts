// Kaizen 5S: checklist semanal de mejora continua, un foco distinto cada
// día de la semana (metodología 5S japonesa aplicada a la operación diaria
// de la inmobiliaria). Se reinicia cada semana: lo que se marcó la semana
// pasada no cuenta para la semana actual.
//
// El contenido (temas y tareas de cada día) es el mismo que usa Lumen OS.
// Queda editable desde el panel de administración por si se quiere ajustar.
export const DIAS_KAIZEN = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"] as const;
export type DiaKaizen = (typeof DIAS_KAIZEN)[number];

export const DIA_KAIZEN_LABEL: Record<DiaKaizen, string> = {
  LUNES: "Lunes",
  MARTES: "Martes",
  MIERCOLES: "Miércoles",
  JUEVES: "Jueves",
  VIERNES: "Viernes",
};

export const DIA_KAIZEN_ICONO: Record<DiaKaizen, string> = {
  LUNES: "📞",
  MARTES: "🗂",
  MIERCOLES: "🧹",
  JUEVES: "🤝",
  VIERNES: "📊",
};

export const DIA_KAIZEN_TEMA: Record<DiaKaizen, string> = {
  LUNES: "Seiri",
  MARTES: "Seiton",
  MIERCOLES: "Seiso",
  JUEVES: "Seiketsu",
  VIERNES: "Shitsuke",
};

export const DIA_KAIZEN_DESCRIPCION: Record<DiaKaizen, string> = {
  LUNES: "Clasificar — Depurar la cartera de propiedades",
  MARTES: "Ordenar — Ejecutar la estrategia del pipeline",
  MIERCOLES: "Limpiar — Ordenar el canal de clientes",
  JUEVES: "Estandarizar — Revisar resultados y ajustar",
  VIERNES: "Disciplina — Cerrar la semana y planificar",
};

/** Devuelve el lunes de la semana de la fecha dada, como "YYYY-MM-DD". */
export function lunesDeSemana(fecha: Date): string {
  const d = new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate())
  );
  const dia = d.getUTCDay(); // 0 = domingo … 6 = sábado
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

// Tareas iniciales para sembrar el módulo — las mismas 20 tareas (4 por
// día) que usa Lumen OS.
export const SEED_KAIZEN_TAREAS: { dia: DiaKaizen; orden: number; texto: string }[] = [
  { dia: "LUNES", orden: 1, texto: "Llamar a propietarios activos" },
  { dia: "LUNES", orden: 2, texto: "Confirmar si cada propiedad sigue vigente" },
  { dia: "LUNES", orden: 3, texto: "Archivar del pipeline propiedades que ya no están en venta" },
  { dia: "LUNES", orden: 4, texto: "Dejar nota en el contacto con el resultado" },

  { dia: "MARTES", orden: 1, texto: "Revisar acciones definidas para cada propiedad" },
  { dia: "MARTES", orden: 2, texto: "Ordenar prioridades de ejecución de la semana" },
  { dia: "MARTES", orden: 3, texto: "Ejecutar las tareas del pipeline" },
  { dia: "MARTES", orden: 4, texto: "Registrar todas las acciones en el sistema" },

  { dia: "MIERCOLES", orden: 1, texto: "Revisar chats de WhatsApp de la semana" },
  { dia: "MIERCOLES", orden: 2, texto: "Confirmar qué clientes siguen buscando propiedad" },
  { dia: "MIERCOLES", orden: 3, texto: "Archivar clientes que ya no están buscando" },
  { dia: "MIERCOLES", orden: 4, texto: "Registrar clientes activos en el sistema" },

  { dia: "JUEVES", orden: 1, texto: "Revisar resultados de la semana" },
  { dia: "JUEVES", orden: 2, texto: "Detectar mejoras en el proceso" },
  { dia: "JUEVES", orden: 3, texto: "Ajustar estrategias de propiedades con bajo rendimiento" },
  { dia: "JUEVES", orden: 4, texto: "Planificar acciones de mejora para la próxima semana" },

  { dia: "VIERNES", orden: 1, texto: "Completar el pipeline semanal con todos los datos" },
  { dia: "VIERNES", orden: 2, texto: "Enviar reporte de la semana" },
  { dia: "VIERNES", orden: 3, texto: "Preparar hoja de propiedades si se solicita" },
  { dia: "VIERNES", orden: 4, texto: "Planificar las acciones de la próxima semana" },
];
