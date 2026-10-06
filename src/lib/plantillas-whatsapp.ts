// Mensajes preestablecidos de WhatsApp: variables y textos de arranque.

export type Plantilla = { id: string; titulo: string; emoji: string | null; texto: string };

export type VariablesMensaje = {
  nombre?: string | null;
  agente?: string | null;
  inmobiliaria?: string | null;
  propiedad?: string | null;
  link?: string | null;
};

/** Variables que se pueden usar en los mensajes (se muestran como ayuda). */
export const VARIABLES_AYUDA: { clave: string; descripcion: string }[] = [
  { clave: "{nombre}", descripcion: "Nombre del contacto" },
  { clave: "{agente}", descripcion: "Tu nombre" },
  { clave: "{inmobiliaria}", descripcion: "Nombre de la inmobiliaria" },
  { clave: "{propiedad}", descripcion: "Título de la propiedad (si se envía desde una)" },
  { clave: "{link}", descripcion: "Link a la propiedad en la web (si se envía desde una)" },
];

/** Reemplaza las variables; si falta un dato, usa un texto neutro. */
export function completarMensaje(texto: string, v: VariablesMensaje): string {
  const primerNombre = v.nombre?.trim().split(/\s+/)[0] ?? "";
  const valores: Record<string, string> = {
    nombre: primerNombre,
    agente: v.agente?.trim() ?? "",
    inmobiliaria: v.inmobiliaria?.trim() ?? "",
    propiedad: v.propiedad?.trim() || "la propiedad",
    link: v.link?.trim() ?? "",
  };
  return texto
    .replace(/\{(nombre|agente|inmobiliaria|propiedad|link)\}/gi, (_, k: string) => valores[k.toLowerCase()])
    .replace(/Hola ,/g, "Hola,") // sin nombre de contacto
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([,.!?])/g, "$1")
    .trim();
}

/** Mensajes con los que arranca Orion; después se editan desde /mensajes. */
export const PLANTILLAS_INICIALES: Omit<Plantilla, "id">[] = [
  {
    emoji: "🏡",
    titulo: "Captación de propiedad",
    texto:
      "Hola {nombre}, ¿cómo está? Mi nombre es {agente}, soy asesora inmobiliaria.\nMe contacto porque vi que tiene una propiedad publicada y quería consultarle si continúa disponible.\nEstoy incorporando propiedades en esa zona para comercialización y, si todavía está disponible, me gustaría contar con su autorización para ofrecerla y acercarle potenciales interesados.\nSi le interesa, podemos conversar por acá y me cuenta un poco más sobre la propiedad y las condiciones de comercialización. Desde ya, gracias por su tiempo.",
  },
  {
    emoji: "📅",
    titulo: "Seguimiento semanal",
    texto:
      "Hola {nombre}, ¿cómo estás? Espero que hayas comenzado bien la semana. Te consulto si la propiedad sigue disponible y si hubo alguna novedad de tu lado: consultas, visitas o algún cambio en el precio o las condiciones. Así mantengo la información actualizada para seguir trabajándola. ¡Gracias!",
  },
  {
    emoji: "🔁",
    titulo: "Seguimiento de visita",
    texto:
      "Hola {nombre}, ¿cómo estás? Gracias por visitar {propiedad} con nosotros. ¿Qué te pareció? Me encantaría saber tu opinión y si te quedó alguna duda. Si querés, coordinamos una segunda visita.",
  },
  {
    emoji: "✨",
    titulo: "Nueva propiedad para vos",
    texto:
      "Hola {nombre}, ¿cómo estás? Ingresó una propiedad que creo que te puede interesar: {propiedad}. Te dejo el link para que la veas: {link} ¿Querés que coordinemos una visita?",
  },
  {
    emoji: "👋",
    titulo: "Saludo ocasional",
    texto:
      "Hola {nombre}, ¿cómo estás? Soy {agente}, de {inmobiliaria}. Te escribo simplemente para saludarte y saber cómo andás. Cualquier cosa que necesites del mundo inmobiliario, acá estoy. ¡Que tengas una linda semana!",
  },
  {
    emoji: "🤝",
    titulo: "Fidelización (cliente)",
    texto:
      "Hola {nombre}, ¿cómo estás? Soy {agente}, de {inmobiliaria}. Quería saber cómo estás con tu nuevo hogar 😊 Fue un gusto acompañarte en todo el proceso. Si algún familiar o amigo está pensando en comprar, vender o alquilar, me encantaría ayudarlo con la misma dedicación.",
  },
];
