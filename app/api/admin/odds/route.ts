import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyMatchResult } from "@/lib/football-data";

const odd = z.number().gt(1).max(1000);
const schema = z.object({
  matchId: z.string().min(1),
  oddsHome: odd,
  oddsDraw: odd,
  oddsAway: odd,
});

/**
 * Saisie/backfill manuel des cotes 1X2 d'un match (admins). Utile pour les
 * matchs déjà joués avant la capture automatique (l'historique n'est pas
 * gratuit sur The Odds API). Si le match est terminé, ses points sont
 * immédiatement recalculés avec ces cotes.
 *
 *   POST /api/admin/odds  { matchId, oddsHome, oddsDraw, oddsAway }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Cotes invalides (décimales > 1, ex. 1.85)." },
      { status: 400 }
    );
  }

  const { matchId, oddsHome, oddsDraw, oddsAway } = parsed.data;
  try {
    const match = await prisma.match.update({
      where: { id: matchId },
      data: { oddsHome, oddsDraw, oddsAway, oddsCapturedAt: new Date() },
      include: { result: true },
    });

    // Match déjà terminé → on ré-applique le résultat pour recalculer les
    // points avec les nouvelles cotes (force: ré-application du barème).
    let scored = 0;
    const finished = match.result?.status === "FINISHED";
    if (finished && match.result) {
      ({ scored } = await applyMatchResult(
        matchId,
        match.result.homeScore,
        match.result.awayScore,
        { force: true }
      ));
    }
    return NextResponse.json({ ok: true, scored, finished });
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement." },
      { status: 500 }
    );
  }
}
