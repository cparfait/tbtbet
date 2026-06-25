import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculatePayout, DEFAULT_ELO } from "@/lib/odds";
import { calculateEloChange } from "@/lib/elo";
import { z } from "zod";

const createSchema = z.object({
  label: z.string().optional(),
  phase: z.enum(["POOL", "WINNER_BRACKET", "LOSER_BRACKET", "FINAL_SERIES"]),
  round: z.number().int().optional(),
  teamAId: z.string().min(1),
  teamASource: z.enum(["POOL", "WINNER_BRACKET", "LOSER_BRACKET"]),
  teamBId: z.string().min(1),
  teamBSource: z.enum(["POOL", "WINNER_BRACKET", "LOSER_BRACKET"]),
  scheduledAt: z.string().nullable().optional(),
  bettingClosesAt: z.string().nullable().optional(),
  finalSeriesId: z.string().nullable().optional(),
});

const resultSchema = z.object({
  id: z.string().min(1),
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
  result: z.enum(["TEAM_A", "TEAM_B", "DRAW"]),
});

const scheduleSchema = z.object({
  id: z.string().min(1),
  scheduledAt: z.string().nullable(),
  bettingClosesAt: z.string().nullable().optional(),
});

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["LIVE", "SCHEDULED"]),
});

function adminOnly() {
  return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return adminOnly();

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  }

  const { label, ...rest } = parsed.data;
  const match = await prisma.match.create({
    data: {
      ...rest,
      label: label || "Match",
      scheduledAt: rest.scheduledAt ? new Date(rest.scheduledAt) : null,
      bettingClosesAt: rest.bettingClosesAt ? new Date(rest.bettingClosesAt) : null,
    },
  });
  return NextResponse.json(match);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return adminOnly();

  const body = await req.json();

  // Mise à jour du statut LIVE/SCHEDULED uniquement
  if ("status" in body && !("result" in body) && !("scoreA" in body) && !("scheduledAt" in body)) {
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    await prisma.match.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    });
    return NextResponse.json({ success: true });
  }

  // Mise à jour de date uniquement (sans résultat)
  if ("scheduledAt" in body && !("result" in body)) {
    const parsed = scheduleSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

    await prisma.match.update({
      where: { id: parsed.data.id },
      data: {
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        bettingClosesAt: parsed.data.bettingClosesAt ? new Date(parsed.data.bettingClosesAt) : null,
      },
    });
    return NextResponse.json({ success: true });
  }

  // Saisie d'un résultat
  const parsed = resultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  }

  const { id, scoreA, scoreB, result } = parsed.data;

  const match = await prisma.match.findUnique({
    where: { id },
    include: { teamA: true, teamB: true },
  });
  if (!match) return NextResponse.json({ error: "Match introuvable" }, { status: 404 });
  if (result === "DRAW" && match.phase !== "POOL") {
    return NextResponse.json({ error: "Match nul impossible en phase éliminatoire" }, { status: 400 });
  }

  const isCorrection = match.status === "FINISHED";
  const allBets = await prisma.bet.findMany({ where: { matchId: id } });

  const winnerId = result === "TEAM_A" ? match.teamAId : result === "TEAM_B" ? match.teamBId : null;
  const loserId = result === "TEAM_A" ? match.teamBId : result === "TEAM_B" ? match.teamAId : null;

  try {
  await prisma.$transaction(async (tx) => {
    // Correction : annuler les effets du résultat précédent avant de réécrire
    if (isCorrection && match.result) {
      const prevWinnerId = match.result === "TEAM_A" ? match.teamAId : match.result === "TEAM_B" ? match.teamBId : null;
      const prevLoserId = match.result === "TEAM_A" ? match.teamBId : match.result === "TEAM_B" ? match.teamAId : null;

      if (prevWinnerId) {
        await tx.team.update({ where: { id: prevWinnerId }, data: { wins: { decrement: 1 } } });
      }
      if (prevLoserId) {
        if (match.phase === "WINNER_BRACKET") {
          await tx.team.update({ where: { id: prevLoserId }, data: { losses: { decrement: 1 } } });
        } else if (match.phase === "LOSER_BRACKET") {
          await tx.team.update({ where: { id: prevLoserId }, data: { losses: { decrement: 1 }, eliminated: false } });
        }
      }

      // Annuler les paris réglés
      for (const bet of allBets.filter((b) => b.settled)) {
        if (bet.payout && bet.payout > 0) {
          await tx.user.update({ where: { id: bet.userId }, data: { wizzBalance: { decrement: bet.payout } } });
        }
        await tx.bet.update({ where: { id: bet.id }, data: { settled: false, payout: null } });
      }
    }

    // ── ELO : calculer le delta en partant des ELO pré-match ──────────────────
    // Pour une correction, on annule l'ancien delta pour retrouver l'ELO pré-match.
    const prevEloChangeA = isCorrection ? (match.eloChangeA ?? 0) : 0;
    const prevEloChangeB = isCorrection ? (match.eloChangeB ?? 0) : 0;
    const preMatchEloA = match.teamA.elo - prevEloChangeA;
    const preMatchEloB = (match.teamB?.elo ?? DEFAULT_ELO) - prevEloChangeB;
    const { changeA: eloChangeA, changeB: eloChangeB } = calculateEloChange(
      preMatchEloA, preMatchEloB, scoreA, scoreB
    );
    // Ajustement net à appliquer (nouveau delta - ancien delta)
    const eloAdjA = eloChangeA - prevEloChangeA;
    const eloAdjB = eloChangeB - prevEloChangeB;
    await tx.team.update({ where: { id: match.teamAId }, data: { elo: { increment: eloAdjA } } });
    if (match.teamBId) {
      await tx.team.update({ where: { id: match.teamBId }, data: { elo: { increment: eloAdjB } } });
    }

    // Appliquer le nouveau résultat (avec les deltas ELO stockés)
    await tx.match.update({
      where: { id },
      data: { status: "FINISHED", result, scoreA, scoreB, eloChangeA, eloChangeB },
    });

    // Régler tous les paris (y compris ceux annulés ci-dessus)
    const betsToSettle = await tx.bet.findMany({ where: { matchId: id, settled: false } });
    for (const bet of betsToSettle) {
      const won = bet.choice === result;
      const payout = won ? calculatePayout(bet.amountWizz, bet.oddsApplied, bet.jokerUsed) : 0;
      await tx.bet.update({ where: { id: bet.id }, data: { settled: true, payout } });
      if (payout > 0) {
        await tx.user.update({ where: { id: bet.userId }, data: { wizzBalance: { increment: payout } } });
      }
    }

    // Victoire : incrémenter wins du gagnant (toutes phases)
    if (winnerId) {
      await tx.team.update({ where: { id: winnerId }, data: { wins: { increment: 1 } } });
    }

    // Défaites bracket : progression / élimination
    if (match.phase === "WINNER_BRACKET" && loserId) {
      await tx.team.update({ where: { id: loserId }, data: { losses: { increment: 1 } } });
    } else if (match.phase === "LOSER_BRACKET" && loserId) {
      await tx.team.update({ where: { id: loserId }, data: { losses: { increment: 1 }, eliminated: true } });
    }

    // Gestion FinalSeries BO3 (uniquement pour un nouveau résultat, pas une correction)
    if (!isCorrection && match.finalSeriesId && winnerId) {
      const series = await tx.finalSeries.findUnique({ where: { id: match.finalSeriesId } });
      if (series) {
        const isTeamA = winnerId === series.teamAId;
        const newWinsA = series.teamAWins + (isTeamA ? 1 : 0);
        const newWinsB = series.teamBWins + (isTeamA ? 0 : 1);
        const champion = newWinsA >= 2 ? series.teamAId : newWinsB >= 2 ? series.teamBId : null;

        await tx.finalSeries.update({
          where: { id: series.id },
          data: { teamAWins: newWinsA, teamBWins: newWinsB, winnerTeamId: champion ?? undefined },
        });

        if (newWinsA === 1 && newWinsB === 1) {
          const existingM3 = await tx.match.findFirst({
            where: { finalSeriesId: series.id, status: { not: "FINISHED" } },
          });
          if (!existingM3) {
            await tx.match.create({
              data: {
                label: "Finale · Match 3",
                phase: "FINAL_SERIES",
                teamAId: series.teamAId,
                teamASource: "WINNER_BRACKET",
                teamBId: series.teamBId,
                teamBSource: "LOSER_BRACKET",
                finalSeriesId: series.id,
              },
            });
          }
        }
      }
    }
  });

  return NextResponse.json({ success: true, betsSettled: allBets.length, isCorrection });
  } catch (err) {
    console.error("[PATCH /api/admin/matches result]", err);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du résultat" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return adminOnly();

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

  await prisma.bet.deleteMany({ where: { matchId: id } });
  await prisma.match.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
