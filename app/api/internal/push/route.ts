import { NextResponse } from "next/server";
import { sendPushToUsers } from "@/lib/push";

/**
 * Envoi de push « générique » à une liste d'utilisateurs. Route NODE-only,
 * appelée en interne (HTTP) par la logique de récap/rappel qui tourne dans le
 * cycle de sync — ce qui garde web-push HORS du bundle edge de l'instrumentation
 * (même principe que /api/internal/notify-results).
 *
 * Protégée par l'en-tête `x-internal-secret` = AUTH_SECRET.
 */
export async function POST(req: Request) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || req.headers.get("x-internal-secret") !== secret) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const userIds = body?.userIds;
  const payload = body?.payload;
  if (
    !Array.isArray(userIds) ||
    !payload ||
    typeof payload.title !== "string" ||
    typeof payload.body !== "string"
  ) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  await sendPushToUsers(userIds, {
    title: payload.title,
    body: payload.body,
    url: typeof payload.url === "string" ? payload.url : "/chat",
  });

  return NextResponse.json({ ok: true });
}
