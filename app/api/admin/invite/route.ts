import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Génère un lien d'invitation (token). Réservé aux admins.
 * Par défaut : 20 utilisations, valable 30 jours.
 *
 *   POST /api/admin/invite
 */
export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }
  const token = randomUUID().replace(/-/g, "");
  await prisma.invite.create({
    data: {
      token,
      createdBy: session.user.id,
      usesLeft: 20,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
    },
  });
  return NextResponse.json({ ok: true, token });
}
