import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Orion",
  description: "CRM Orion — sistema de gestión inmobiliaria",
  applicationName: "Orion",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // iPhone: al agregarla a la pantalla de inicio se abre como app, sin barra de Safari.
  appleWebApp: {
    capable: true,
    title: "Orion",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1f45",
};

const THEME_SCRIPT = `
try {
  var t = localStorage.getItem("orion-theme");
  if (t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.dataset.theme = "dark";
  }
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-orion-bg text-[var(--orion-text)]">
        {children}
      </body>
    </html>
  );
}
