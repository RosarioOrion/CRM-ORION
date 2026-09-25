import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { pushConfig, pushSuscripciones } from "@/db/schema";

// Notificaciones push (recordatorios en el celular).
//
// Las claves VAPID (las que identifican a Orion ante Chrome/Safari) se
// generan solas la primera vez y quedan guardadas en la tabla push_config,
// así no hace falta configurar nada en Railway.

let vapidCache: { publicKey: string; privateKey: string } | null = null;

export async function obtenerVapid() {
  if (vapidCache) return vapidCache;

  const [fila] = await db.select().from(pushConfig).where(eq(pushConfig.id, "vapid"));
  if (fila) {
    vapidCache = { publicKey: fila.publicKey, privateKey: fila.privateKey };
  } else {
    const nuevas = webpush.generateVAPIDKeys();
    await db
      .insert(pushConfig)
      .values({ id: "vapid", publicKey: nuevas.publicKey, privateKey: nuevas.privateKey })
      .onConflictDoNothing();
    // Si otro proceso las creó al mismo tiempo, usar las que quedaron guardadas.
    const [guardada] = await db.select().from(pushConfig).where(eq(pushConfig.id, "vapid"));
    vapidCache = { publicKey: guardada.publicKey, privateKey: guardada.privateKey };
  }

  webpush.setVapidDetails(
    "mailto:rosarioimperium@gmail.com",
    vapidCache.publicKey,
    vapidCache.privateKey
  );
  return vapidCache;
}

export type AvisoPush = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Manda una notificación a todos los dispositivos de esos usuarios.
 * Devuelve cuántas se entregaron. Borra las suscripciones vencidas
 * (dispositivo desinstaló la app o revocó el permiso).
 */
export async function enviarAUsuarios(usuarioIds: string[], aviso: AvisoPush): Promise<number> {
  if (usuarioIds.length === 0) return 0;
  await obtenerVapid();

  const subs = await db
    .select()
    .from(pushSuscripciones)
    .where(inArray(pushSuscripciones.usuarioId, usuarioIds));

  let enviadas = 0;
  const vencidas: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(aviso),
          { TTL: 60 * 60 }
        );
        enviadas++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) vencidas.push(s.id);
        else console.error("[push] error enviando", status, (e as Error).message);
      }
    })
  );

  if (vencidas.length > 0) {
    await db.delete(pushSuscripciones).where(inArray(pushSuscripciones.id, vencidas));
  }
  return enviadas;
}
