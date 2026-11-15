// Filosofía de Orion Propiedades (definida por Rosario). Se guarda en
// Ajustes → Filosofía (configuracion_empresa.filosofia) y se muestra como
// "Lección 1" en Capacitación. Formato: párrafos separados por una línea en
// blanco; los compromisos van numerados "1. Título. Explicación".

export const FILOSOFIA_ORION = `Una propiedad puede representar años de trabajo, una etapa que se cierra o un proyecto que empieza. Por eso, antes de hablar de precio, queremos entender qué necesitás, qué plazos tenés y qué te importa cuidar en la operación.

En Orion Propiedades te damos una opinión honesta y te explicamos en qué nos basamos. Acordamos un plan con vos, te mantenemos al tanto de lo que pasa y, si algo necesita cambiar, te proponemos un próximo paso con razones claras.

Nuestro trabajo es que puedas tomar cada decisión con tranquilidad, sabiendo qué estamos haciendo por tu propiedad y por qué.

Nuestros compromisos
1. Escuchamos antes de recomendar. La primera conversación empieza por tus motivos, tus plazos y las condiciones que querés cuidar.
2. Fundamentamos lo que proponemos. Si recomendamos un precio de salida o un ajuste, te mostramos los comparables y te explicamos qué señales vemos en el mercado.
3. Te damos seguimiento, incluso cuando hay poco movimiento. En la fecha acordada te contamos qué hicimos, qué respuesta hubo y qué haríamos a continuación.
4. Decidís con toda la información. Te explicamos el alcance de la exclusiva o de la modalidad abierta, te presentamos las ofertas con sus condiciones y acordamos con vos cualquier cambio de precio.`;

export type BloqueFilosofia =
  | { tipo: "parrafo"; texto: string }
  | { tipo: "titulo"; texto: string }
  | { tipo: "compromiso"; numero: string; titulo: string; texto: string };

/** Divide el texto de Ajustes en párrafos, títulos y compromisos numerados. */
export function leerFilosofia(texto: string): BloqueFilosofia[] {
  const out: BloqueFilosofia[] = [];
  for (const bloque of texto.replace(/\r/g, "").split(/\n\s*\n/)) {
    const lineas = bloque.split("\n").map((l) => l.trim()).filter(Boolean);
    let parrafo: string[] = [];
    const cerrar = () => {
      if (parrafo.length) out.push({ tipo: "parrafo", texto: parrafo.join(" ") });
      parrafo = [];
    };
    for (const l of lineas) {
      const m = /^(\d+)[.)]\s+(.+?[.:!?])\s+(.*)$/.exec(l);
      if (m) {
        cerrar();
        out.push({ tipo: "compromiso", numero: m[1], titulo: m[2], texto: m[3] });
      } else if (lineas.length > 1 && l.length < 60 && !/[.!?]$/.test(l)) {
        cerrar();
        out.push({ tipo: "titulo", texto: l });
      } else parrafo.push(l);
    }
    cerrar();
  }
  return out;
}

/** Cómo ayuda Orion a cumplir cada compromiso (para la capacitación). */
export const COMPROMISOS_EN_ORION = [
  "Captación: primero llamás o escribís y escuchás al propietario; recién después se tasa.",
  "Tasación con comparables vinculada a la captación: es lo que le mostrás al propietario.",
  "Seguimiento del lunes, S8 y S12, con plazos: el sistema te avisa en el Plan del día.",
  "Reservas, ofertas y ajustes de precio quedan registrados y se acuerdan con el propietario.",
];
