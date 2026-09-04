import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Orion",
  description: "CRM Orion — sistema de gestión inmobiliaria",
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
