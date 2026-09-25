import type { MetadataRoute } from "next";

// Manifiesto de la app web: permite instalar Orion como app en el celular
// (Android/iPhone) y en la computadora, con su propio ícono y ventana.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CRM Orion",
    short_name: "Orion",
    description: "CRM Orion — sistema de gestión inmobiliaria",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    lang: "es",
    background_color: "#0f1f45",
    theme_color: "#0f1f45",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
