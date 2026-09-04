"use server";

import { db } from "@/db";
import { obtenerSesion } from "@/lib/auth";
import { sql } from "drizzle-orm";

export type PasoMigracion = {
  paso: string;
  ok: boolean;
  detalle: string;
};

async function requerirTeamLeader() {
  const sesion = await obtenerSesion();
  if (!sesion || sesion.rol !== "TEAM_LEADER") {
    throw new Error("No autorizado.");
  }
}

async function paso(
  resultados: PasoMigracion[],
  nombre: string,
  fn: () => Promise<unknown>
) {
  try {
    const r: any = await fn();
    const filas =
      r && typeof r === "object" && "length" in r ? (r as any).length : null;
    resultados.push({
      paso: nombre,
      ok: true,
      detalle: filas !== null ? `${filas} fila(s) afectada(s).` : "OK.",
    });
  } catch (e) {
    resultados.push({
      paso: nombre,
      ok: false,
      detalle: e instanceof Error ? e.message : String(e),
    });
  }
}

export async function ejecutarMigracion(): Promise<PasoMigracion[]> {
  await requerirTeamLeader();
  const resultados: PasoMigracion[] = [];

  // 1. Nuevos valores del enum estado_propiedad (cada uno en su propia
  // sentencia/transacción implícita, porque Postgres no permite usar un
  // valor de enum recién agregado dentro de la misma transacción que lo crea).
  await paso(resultados, "Agregar estado VENDIDA", () =>
    db.execute(sql`ALTER TYPE estado_propiedad ADD VALUE IF NOT EXISTS 'VENDIDA'`)
  );
  await paso(resultados, "Agregar estado ALQUILADA", () =>
    db.execute(sql`ALTER TYPE estado_propiedad ADD VALUE IF NOT EXISTS 'ALQUILADA'`)
  );
  await paso(resultados, "Agregar estado VENDIDA_OTRA_INMOBILIARIA", () =>
    db.execute(
      sql`ALTER TYPE estado_propiedad ADD VALUE IF NOT EXISTS 'VENDIDA_OTRA_INMOBILIARIA'`
    )
  );
  await paso(resultados, "Agregar estado ALQUILADA_OTRA_INMOBILIARIA", () =>
    db.execute(
      sql`ALTER TYPE estado_propiedad ADD VALUE IF NOT EXISTS 'ALQUILADA_OTRA_INMOBILIARIA'`
    )
  );

  // 2. Columna de fotos.
  await paso(resultados, "Agregar columna fotos", () =>
    db.execute(
      sql`ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS fotos jsonb NOT NULL DEFAULT '[]'`
    )
  );

  // 3. Corregir estados de propiedades que tienen la etiqueta vieja
  // entre corchetes en el título (ej: "Casa en Palermo [CERRADA]").
  await paso(
    resultados,
    "Corregir estado -> CERRADA (por título [CERRADA])",
    () =>
      db.execute(
        sql`UPDATE propiedades SET estado = 'CERRADA' WHERE titulo ILIKE '%[CERRADA]%' AND estado != 'CERRADA'`
      )
  );
  await paso(
    resultados,
    "Corregir estado -> VENDIDA_OTRA_INMOBILIARIA",
    () =>
      db.execute(
        sql`UPDATE propiedades SET estado = 'VENDIDA_OTRA_INMOBILIARIA' WHERE titulo ILIKE '%[VENDIDA POR OTRA INMOBILIARIA]%' AND estado != 'VENDIDA_OTRA_INMOBILIARIA'`
      )
  );
  await paso(
    resultados,
    "Corregir estado -> ALQUILADA_OTRA_INMOBILIARIA",
    () =>
      db.execute(
        sql`UPDATE propiedades SET estado = 'ALQUILADA_OTRA_INMOBILIARIA' WHERE titulo ILIKE '%[ALQUILADA POR OTRA INMOBILIARIA]%' AND estado != 'ALQUILADA_OTRA_INMOBILIARIA'`
      )
  );
  await paso(resultados, "Corregir estado -> VENDIDA (por título [VENDIDA])", () =>
    db.execute(
      sql`UPDATE propiedades SET estado = 'VENDIDA' WHERE titulo ILIKE '%[VENDIDA]%' AND titulo NOT ILIKE '%OTRA INMOBILIARIA%' AND estado != 'VENDIDA'`
    )
  );
  await paso(
    resultados,
    "Corregir estado -> ALQUILADA (por título [ALQUILADA])",
    () =>
      db.execute(
        sql`UPDATE propiedades SET estado = 'ALQUILADA' WHERE titulo ILIKE '%[ALQUILADA]%' AND titulo NOT ILIKE '%OTRA INMOBILIARIA%' AND estado != 'ALQUILADA'`
      )
  );

  return resultados;
}

export async function listarTitulosConCorchetes(): Promise<
  { titulo: string; estado: string }[]
> {
  await requerirTeamLeader();
  const r = await db.execute<{ titulo: string; estado: string }>(
    sql`SELECT titulo, estado::text as estado FROM propiedades WHERE titulo LIKE '%[%' ORDER BY titulo`
  );
  return r as unknown as { titulo: string; estado: string }[];
}
