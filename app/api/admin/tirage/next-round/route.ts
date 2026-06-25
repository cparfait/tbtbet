import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Aucun match bracket en cours
    const pending = await tx.match.findFirst({
      where: {
        phase: { in: ["WINNER_BRACKET", "LOSER_BRACKET"] },
        status: { in: ["SCHEDULED", "LIVE"] },
      },
    });
    if (pending) {
      throw new Error("Des matchs de bracket sont encore en cours. Terminez-les d'abord.");
    }

    // 2. Tous les matchs WB et LB terminés
    const wbMatches = await tx.match.findMany({
      where: { phase: "WINNER_BRACKET", status: "FINISHED" },
      orderBy: { round: "asc" },
    });
    const lbMatches = await tx.match.findMany({
      where: { phase: "LOSER_BRACKET", status: "FINISHED" },
      orderBy: { round: "asc" },
    });

    // 3. État des équipes WB
    // wbWinners : équipes qui ont gagné leur dernier match WB sans jamais perdre en WB
    const wbWinners = new Map<string, "WINNER_BRACKET">(); // teamId → source
    const wbLosers = new Set<string>();

    for (const m of wbMatches) {
      const winnerId = m.result === "TEAM_A" ? m.teamAId : m.result === "TEAM_B" ? m.teamBId : null;
      const loserId  = m.result === "TEAM_A" ? m.teamBId : m.result === "TEAM_B" ? m.teamAId : null;
      if (winnerId) wbWinners.set(winnerId, "WINNER_BRACKET");
      if (loserId)  { wbWinners.delete(loserId); wbLosers.add(loserId); }
    }

    // 4. État des équipes LB
    // lbAlive : équipes encore en vie dans le LB
    const teamsInLB   = new Set<string>();
    const lbAlive     = new Map<string, "LOSER_BRACKET" | "WINNER_BRACKET">(); // teamId → source d'origine
    const lbEliminated = new Set<string>();

    for (const m of lbMatches) {
      if (m.teamAId) teamsInLB.add(m.teamAId);
      if (m.teamBId) teamsInLB.add(m.teamBId);
      const winnerId = m.result === "TEAM_A" ? m.teamAId : m.result === "TEAM_B" ? m.teamBId : null;
      const loserId  = m.result === "TEAM_A" ? m.teamBId : m.result === "TEAM_B" ? m.teamAId : null;
      if (winnerId) lbAlive.set(winnerId, "LOSER_BRACKET");
      if (loserId)  { lbAlive.delete(loserId); lbEliminated.add(loserId); }
    }

    // Perdants WB pas encore entrés en LB (bye LB ou nouvelle vague)
    for (const teamId of wbLosers) {
      if (!teamsInLB.has(teamId) && !lbEliminated.has(teamId)) {
        lbAlive.set(teamId, "WINNER_BRACKET");
      }
    }

    const wbNextTeams = [...wbWinners.keys()];
    const lbNextTeams = [...lbAlive.keys()];

    // 5. Cas finale : 1 champion WB + 1 champion LB
    if (wbNextTeams.length === 1 && lbNextTeams.length === 1) {
      const existing = await tx.finalSeries.findFirst();
      if (existing) throw new Error("Une finale BO3 existe déjà.");

      const wbChamp = wbNextTeams[0]!;
      const lbChamp = lbNextTeams[0]!;
      const series = await tx.finalSeries.create({
        data: { teamAId: wbChamp, teamBId: lbChamp },
      });
      await tx.match.create({
        data: {
          label: "Finale · Match 1",
          phase: "FINAL_SERIES",
          teamAId: wbChamp, teamASource: "WINNER_BRACKET",
          teamBId: lbChamp, teamBSource: "LOSER_BRACKET",
          finalSeriesId: series.id,
        },
      });
      await tx.match.create({
        data: {
          label: "Finale · Match 2",
          phase: "FINAL_SERIES",
          teamAId: wbChamp, teamASource: "WINNER_BRACKET",
          teamBId: lbChamp, teamBSource: "LOSER_BRACKET",
          finalSeriesId: series.id,
        },
      });
      return { wbCreated: 0, lbCreated: 0, grandFinal: true, byes: [] };
    }

    const byes: string[] = [];

    // 6. Génère les matchs WB du tour suivant
    let wbCreated = 0;
    if (wbNextTeams.length >= 2) {
      const wbRound = wbMatches.length > 0
        ? Math.max(...wbMatches.map((m) => m.round ?? 1)) + 1
        : 2;
      const shuffled = shuffle(wbNextTeams);
      // Si impair, le dernier obtient un bye (pas de match, récupéré au tour suivant)
      if (shuffled.length % 2 === 1) byes.push(shuffled.pop()!);
      for (let i = 0; i < shuffled.length; i += 2) {
        await tx.match.create({
          data: {
            label: `WB Tour ${wbRound} · M${i / 2 + 1}`,
            phase: "WINNER_BRACKET",
            round: wbRound,
            teamAId: shuffled[i]!,   teamASource: "WINNER_BRACKET",
            teamBId: shuffled[i + 1]!, teamBSource: "WINNER_BRACKET",
          },
        });
        wbCreated++;
      }
    }

    // 7. Génère les matchs LB du tour suivant
    let lbCreated = 0;
    if (lbNextTeams.length >= 2) {
      const lbRound = lbMatches.length > 0
        ? Math.max(...lbMatches.map((m) => m.round ?? 1)) + 1
        : 2;
      const shuffled = shuffle(lbNextTeams);
      if (shuffled.length % 2 === 1) byes.push(shuffled.pop()!);
      for (let i = 0; i < shuffled.length; i += 2) {
        const tA = shuffled[i]!;
        const tB = shuffled[i + 1]!;
        await tx.match.create({
          data: {
            label: `LB Tour ${lbRound} · M${i / 2 + 1}`,
            phase: "LOSER_BRACKET",
            round: lbRound,
            teamAId: tA, teamASource: lbAlive.get(tA) ?? "LOSER_BRACKET",
            teamBId: tB, teamBSource: lbAlive.get(tB) ?? "LOSER_BRACKET",
          },
        });
        lbCreated++;
      }
    }

    if (wbCreated === 0 && lbCreated === 0) {
      throw new Error("Aucun match à générer. Vérifiez l'état du bracket.");
    }

    return { wbCreated, lbCreated, grandFinal: false, byes };
  });

  return NextResponse.json({ success: true, ...result });
}
