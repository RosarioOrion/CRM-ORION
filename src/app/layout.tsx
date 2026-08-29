import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Orion",
  description: "CRM Orion — sistema de gestión inmobiliaria",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-orion-bg text-[var(--orion-text)]">
        {children}
      </body>
    </html>
  );
}
