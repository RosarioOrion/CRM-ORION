"use client";

import { useEffect, useRef, useState } from "react";

// Mapa con OpenStreetMap + Leaflet (gratis, sin clave). Leaflet se carga
// desde unpkg la primera vez que se muestra un mapa.
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

// Centro de Uruguay, por si no se encuentra nada.
const URUGUAY: [number, number] = [-32.8, -56.0];

/* eslint-disable @typescript-eslint/no-explicit-any */
type L = any;

let cargando: Promise<L> | null = null;
function cargarLeaflet(): Promise<L> {
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (cargando) return cargando;
  cargando = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET_CSS;
      document.head.appendChild(css);
    }
    const s = document.createElement("script");
    s.src = LEAFLET_JS;
    s.async = true;
    s.onload = () => resolve(w.L);
    s.onerror = () => {
      cargando = null;
      reject(new Error("No se pudo cargar el mapa."));
    };
    document.head.appendChild(s);
  });
  return cargando;
}

/** Busca un lugar en OpenStreetMap. Devuelve [lat, lng] o null. */
async function buscarLugar(texto: string): Promise<[number, number] | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=uy&q=${encodeURIComponent(texto)}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    const j = (await r.json()) as { lat: string; lon: string }[];
    if (!j.length) return null;
    return [Number(j[0].lat), Number(j[0].lon)];
  } catch {
    return null;
  }
}

/**
 * Prueba de lo más preciso a lo más general: dirección + barrio +
 * departamento, después barrio + departamento y por último el departamento.
 */
async function ubicarAproximado(
  direccion: string,
  zona: string,
  departamento: string
): Promise<{ punto: [number, number]; zoom: number } | null> {
  const intentos: [string, number][] = [];
  if (direccion) intentos.push([[direccion, zona, departamento].filter(Boolean).join(", "), 17]);
  if (zona) intentos.push([[zona, departamento].filter(Boolean).join(", "), 15]);
  if (departamento) intentos.push([departamento, 11]);
  for (const [q, zoom] of intentos) {
    const p = await buscarLugar(q);
    if (p) return { punto: p, zoom };
  }
  return null;
}

/** Saca las coordenadas de un link de Google Maps (o de "lat, lng" escrito). */
export function coordenadasDeTexto(texto: string): [number, number] | null {
  const t = decodeURIComponent(texto.trim());
  const patrones = [
    /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/,
  ];
  for (const re of patrones) {
    const m = re.exec(t);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return [lat, lng];
    }
  }
  return null;
}

const icono = (L: L) =>
  L.divIcon({
    className: "",
    html: '<div style="font-size:34px;line-height:34px;transform:translate(-50%,-100%);filter:drop-shadow(0 2px 2px rgba(0,0,0,.4))">📍</div>',
    iconSize: [0, 0],
  });

function redondear(n: number) {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Mapa de la propiedad.
 * - Solo lectura (ficha): muestra el marcador guardado; si no hay, el barrio.
 * - Editable (formulario): el marcador se arrastra o se mueve tocando el
 *   mapa; "Buscar" lo ubica según dirección/barrio/departamento del
 *   formulario; también se puede pegar un link de Google Maps. Guarda en los
 *   campos ocultos `lat` y `lng`.
 */
export function MapaUbicacion({
  lat,
  lng,
  direccion = "",
  zona = "",
  departamento = "",
  editable = false,
  alto = 300,
}: {
  lat?: number | null;
  lng?: number | null;
  direccion?: string | null;
  zona?: string | null;
  departamento?: string | null;
  editable?: boolean;
  alto?: number;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L>(null);
  const marcadorRef = useRef<L>(null);
  const [punto, setPunto] = useState<[number, number] | null>(
    lat != null && lng != null ? [lat, lng] : null
  );
  const [aproximado, setAproximado] = useState(lat == null || lng == null);
  const [estado, setEstado] = useState<string | null>("Cargando mapa…");
  const [link, setLink] = useState("");

  function ponerMarcador(L: L, p: [number, number], zoom?: number) {
    const mapa = mapaRef.current;
    if (!mapa) return;
    if (!marcadorRef.current) {
      marcadorRef.current = L.marker(p, { draggable: editable, icon: icono(L) }).addTo(mapa);
      if (editable) {
        marcadorRef.current.on("dragend", () => {
          const ll = marcadorRef.current.getLatLng();
          setPunto([redondear(ll.lat), redondear(ll.lng)]);
          setAproximado(false);
        });
      }
    } else {
      marcadorRef.current.setLatLng(p);
    }
    mapa.setView(p, zoom ?? Math.max(mapa.getZoom(), 16));
  }

  // Crear el mapa una sola vez.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      let L: L;
      try {
        L = await cargarLeaflet();
      } catch (e) {
        setEstado(e instanceof Error ? e.message : "No se pudo cargar el mapa.");
        return;
      }
      if (cancelado || !contenedor.current || mapaRef.current) return;
      const mapa = L.map(contenedor.current, { scrollWheelZoom: false }).setView(URUGUAY, 7);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(mapa);
      mapaRef.current = mapa;

      if (editable) {
        mapa.on("click", (ev: any) => {
          const p: [number, number] = [redondear(ev.latlng.lat), redondear(ev.latlng.lng)];
          ponerMarcador(L, p, mapa.getZoom());
          setPunto(p);
          setAproximado(false);
        });
      }

      if (lat != null && lng != null) {
        ponerMarcador(L, [lat, lng], 17);
        setEstado(null);
        return;
      }
      setEstado("Buscando la zona…");
      const r = await ubicarAproximado(direccion ?? "", zona ?? "", departamento ?? "");
      if (cancelado) return;
      if (r) {
        ponerMarcador(L, r.punto, r.zoom);
        setAproximado(r.zoom < 17);
        if (editable) setPunto(r.punto);
        setEstado(null);
      } else {
        setEstado(editable ? "No encontré la zona: tocá el mapa donde está la propiedad." : null);
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si el contenedor cambia de tamaño (ej. se abre el formulario), reajustar.
  useEffect(() => {
    const t = setTimeout(() => mapaRef.current?.invalidateSize(), 300);
    return () => clearTimeout(t);
  });

  async function buscarDesdeFormulario() {
    const form = contenedor.current?.closest("form");
    const valor = (n: string) =>
      String((form?.elements.namedItem(n) as HTMLInputElement | HTMLSelectElement | null)?.value ?? "").trim();
    setEstado("Buscando…");
    const r = await ubicarAproximado(valor("direccion"), valor("zona"), valor("departamento"));
    const L = (window as any).L;
    if (r && L) {
      ponerMarcador(L, r.punto, r.zoom);
      setPunto(r.punto);
      setAproximado(r.zoom < 17);
      setEstado(null);
    } else {
      setEstado("No lo encontré. Tocá el mapa o arrastrá el marcador hasta la propiedad.");
    }
  }

  function usarLink() {
    const p = coordenadasDeTexto(link);
    const L = (window as any).L;
    if (!p) {
      setEstado("Ese link no trae la ubicación. En Google Maps tocá el punto, copiá las coordenadas o el link y pegalo acá.");
      return;
    }
    if (L) ponerMarcador(L, p, 17);
    setPunto(p);
    setAproximado(false);
    setLink("");
    setEstado(null);
  }

  const googleMaps = punto
    ? `https://www.google.com/maps/search/?api=1&query=${punto[0]},${punto[1]}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [direccion, zona, departamento, "Uruguay"].filter(Boolean).join(", ")
      )}`;

  return (
    <div className={editable ? "sm:col-span-2" : ""}>
      {editable && (
        <>
          {/* Solo se guarda una ubicación precisa (dirección encontrada o marcada a mano). */}
          <input type="hidden" name="lat" value={punto && !aproximado ? punto[0] : ""} />
          <input type="hidden" name="lng" value={punto && !aproximado ? punto[1] : ""} />
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">📍 Ubicación en el mapa</p>
            <button
              type="button"
              onClick={buscarDesdeFormulario}
              className="rounded-lg border border-orion-navy/30 px-2 py-1 text-xs font-semibold text-orion-navy hover:bg-orion-navy/10 dark:text-orion-gold"
            >
              Buscar por dirección / barrio
            </button>
          </div>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            Arrastrá el marcador o tocá el mapa donde está la propiedad.
          </p>
        </>
      )}

      <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900">
        <div ref={contenedor} style={{ height: alto, width: "100%" }} className="z-0" />
        {estado && (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-[500] mx-auto w-fit max-w-[90%] rounded-full bg-white/95 px-3 py-1 text-center text-xs font-semibold text-gray-600 shadow">
            {estado}
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {editable ? (
          <>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  usarLink();
                }
              }}
              placeholder="…o pegá un link de Google Maps / coordenadas"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-orion-navy dark:border-gray-600 dark:bg-gray-800"
            />
            <button
              type="button"
              onClick={usarLink}
              className="rounded-lg bg-orion-navy px-2 py-1 font-semibold text-white"
            >
              Usar
            </button>
            {punto && (
              <span className={aproximado ? "text-amber-700 dark:text-amber-300" : "text-emerald-600"}>
                {aproximado
                  ? "Ubicación aproximada (barrio): arrastrá el marcador hasta la propiedad"
                  : "✓ Ubicación marcada — revisá que esté en el lugar correcto"}
              </span>
            )}
          </>
        ) : (
          <>
            {aproximado && (
              <span className="text-amber-700 dark:text-amber-300">
                Ubicación aproximada (barrio). Marcala exacta desde “Editar propiedad”.
              </span>
            )}
            <a href={googleMaps} target="_blank" rel="noreferrer" className="font-semibold text-orion-navy underline dark:text-orion-gold">
              Abrir en Google Maps
            </a>
          </>
        )}
      </div>
    </div>
  );
}
