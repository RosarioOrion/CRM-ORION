// Revisión automática de datos de una propiedad: busca contradicciones
// entre el título y los datos cargados (operación, barrio, dormitorios y
// m²). Sin IA: reglas de texto. Solo avisa; el agente puede guardar igual.
// La usan el formulario (antes de guardar) y el filtro "Con datos a
// revisar" de Propiedades.

/** Barrios y localidades más usados, para reconocerlos en el título. */
export const BARRIOS_CONOCIDOS = [
  // Montevideo
  "Aguada", "Aires Puros", "Atahualpa", "Bañados de Carrasco", "Barrio Sur", "Belvedere", "Bella Italia",
  "Brazo Oriental", "Buceo", "Capurro", "Carrasco", "Carrasco Norte", "Casabó", "Casavalle", "Centro",
  "Cerrito", "Cerro", "Ciudad Vieja", "Colón", "Cordón", "Flor de Maroñas", "Goes", "Ituzaingó",
  "Jacinto Vera", "Jardines del Hipódromo", "La Blanqueada", "La Comercial", "La Figurita", "La Teja",
  "Larrañaga", "Las Acacias", "Lezica", "Malvín", "Malvín Norte", "Manga", "Maroñas", "Melilla",
  "Mercado Modelo", "Nuevo París", "Palermo", "Parque Batlle", "Parque Rodó", "Paso de la Arena",
  "Paso Molino", "Peñarol", "Piedras Blancas", "Pocitos", "Pocitos Nuevo", "Prado", "Punta Carretas",
  "Punta Gorda", "Punta de Rieles", "Reducto", "Sayago", "Tres Cruces", "Tres Ombúes", "Unión",
  "Villa Biarritz", "Villa Dolores", "Villa Española", "Villa Muñoz", "Villa García",
  // Canelones / Costa de Oro
  "Ciudad de la Costa", "Solymar", "Lagomar", "El Pinar", "Shangrilá", "Neptunia", "Salinas", "Atlántida",
  "Parque del Plata", "La Floresta", "Pando", "Las Piedras", "La Paz", "Barros Blancos", "Canelones",
  // Maldonado
  "Punta del Este", "Maldonado", "Piriápolis", "La Barra", "Manantiales", "José Ignacio", "San Carlos",
];

export type AvisoRevision = { campo: "operacion" | "zona" | "dormitorios" | "m2"; texto: string };

export type DatosRevision = {
  titulo: string;
  operacion: string;
  zona: string;
  dormitorios: number | null;
  m2Cubiertos: number | null;
  m2Privados: number | null;
  m2Terreno: number | null;
};

/** Minúsculas y sin tildes, para comparar textos. */
export function normalizar(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const contienePalabra = (texto: string, frase: string) =>
  new RegExp(`(^|[^a-z0-9])${frase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`).test(texto);

function numero(v: string): number {
  return Number(v.replace(/\./g, "").replace(",", "."));
}

export function revisarPropiedad(d: DatosRevision): AvisoRevision[] {
  const avisos: AvisoRevision[] = [];
  const t = normalizar(d.titulo);

  // 1. Operación
  const diceAlquiler = /alquil|arrend/.test(t);
  const diceVenta = /(^|[^a-z])(venta|vende|vendo|en venta)([^a-z]|$)/.test(t);
  if (diceAlquiler !== diceVenta) {
    const delTitulo = diceAlquiler ? "ALQUILER" : "VENTA";
    if (d.operacion && d.operacion !== delTitulo) {
      avisos.push({
        campo: "operacion",
        texto: `El título dice "${diceAlquiler ? "Alquiler" : "Venta"}" pero la operación cargada es ${
          d.operacion === "ALQUILER" ? "Alquiler" : "Venta"
        }.`,
      });
    }
  }

  // 2. Barrio: el más largo que aparezca (así "Pocitos Nuevo" gana a "Pocitos").
  const zona = normalizar(d.zona.trim());
  const mencionados = BARRIOS_CONOCIDOS.filter((b) => contienePalabra(t, normalizar(b))).sort(
    (a, b) => b.length - a.length
  );
  const barrio = mencionados.find((b) => !mencionados.some((o) => o !== b && normalizar(o).includes(normalizar(b))));
  if (barrio && zona) {
    const b = normalizar(barrio);
    if (!zona.includes(b) && !b.includes(zona)) {
      avisos.push({ campo: "zona", texto: `El título menciona "${barrio}" pero la zona cargada es "${d.zona.trim()}".` });
    }
  }

  // 3. Dormitorios ("2 dorm", "3 dormitorios"; "monoambiente" = 0)
  const dorm = /(\d+)\s*(?:dorm|dormitorio|habitacion|hab\b)/.exec(t);
  const enTitulo = dorm ? Number(dorm[1]) : /monoambiente/.test(t) ? 0 : null;
  if (enTitulo !== null && d.dormitorios !== null && enTitulo !== d.dormitorios) {
    avisos.push({
      campo: "dormitorios",
      texto: `El título dice ${enTitulo === 0 ? "monoambiente" : `${enTitulo} dormitorio(s)`} pero hay ${d.dormitorios} cargado(s).`,
    });
  }

  // 4. m² (tolerancia de 1 m² por redondeos)
  const m2 = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(?:m2|m²|mts|metros)/.exec(t.replace(/m\s*²/g, "m²"));
  const cargados = [d.m2Cubiertos, d.m2Privados, d.m2Terreno].filter((v): v is number => v !== null && v > 0);
  if (m2 && cargados.length) {
    const n = numero(m2[1]);
    if (n > 0 && !cargados.some((c) => Math.abs(c - n) <= 1)) {
      avisos.push({ campo: "m2", texto: `El título dice ${n} m² pero los m² cargados son ${cargados.join(" / ")}.` });
    }
  }

  return avisos;
}
