// Cuando baja (o sube) el precio de una propiedad, el precio viejo suele
// estar escrito en el título y en la descripción, en distintos formatos:
// "USD 259.000", "U$S 259.000", "259,000", "259000", "US$ 259 000"...
// Esto encuentra esas apariciones y las cambia por el precio nuevo.

const PREFIJO = String.raw`(?:U\$S|US\$|USD|U\$D|UYU|\$U|\$)`;

export function formatearPrecio(n: number): string {
  return n.toLocaleString("es-UY");
}

function patronNumero(n: number): string {
  // 259000 → "259[.,\s]?000"; 1100000 → "1[.,\s]?100[.,\s]?000"
  const s = String(Math.trunc(Math.abs(n)));
  const grupos: string[] = [];
  for (let i = s.length; i > 0; i -= 3) grupos.unshift(s.slice(Math.max(0, i - 3), i));
  return grupos.join(String.raw`[.,\s]?`);
}

/**
 * Reemplaza el precio viejo por el nuevo dentro de un texto.
 * Si cambia la moneda, también cambia el símbolo que va delante.
 */
export function reemplazarPrecio(
  texto: string,
  anterior: { precio: number; moneda: string },
  nuevo: { precio: number; moneda: string }
): { texto: string; cambios: number } {
  if (!texto || !anterior.precio) return { texto, cambios: 0 };
  const re = new RegExp(String.raw`(${PREFIJO}\s?)?(?<![\d.,])${patronNumero(anterior.precio)}(?![\d]|[.,]\d)`, "g");
  let cambios = 0;
  const monedaCambio = anterior.moneda !== nuevo.moneda;
  const salida = texto.replace(re, (_m, prefijo: string | undefined) => {
    cambios++;
    let pre = prefijo ?? "";
    if (pre && monedaCambio) pre = `${nuevo.moneda} `;
    return `${pre}${formatearPrecio(nuevo.precio)}`;
  });
  return { texto: salida, cambios };
}
