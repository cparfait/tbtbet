import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyMatchResult } from "@/lib/football-data";

const schema = z.object({
  userId: z.string().min(1),
  matchId: z.string().min(1),
  homeScore: z.number().int().min(0).max(20),
  awayScore: z.number().int().min(0).max(20),
  joker: z.boolean().optional().default(false),
});

/**
 * Import / saisie d'un pronostic POUR un joueur (console admin).
 * Sert à reprendre les pronos d'anciens joueurs venus d'une autre appli.
 * Contourne le verrou de coup d'envoi. Si le match est déjà terminé, le
 * pronostic est crédité immédiatement (idempotent, sans double comptage).
 *
 *   POST /api/admin/prediction  { userId, matchId, homeScore, awayScore, joker? }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Pronostic invalide." }, { status: 400 });
  }

  const { userId, matchId, homeScore, awayScore, joker } = parsed.data;

  const [match, existing] = await Promise.all([
    prisma.match.findUnique({ where: { id: matchId }, include: { result: true } }),
    prisma.prediction.findUnique({
      where: { userId_matchId: { userId, matchId } },
    }),
  ]);
  if (!match) {
    return NextResponse.json({ error: "Match introuvable." }, { status: 404 });
  }

  await prisma.prediction.upsert({
    where: { userId_matchId: { userId, matchId } },
    // Sur modification, on ne touche pas à pointsAwarded (évite le double comptage).
    update: { homeScore, awayScore, joker, submittedAt: new Date() },
    create: { userId, matchId, homeScore, awayScore, joker },
  });

  // Crédite immédiatement si le match est terminé ET que ce prono n'a pas
  // déjà été compté (nouveau prono, ou prono encore non scoré).
  let scored = 0;
  const alreadyScored = existing != null && existing.pointsAwarded != null;
  if (match.result?.status === "FINISHED" && !alreadyScored) {
    try {
      const r = await applyMatchResult(
        matchId,
        match.result.homeScore,
        match.result.awayScore
      );
      scored = r.scored;
    } catch (e) {
      // Le prono est sauvegardé ; seul le calcul des points a échoué.
      console.error("[import] scoring échec:", e instanceof Error ? e.message : e);
      return NextResponse.json(
        {
          ok: true,
          scored: 0,
          warning:
            "Prono enregistré, mais l'attribution des points a échoué (voir logs serveur).",
        },
        { status: 200 }
      );
    }
  }

  return NextResponse.json({ ok: true, scored, alreadyScored });
}
