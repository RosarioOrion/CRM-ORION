// Capacitación: cómo se muestra cada material dentro de Orion.

export const TIPOS_MATERIAL = ["PDF", "VIDEO"] as const;
export type TipoMaterial = (typeof TIPOS_MATERIAL)[number];

export const TIPO_MATERIAL_LABEL: Record<TipoMaterial, string> = {
  PDF: "Documento PDF",
  VIDEO: "Clase grabada",
};

export function esTipoMaterial(v: string): v is TipoMaterial {
  return (TIPOS_MATERIAL as readonly string[]).includes(v);
}

export function pesoLegible(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Cómo mostrar un link adentro de Orion: reproductor/visor embebido o nada. */
export type Visor =
  | { tipo: "iframe"; src: string }
  | { tipo: "video"; src: string }
  | null;

/**
 * Convierte un link (YouTube, Vimeo, Google Drive, Loom o un archivo .mp4/.pdf
 * directo) en algo que se pueda ver dentro de la página. Si no lo reconoce,
 * devuelve null y se ofrece abrir el link en otra pestaña.
 */
export function visorDeLink(link: string): Visor {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");

  // YouTube: watch?v=ID, youtu.be/ID, /shorts/ID, /live/ID, /embed/ID
  if (host === "youtube.com" || host === "youtu.be" || host === "youtube-nocookie.com") {
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1).split("/")[0]
        : url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|live|embed)\/([^/?]+)/)?.[1];
    if (id) return { tipo: "iframe", src: `https://www.youtube.com/embed/${id}` };
  }

  // Vimeo: vimeo.com/123456 (o /123456/hash de videos privados)
  if (host === "vimeo.com") {
    const m = url.pathname.match(/^\/(\d+)(?:\/([0-9a-f]+))?/);
    if (m) return { tipo: "iframe", src: `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ""}` };
  }
  if (host === "player.vimeo.com") return { tipo: "iframe", src: link };

  // Google Drive: /file/d/ID/view → /file/d/ID/preview (sirve para PDF y video)
  if (host === "drive.google.com") {
    const id = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? url.searchParams.get("id");
    if (id) return { tipo: "iframe", src: `https://drive.google.com/file/d/${id}/preview` };
  }

  // Google Docs / Slides / Sheets: modo vista previa
  if (host === "docs.google.com") {
    const m = url.pathname.match(/^\/(document|presentation|spreadsheets)\/d\/([^/]+)/);
    if (m) return { tipo: "iframe", src: `https://docs.google.com/${m[1]}/d/${m[2]}/preview` };
  }

  // Loom: /share/ID → /embed/ID
  if (host === "loom.com") {
    const id = url.pathname.match(/^\/(?:share|embed)\/([^/?]+)/)?.[1];
    if (id) return { tipo: "iframe", src: `https://www.loom.com/embed/${id}` };
  }

  // Archivos directos
  if (/\.(mp4|webm|ogg|mov)$/i.test(url.pathname)) return { tipo: "video", src: link };
  if (/\.pdf$/i.test(url.pathname)) return { tipo: "iframe", src: link };

  return null;
}
