import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { captaciones, tasaciones } from "@/db/schema";
import { categoriaDe } from "@/lib/tasacion-pro";

// Si un agente hace la tasación desde Tasaciones (y no desde la tarjeta de la
// captación), Orion la vincula sola cuando no hay dudas: mismo agente,
// captación en "Tasando" sin tasación, misma zona o dirección, mismo tipo de
// propiedad y tasación hecha después de cargar la captación. Si hay más de
// una posible, no adivina: el agente la elige en la tarjeta.

const norm = (t: string | null | undefined) =>
  (t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type Cap = { id: string; zona: string | null; direccion: string | null; titulo: string; tipo: string; creadoEn: Date };
type Tas = { id: string; zona: string | null; direccion: string | null; tipo: string; creadoEn: Date };

export function esLaMisma(c: Cap, t: Tas): boolean {
  if (t.creadoEn < c.creadoEn) return false;
  const catC = categoriaDe(c.tipo);
  const catT = categoriaDe(t.tipo);
  if (catC && catT && catC !== catT) return false;
  const textoCap = ` ${norm([c.zona, c.direccion, c.titulo].join(" "))} `;
  const textoTas = ` ${norm([t.zona, t.direccion].join(" "))} `;
  const zt = norm(t.zona);
  const zc = norm(c.zona);
  const dt = norm(t.direccion);
  return (
    (zt.length > 2 && textoCap.includes(` ${zt} `)) ||
    (zc.length > 2 && textoTas.includes(` ${zc} `)) ||
    (dt.length > 4 && textoCap.includes(` ${dt} `))
  );
}

/** Vincula las tasaciones que corresponden sin dudas. Devuelve cuántas vinculó. */
export async function vincularTasacionesSolas(agenteId: string): Promise<number> {
  const caps = await db
    .select({
      id: captaciones.id,
      zona: captaciones.zona,
      direccion: captaciones.direccion,
      titulo: captaciones.titulo,
      tipo: captaciones.tipo,
      creadoEn: captaciones.creadoEn,
      historial: captaciones.historial,
    })
    .from(captaciones)
    .where(
      and(
        eq(captaciones.agenteId, agenteId),
        eq(captaciones.etapa, "TASANDO"),
        isNull(captaciones.tasacionId),
        isNull(captaciones.convertidaEnPropiedadId)
      )
    );
  if (!caps.length) return 0;

  const [tas, usadas] = await Promise.all([
    db
      .select({ id: tasaciones.id, zona: tasaciones.zona, direccion: tasaciones.direccion, tipo: tasaciones.tipo, creadoEn: tasaciones.creadoEn })
      .from(tasaciones)
      .where(eq(tasaciones.agenteId, agenteId)),
    db.select({ id: captaciones.tasacionId }).from(captaciones).where(and(eq(captaciones.agenteId, agenteId), isNotNull(captaciones.tasacionId))),
  ]);
  const ocupadas = new Set(usadas.map((u) => u.id));
  const libres = tas.filter((t) => !ocupadas.has(t.id));

  let n = 0;
  for (const c of caps) {
    const candidatas = libres.filter((t) => esLaMisma(c, t));
    if (candidatas.length !== 1) continue;
    const t = candidatas[0];
    // Que esa tasación no le sirva también a otra captación.
    if (caps.filter((otra) => esLaMisma(otra, t)).length !== 1) continue;
    await db
      .update(captaciones)
      .set({
        tasacionId: t.id,
        historial: [
          ...(c.historial ?? []),
          { fecha: new Date().toISOString(), texto: "📐 Tasación vinculada sola (hecha desde Tasaciones)" },
        ],
      })
      .where(and(eq(captaciones.id, c.id), isNull(captaciones.tasacionId)));
    ocupadas.add(t.id);
    n++;
  }
  return n;
}

