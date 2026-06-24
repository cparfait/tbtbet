import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOddsForTeam, getOddsForDraw } from "@/lib/odds";
import { z } from "zod";

const betSchema = z.object({
  matchId: z.string().min(1),
  choice: z.enum(["TEAM_A", "TEAM_B", "DRAW"]),
  amountWizz: z.number().int().min(1),
  jokerUsed: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const parsed = betSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { matchId, choice, amountWizz, jokerUsed } = parsed.data;

  try {
    const [match, user] = await Promise.all([
      prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teamA: { select: { wins: true } },
          teamB: { select: { wins: true } },
        },
      }),
      prisma.user.findUnique({ where: { id: session.user.id } }),
    ]);

    if (!match) {
      return NextResponse.json({ error: "Match introuvable" }, { status: 404 });
    }
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }
    if (match.status !== "SCHEDULED") {
      return NextResponse.json({ error: "Les paris sont fermés pour ce match" }, { status: 400 });
    }
    if (match.bettingClosesAt && new Date(match.bettingClosesAt) <= new Date()) {
      return NextResponse.json({ error: "La date limite de pari est dépassée" }, { status: 400 });
    }
    if (amountWizz > user.wizzBalance) {
      return NextResponse.json({ error: "Solde Wizz insuffisant" }, { status: 400 });
    }
    if (jokerUsed && user.jokersLeft < 1) {
      return NextResponse.json({ error: "Plus de jokers disponibles" }, { status: 400 });
    }

    let oddsApplied: number;
    if (choice === "DRAW") {
      oddsApplied = getOddsForDraw();
    } else if (choice === "TEAM_A") {
      oddsApplied = getOddsForTeam(match.phase, match.teamASource, match.teamBSource, match.teamA.wins);
    } else {
      oddsApplied = getOddsForTeam(match.phase, match.teamBSource, match.teamASource, match.teamB?.wins ?? 0);
    }

    const existingBet = await prisma.bet.findUnique({
      where: { userId_matchId: { userId: user.id, matchId } },
    });

    await prisma.$transaction(async (tx) => {
      if (existingBet) {
        await tx.user.update({
          where: { id: user.id },
          data: { wizzBalance: { increment: existingBet.amountWizz } },
        });
        if (existingBet.jokerUsed) {
          await tx.user.update({
            where: { id: user.id },
            data: { jokersLeft: { increment: 1 } },
          });
        }
        await tx.bet.delete({ where: { id: existingBet.id } });
      }

      await tx.bet.create({
        data: { userId: user.id, matchId, choice, amountWizz, oddsApplied, jokerUsed },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { wizzBalance: { decrement: amountWizz } },
      });

      if (jokerUsed) {
        await tx.user.update({
          where: { id: user.id },
          data: { jokersLeft: { decrement: 1 } },
        });
      }
    });

    return NextResponse.json({ success: true, oddsApplied });
  } catch (err) {
    console.error("[POST /api/bets]", err);
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: `Erreur serveur : ${msg}` }, { status: 500 });
  }
}
