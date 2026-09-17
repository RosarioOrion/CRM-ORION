// Motor de coincidencias: calcula en vivo qué propiedades activas matchean
// cada búsqueda activa de un contacto. No se guarda el match en la base —
// se recalcula siempre con los datos actuales — pero sí se registra cuándo
// Rosario ya avisó al cliente de un match puntual (ver coincidenciasAvisadas
// en el schema).

export type PropiedadParaMatch = {
  id: string;
  codigo: string;
  titulo: string;
  operacion: "VENTA" | "ALQUILER";
  tipo: string;
  zona: string;
  precio: number | null;
  moneda: string;
  dormitorios: number | null;
  banos: number | null;
};

export type BusquedaParaMatch = {
  id: string;
  operacion: "VENTA" | "ALQUILER";
  tipo: string;
  zona: string;
  precioMin: number | null;
  precioMax: number | null;
  moneda: string;
};

export type ResultadoMatch = {
  matchea: boolean;
  /** null cuando no se puede comparar (monedas distintas o sin rango cargado) */
  precioEnRango: boolean | null;
};

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Compara operación + tipo + zona (matching base) y, si se puede, el precio. */
export function evaluarMatch(
  propiedad: PropiedadParaMatch,
  busqueda: BusquedaParaMatch
): ResultadoMatch {
  if (propiedad.operacion !== busqueda.operacion) {
    return { matchea: false, precioEnRango: null };
  }
  if (normalizar(propiedad.tipo) !== normalizar(busqueda.tipo)) {
    return { matchea: false, precioEnRango: null };
  }
  const zonaProp = normalizar(propiedad.zona);
  const zonaBusq = normalizar(busqueda.zona);
  if (!zonaProp.includes(zonaBusq) && !zonaBusq.includes(zonaProp)) {
    return { matchea: false, precioEnRango: null };
  }

  // Matching base OK. Ahora, precio — solo si la moneda coincide y hay
  // precio y rango cargados; si no, queda "sin dato" (null) en vez de
  // descartar el match, porque comparar USD con UYU sería inventar un tipo
  // de cambio.
  let precioEnRango: boolean | null = null;
  if (
    propiedad.precio != null &&
    propiedad.moneda === busqueda.moneda &&
    (busqueda.precioMin != null || busqueda.precioMax != null)
  ) {
    const sobrePiso = busqueda.precioMin == null || propiedad.precio >= busqueda.precioMin;
    const bajoTecho = busqueda.precioMax == null || propiedad.precio <= busqueda.precioMax;
    precioEnRango = sobrePiso && bajoTecho;
  }

  return { matchea: true, precioEnRango };
}

export type CoincidenciaCompleta = {
  busqueda: BusquedaParaMatch & { id: string; contactoId: string; contactoNombre: string };
  propiedad: PropiedadParaMatch;
  precioEnRango: boolean | null;
  avisada: boolean;
  notaAviso: string | null;
};
