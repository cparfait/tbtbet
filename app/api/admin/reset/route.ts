import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Remise à zéro des données de JEU. Réservé aux admins.
 *
 * Efface : pronostics (+ jokers), résultats, messages (+ réactions), badges
 * décernés. Remet tous les scores à 0.
 * CONSERVE : comptes utilisateurs, calendrier des matchs, groupes d'amis.
 *
 *   POST /api/admin/reset
 */
export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  try {
    const [predictions, results, messages, badges] = await prisma.$transaction([
      prisma.prediction.deleteMany(),
      prisma.result.deleteMany(),
      // Les réactions sont supprimées en cascade avec les messages.
      prisma.message.deleteMany(),
      prisma.userBadge.deleteMany(),
      prisma.score.updateMany({
        data: {
          points: 0,
          exactScores: 0,
          correctResults: 0,
          previousRank: null,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      predictions: predictions.count,
      results: results.count,
      messages: messages.count,
      badges: badges.count,
    });
  } catch (err) {
    console.error("[admin/reset] échec:", err);
    return NextResponse.json({ error: "Échec de la remise à zéro." }, { status: 500 });
  }
}
