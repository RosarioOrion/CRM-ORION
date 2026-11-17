// "Escuchar" un capítulo: prepara el texto extraído de los PDF para que la
// voz del celular o la computadora lo lea de corrido (gratis, Web Speech API).

const TITULOS: [RegExp, string][] = [
  [/^AFIRMACI[OÓ]NDELCAP[IÍ]TULO$/i, "Afirmación del capítulo"],
  [/^ACCI[OÓ]NASOCIADA$/i, "Acción asociada"],
  [/^MANUALORION$/i, "Manual Orion"],
];
function separarTitulo(t: string): string {
  for (const [re, bien] of TITULOS) if (re.test(t)) return bien;
  return t;
}

/**
 * Limpia el texto de una página para leerlo en voz alta: une palabras
 * cortadas con guion al final de la línea, junta los títulos con letras
 * separadas ("A F I R M A C I Ó N" → "AFIRMACIÓN"), saca números de página,
 * viñetas y emojis, y une las líneas en párrafos.
 */
export function textoParaLeer(texto: string): string {
  return (
    texto
      // palabra cortada al final de la línea: "inmobi-\nliaria"
      .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2")
      // títulos con letras espaciadas (se pierden los espacios entre palabras;
      // los títulos que usa el manual se vuelven a separar)
      .replace(/(?:^|(?<=\s))((?:\p{L} ){2,}\p{L})(?=\s|$|[.,:;])/gu, (m) => separarTitulo(m.replace(/ /g, "")))
      // número de capítulo con dígitos separados: "CAPÍTULO 1 7"
      .replace(/(CAP[IÍ]TULO\s+)(\d) (\d)\b/giu, "$1$2$3")
      // línea cortada en medio de una frase: sigue en minúscula
      .replace(/\n(?=\p{Ll})/gu, " ")
      // líneas que son solo un número (número de página)
      .replace(/^\s*\d{1,3}\s*$/gm, "")
      // viñetas y emojis
      .replace(/[•▪●◦■□◆◇►▶✓✔✗✘→←↑↓★☆]|[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, " ")
      // fin de línea: si la línea terminó en punto queda pausa; si no, sigue la frase
      .replace(/([.!?:;])\s*\n/g, "$1 ")
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .replace(/(\s*\.){2,}/g, ".")
      .replace(/\s+([.,;:!?])/g, "$1")
      .trim()
  );
}

/**
 * Corta el texto en partes cortas (por oraciones, ~220 caracteres): algunas
 * voces se cortan solas con textos largos y así se puede pausar y retomar.
 */
export function partesParaLeer(texto: string, max = 220): string[] {
  const oraciones = texto.match(/[^.!?]+[.!?]+["”»)]*\s*|[^.!?]+$/g) ?? [];
  const partes: string[] = [];
  let actual = "";
  const cerrar = () => {
    if (actual.trim()) partes.push(actual.trim());
    actual = "";
  };
  for (const o of oraciones) {
    if (o.length > max) {
      cerrar();
      // oración muy larga: cortar por comas o espacios
      let resto = o;
      while (resto.length > max) {
        let corte = resto.lastIndexOf(", ", max);
        if (corte < max / 2) corte = resto.lastIndexOf(" ", max);
        if (corte <= 0) corte = max;
        partes.push(resto.slice(0, corte + 1).trim());
        resto = resto.slice(corte + 1);
      }
      actual = resto;
    } else if ((actual + o).length > max) {
      cerrar();
      actual = o;
    } else {
      actual += o;
    }
  }
  cerrar();
  return partes.filter((p) => /\p{L}/u.test(p));
}

/** Orden de preferencia de voces en español: rioplatense primero. */
export function puntajeVoz(lang: string, nombre: string): number {
  const l = lang.toLowerCase().replace("_", "-");
  if (!l.startsWith("es")) return -1;
  let p = 1;
  if (l === "es-uy" || l === "es-ar") p = 6;
  else if (l === "es-419" || l === "es-us" || l === "es-mx") p = 4;
  else if (l === "es-es") p = 3;
  else p = 2;
  // las voces "naturales/neural/online/Google" suelen sonar mejor
  if (/natural|neural|online|google|premium|enhanced|mejorad/i.test(nombre)) p += 0.5;
  return p;
}
