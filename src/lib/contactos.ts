export const CATEGORIAS_CONTACTO = [
  "PROPIETARIO_VENTA",
  "PROPIETARIO_ALQUILER",
  "LEAD_VENTA",
  "LEAD_ALQUILER",
  "INVERSOR",
  "DESARROLLADOR",
  "ASESOR",
  "COLEGA",
  "OTRO",
] as const;

export type CategoriaContacto = (typeof CATEGORIAS_CONTACTO)[number];

export const CATEGORIA_LABEL: Record<CategoriaContacto, string> = {
  PROPIETARIO_VENTA: "Propietario (venta)",
  PROPIETARIO_ALQUILER: "Propietario (alquiler)",
  LEAD_VENTA: "Lead (venta)",
  LEAD_ALQUILER: "Lead (alquiler)",
  INVERSOR: "Inversor",
  DESARROLLADOR: "Desarrollador",
  ASESOR: "Asesor",
  COLEGA: "Colega",
  OTRO: "Otro",
};

export const CATEGORIA_COLOR: Record<CategoriaContacto, string> = {
  PROPIETARIO_VENTA:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  PROPIETARIO_ALQUILER:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  LEAD_VENTA:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  LEAD_ALQUILER:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  INVERSOR:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  DESARROLLADOR:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  ASESOR:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  COLEGA:
    "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  OTRO: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

// Agrupaciones usadas por las pestañas de filtro de la lista de Contactos.
export const GRUPOS_CATEGORIA: {
  key: string;
  label: string;
  categorias: CategoriaContacto[];
}[] = [
  { key: "propietarios", label: "Propietarios", categorias: ["PROPIETARIO_VENTA", "PROPIETARIO_ALQUILER"] },
  { key: "leads", label: "Leads", categorias: ["LEAD_VENTA", "LEAD_ALQUILER"] },
  { key: "inversores", label: "Inversores", categorias: ["INVERSOR"] },
  { key: "desarrolladores", label: "Desarrolladores", categorias: ["DESARROLLADOR"] },
  { key: "asesores", label: "Asesores", categorias: ["ASESOR"] },
  { key: "colegas", label: "Colegas", categorias: ["COLEGA"] },
];

export const ORIGENES_CONTACTO = [
  "REFERIDO",
  "CARTEL",
  "PORTAL",
  "REDES_SOCIALES",
  "WEB",
  "OTRO",
] as const;

export type OrigenContacto = (typeof ORIGENES_CONTACTO)[number];

export const ORIGEN_LABEL: Record<OrigenContacto, string> = {
  REFERIDO: "Referido",
  CARTEL: "Cartel",
  PORTAL: "Portal inmobiliario",
  REDES_SOCIALES: "Redes sociales",
  WEB: "Página web",
  OTRO: "Otro",
};

// Placeholder sugerido para el campo "¿Cuál?" según el origen elegido.
export const ORIGEN_DETALLE_PLACEHOLDER: Record<OrigenContacto, string> = {
  REFERIDO: "¿Quién lo refirió?",
  CARTEL: "¿En qué dirección?",
  PORTAL: "¿Cuál portal? (MercadoLibre, InfoCasas, etc.)",
  REDES_SOCIALES: "¿Cuál red? (Instagram, Facebook, etc.)",
  WEB: "Detalle (opcional)",
  OTRO: "Detalle (opcional)",
};

export function esCategoriaValida(valor: string): valor is CategoriaContacto {
  return (CATEGORIAS_CONTACTO as readonly string[]).includes(valor);
}

export function esOrigenValido(valor: string): valor is OrigenContacto {
  return (ORIGENES_CONTACTO as readonly string[]).includes(valor);
}
