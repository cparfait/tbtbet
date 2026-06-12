// ─────────────────────────────────────────────
// Envoi de notifications push (Web Push / VAPID).
// Nécessite NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY.
// Si les clés ne sont pas configurées, les fonctions sont des no-op.
// ─────────────────────────────────────────────

import type webpushType from "web-push";
import { prisma } from "./prisma";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

let webpush: typeof webpushType | null = null;
let configured: boolean | null = null;

/** Charge web-push dynamiquement (jamais bundlé) et configure les clés VAPID. */
async function ensureConfigured(): Promise<typeof webpushType | null> {
  if (configured === false) return null;
  if (configured && webpush) return webpush;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    configured = false;
    return null;
  }
  webpush = (await import("web-push")).default;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@daronsfc.fr",
    publicKey,
    privateKey
  );
  configured = true;
  return webpush;
}

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string };

async function deliver(subs: SubRow[], payload: PushPayload): Promise<void> {
  const wp = await ensureConfigured();
  if (!wp || subs.length === 0) return;
  const data = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await wp.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data
        );
      } catch (err: unknown) {
        // 404/410 : abonnement expiré → on le purge.
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    })
  );
}

/** Notifie une liste d'utilisateurs. */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<void> {
  if (userIds.length === 0 || !(await ensureConfigured())) return;
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  await deliver(subs, payload);
}

/** Notifie tout le monde sauf l'utilisateur indiqué (ex. auteur d'un message). */
export async function sendPushToAllExcept(
  exceptUserId: string,
  payload: PushPayload
): Promise<void> {
  if (!(await ensureConfigured())) return;
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { not: exceptUserId } },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  await deliver(subs, payload);
}
