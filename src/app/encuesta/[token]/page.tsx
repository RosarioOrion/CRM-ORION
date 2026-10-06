import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { encuestaPorToken } from "@/lib/encuestas-db";
import { FormularioEncuesta } from "./formulario-encuesta";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Encuesta de tu visita",
  robots: { index: false, follow: false },
};

export default async function EncuestaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const e = await encuestaPorToken(token);
  if (!e) notFound();
  const nombre = e.contactoNombre.trim().split(/\s+/)[0];

  return (
    <div className="min-h-screen bg-[#f6f5f2] px-4 py-6 text-[#1c2333]">
      <div className="mx-auto max-w-lg">
        <div className="mb-5 flex justify-center rounded-2xl bg-orion-navy py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/orion-logo.png" alt={e.inmobiliaria} className="h-10 w-auto" />
        </div>
        {e.respondidaEn ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="mb-2 text-4xl">🙌</p>
            <h1 className="mb-1 text-lg font-bold">¡Gracias{nombre ? `, ${nombre}` : ""}!</h1>
            <p className="text-sm text-gray-600">Ya recibimos tus respuestas. Nos ayudan muchísimo.</p>
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-xl font-bold">Hola{nombre ? ` ${nombre}` : ""} 👋</h1>
            <p className="mb-5 text-sm text-gray-600">
              Gracias por visitar <strong>{e.propiedadTitulo}</strong> con {e.agenteNombre}. Contanos qué
              te pareció: son solo unos clics.
            </p>
            <FormularioEncuesta
              token={token}
              operacion={e.operacion}
              agente={e.agenteNombre.trim().split(/\s+/)[0]}
              nombre={nombre}
            />
          </>
        )}
      </div>
    </div>
  );
}
