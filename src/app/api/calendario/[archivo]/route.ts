import { calendarioIcs, verificarTokenCalendario } from "@/lib/ics";

// Enlace privado de suscripción para Google Calendar (u otro calendario):
//   /api/calendario/<token>.ics
// Google lo vuelve a leer solo cada algunas horas. Ver src/lib/ics.ts.
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ archivo: string }> }
) {
  const { archivo } = await params;
  const token = decodeURIComponent(archivo).replace(/\.ics$/i, "");
  const usuarioId = await verificarTokenCalendario(token);
  if (!usuarioId) return new Response("Enlace no válido", { status: 404 });

  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const ics = await calendarioIcs(usuarioId, `${proto}://${host}/agenda`);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="orion.ics"',
      "Cache-Control": "no-store",
    },
  });
}
