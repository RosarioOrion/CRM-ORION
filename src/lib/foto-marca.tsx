import { ImageResponse } from "next/og";
import sharp from "sharp";
import { precioTexto } from "@/lib/sitio";

// Foto branded: la foto principal de la propiedad con una franja de Orion
// (logo, operación, precio, dormitorios, m² y zona). Sin teléfono ni mail a
// propósito: los portales bajan los avisos que muestran datos de contacto.
// Se genera al momento, así que si cambia el precio la imagen ya sale nueva.

export const FORMATOS = {
  cuadrado: { ancho: 1080, alto: 1080, label: "Cuadrado", uso: "Feed" },
  vertical: { ancho: 1080, alto: 1920, label: "Vertical", uso: "Historias" },
  horizontal: { ancho: 1200, alto: 630, label: "Horizontal", uso: "Mail / informe" },
} as const;

export type Formato = keyof typeof FORMATOS;

export function esFormato(f: string): f is Formato {
  return f in FORMATOS;
}

export type DatosFotoMarca = {
  operacion: string;
  tipo: string;
  precio: number | null;
  moneda: string;
  dormitorios: number | null;
  banos: number | null;
  m2Cubiertos: number | null;
  m2Privados: number | null;
  m2Terreno: number | null;
  hectareas: number | null;
  zona: string;
  departamento: string | null;
  estado: string;
};

const NAVY = "#0a1830";
const DORADO = "#c99a3e";

function decodificarDataUrl(dataUrl: string | null): Buffer | null {
  if (!dataUrl) return null;
  const coma = dataUrl.indexOf(",");
  if (coma < 0 || !/^data:image\/[^;]+;base64$/.test(dataUrl.slice(0, coma))) return null;
  return Buffer.from(dataUrl.slice(coma + 1), "base64");
}

// Satori solo lee PNG/JPEG, así que la foto se recorta al tamaño final y se
// pasa a JPEG con sharp (también cubre fotos WebP/HEIC viejas).
async function fotoAjustada(foto: Buffer | null, ancho: number, alto: number) {
  if (!foto) return null;
  try {
    const salida = await sharp(foto)
      .rotate()
      .resize({ width: ancho, height: alto, fit: "cover", position: "attention" })
      .jpeg({ quality: 85 })
      .toBuffer();
    return `data:image/jpeg;base64,${salida.toString("base64")}`;
  } catch {
    return null;
  }
}

async function logoPng(origen: string) {
  try {
    const r = await fetch(new URL("/brand/orion-logo.png", origen));
    if (!r.ok) return null;
    const salida = await sharp(Buffer.from(await r.arrayBuffer()))
      .resize({ width: 420 })
      .png()
      .toBuffer();
    return `data:image/png;base64,${salida.toString("base64")}`;
  } catch {
    return null;
  }
}

function etiquetaOperacion(d: DatosFotoMarca) {
  if (d.estado === "RESERVADA") return "Reservada";
  if (d.estado === "VENDIDA") return "Vendida";
  if (d.estado === "ALQUILADA") return "Alquilada";
  return d.operacion === "ALQUILER" ? "En alquiler" : "En venta";
}

function caracteristicas(d: DatosFotoMarca) {
  const partes: string[] = [];
  if (d.dormitorios) partes.push(`${d.dormitorios} dorm.`);
  if (d.banos) partes.push(`${d.banos} ${d.banos === 1 ? "baño" : "baños"}`);
  const m2 = d.m2Cubiertos ?? d.m2Privados ?? d.m2Terreno;
  if (m2) partes.push(`${m2.toLocaleString("es-UY")} m²`);
  else if (d.hectareas) partes.push(`${d.hectareas} ha`);
  return partes.join("  ·  ");
}

export async function generarFotoMarca(
  d: DatosFotoMarca,
  fotoDataUrl: string | null,
  formato: Formato,
  origen: string
) {
  const { ancho, alto } = FORMATOS[formato];
  const [foto, logo] = await Promise.all([
    fotoAjustada(decodificarDataUrl(fotoDataUrl), ancho, alto),
    logoPng(origen),
  ]);

  // Escala de letra según el lado corto, para que se lea igual en los tres.
  const base = Math.min(ancho, alto) / 1080;
  const horizontal = formato === "horizontal";
  const vertical = formato === "vertical";
  const pad = Math.round((horizontal ? 44 : 64) * base * (horizontal ? 1.6 : 1));
  const ubicacion = [d.zona, d.departamento].filter(Boolean).join(", ");
  const detalles = caracteristicas(d);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: NAVY,
        }}
      >
        {foto && (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img src={foto} width={ancho} height={alto} style={{ position: "absolute", top: 0, left: 0 }} />
        )}

        {/* Logo arriba a la izquierda, sobre un velo oscuro para que se lea en fotos claras */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: Math.round(alto * (vertical ? 0.16 : 0.26)),
            display: "flex",
            backgroundImage: "linear-gradient(to bottom, rgba(10,24,48,0.75), rgba(10,24,48,0))",
          }}
        />
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img
            src={logo}
            width={Math.round(260 * base * (horizontal ? 1.5 : 1))}
            height={Math.round(89 * base * (horizontal ? 1.5 : 1))}
            style={{ position: "absolute", top: pad * 0.8, left: pad }}
          />
        )}

        {/* Franja inferior con los datos */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            padding: `${Math.round(pad * 1.6)}px ${pad}px ${Math.round(pad * (vertical ? 3.2 : 1))}px`,
            backgroundImage:
              "linear-gradient(to bottom, rgba(10,24,48,0), rgba(10,24,48,0.88) 35%, rgba(10,24,48,0.97))",
            color: "white",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 * base }}>
            <div
              style={{
                display: "flex",
                backgroundColor: DORADO,
                color: NAVY,
                fontSize: Math.round(28 * base * (horizontal ? 1.3 : 1)),
                padding: `${Math.round(6 * base)}px ${Math.round(18 * base)}px`,
                borderRadius: 999,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              {etiquetaOperacion(d)}
            </div>
            <div style={{ display: "flex", fontSize: Math.round(30 * base * (horizontal ? 1.3 : 1)), opacity: 0.9 }}>
              {d.tipo}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: Math.round(14 * base),
              fontSize: Math.round(78 * base * (horizontal ? 1.25 : 1)),
              color: DORADO,
              lineHeight: 1.05,
            }}
          >
            {precioTexto(d.precio, d.moneda)}
          </div>
          {detalles && (
            <div
              style={{
                display: "flex",
                marginTop: Math.round(10 * base),
                fontSize: Math.round(38 * base * (horizontal ? 1.25 : 1)),
              }}
            >
              {detalles}
            </div>
          )}
          {ubicacion && (
            <div
              style={{
                display: "flex",
                marginTop: Math.round(10 * base),
                fontSize: Math.round(32 * base * (horizontal ? 1.25 : 1)),
                opacity: 0.85,
              }}
            >
              {ubicacion}
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: ancho,
      height: alto,
    }
  );
}
