// Páginas "para imprimir" de un capítulo del manual: ejercicios,
// autoevaluación y checklist. Se detectan en el texto ya extraído del PDF
// (el mismo del buscador). Se buscan los títulos con su contenido, no las
// menciones del índice del capítulo ("17.10 Autoevaluación").

export type SeccionImprimible = { clave: string; nombre: string; paginas: number[] };

const REGLAS: { clave: string; nombre: string; re: RegExp }[] = [
  { clave: "ejercicios", nombre: "✍️ Ejercicios", re: /(?<!\b(?:el|del|al)\s)Ejercicio\s+\d+\s*[·:\-–]\s*\p{Lu}/iu },
  { clave: "autoevaluacion", nombre: "📝 Autoevaluación", re: /Autoevaluaci[oó]n[\s\S]{0,200}?(Puntu[aá]|1\s*\(nada\)|Afirmaci[oó]n\s+1\s+2)/i },
  { clave: "checklist", nombre: "☑️ Checklist", re: /Checklist[\s\S]{0,80}?☐/i },
];

export function seccionesImprimibles(paginas: { pagina: number; texto: string }[]): SeccionImprimible[] {
  const out: SeccionImprimible[] = [];
  for (const r of REGLAS) {
    const ps = paginas.filter((p) => r.re.test(p.texto)).map((p) => p.pagina);
    if (ps.length) out.push({ clave: r.clave, nombre: r.nombre, paginas: ps });
  }
  return out;
}

/** "10, 12-14" → [10, 12, 13, 14] (dentro de 1..total). */
export function leerRango(texto: string, total: number): number[] {
  const set = new Set<number>();
  for (const parte of texto.split(/[,;\s]+/).filter(Boolean)) {
    const m = /^(\d+)(?:\s*[-–a]\s*(\d+))?$/.exec(parte);
    if (!m) continue;
    let a = Number(m[1]);
    let b = m[2] ? Number(m[2]) : a;
    if (a > b) [a, b] = [b, a];
    for (let i = Math.max(1, a); i <= Math.min(total, b); i++) set.add(i);
  }
  return [...set].sort((x, y) => x - y);
}

/** [10, 11, 12, 15] → "10–12, 15". */
export function rangoLegible(ps: number[]): string {
  const out: string[] = [];
  for (let i = 0; i < ps.length; i++) {
    let j = i;
    while (j + 1 < ps.length && ps[j + 1] === ps[j] + 1) j++;
    out.push(i === j ? `${ps[i]}` : `${ps[i]}–${ps[j]}`);
    i = j;
  }
  return out.join(", ");
}
