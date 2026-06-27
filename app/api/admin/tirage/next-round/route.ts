import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { TiragePayload, TiragePairData } from "@/components/tirage-overlay";

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
    const wbWinners = new Map<string, "WINNER_BRACKET">();
    const wbLosers = new Set<string>();

    for (const m of wbMatches) {
      const winnerId = m.result === "TEAM_A" ? m.teamAId : m.result === "TEAM_B" ? m.teamBId : null;
      const loserId  = m.result === "TEAM_A" ? m.teamBId : m.result === "TEAM_B" ? m.teamAId : null;
      if (winnerId) wbWinners.set(winnerId, "WINNER_BRACKET");
      if (loserId)  { wbWinners.delete(loserId); wbLosers.add(loserId); }
    }

    // 4. État des équipes LB
    const teamsInLB    = new Set<string>();
    const lbAlive      = new Map<string, "LOSER_BRACKET" | "WINNER_BRACKET">();
    const lbEliminated = new Set<string>();

    for (const m of lbMatches) {
      if (m.teamAId) teamsInLB.add(m.teamAId);
      if (m.teamBId) teamsInLB.add(m.teamBId);
      const winnerId = m.result === "TEAM_A" ? m.teamAId : m.result === "TEAM_B" ? m.teamBId : null;
      const loserId  = m.result === "TEAM_A" ? m.teamBId : m.result === "TEAM_B" ? m.teamAId : null;
      if (winnerId) lbAlive.set(winnerId, "LOSER_BRACKET");
      if (loserId)  { lbAlive.delete(loserId); lbEliminated.add(loserId); }
    }

    // Perdants WB pas encore entrés en LB
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
      return { wbCreated: 0, lbCreated: 0, grandFinal: true, byes: [], wbPairs: [], lbPairs: [], wbRound: 0, lbRound: 0 };
    }

    const byes: string[] = [];

    // Calcule les rounds
    const wbRound = wbMatches.length > 0
      ? Math.max(...wbMatches.map((m) => m.round ?? 1)) + 1
      : 2;
    const lbRound = lbMatches.length > 0
      ? Math.max(...lbMatches.map((m) => m.round ?? 1)) + 1
      : 2;

    // Prépare les paires WB
    const wbShuffled = shuffle(wbNextTeams);
    if (wbShuffled.length % 2 === 1) byes.push(wbShuffled.pop()!);
    const wbPairIds: { tA: string; tB: string; label: string }[] = [];
    for (let i = 0; i < wbShuffled.length; i += 2) {
      wbPairIds.push({
        tA: wbShuffled[i]!,
        tB: wbShuffled[i + 1]!,
        label: `WB Tour ${wbRound} · M${i / 2 + 1}`,
      });
    }

    // Prépare les paires LB
    const lbShuffled = shuffle(lbNextTeams);
    if (lbShuffled.length % 2 === 1) byes.push(lbShuffled.pop()!);
    const lbPairIds: { tA: string; tB: string; label: string; srcA: string; srcB: string }[] = [];
    for (let i = 0; i < lbShuffled.length; i += 2) {
      const tA = lbShuffled[i]!;
      const tB = lbShuffled[i + 1]!;
      lbPairIds.push({
        tA, tB,
        label: `LB Tour ${lbRound} · M${i / 2 + 1}`,
        srcA: lbAlive.get(tA) ?? "LOSER_BRACKET",
        srcB: lbAlive.get(tB) ?? "LOSER_BRACKET",
      });
    }

    if (wbPairIds.length === 0 && lbPairIds.length === 0) {
      throw new Error("Aucun match à générer. Vérifiez l'état du bracket.");
    }

    // 6. Crée les matchs en DB
    for (const p of wbPairIds) {
      await tx.match.create({
        data: {
          label: p.label,
          phase: "WINNER_BRACKET",
          round: wbRound,
          teamAId: p.tA, teamASource: "WINNER_BRACKET",
          teamBId: p.tB, teamBSource: "WINNER_BRACKET",
        },
      });
    }
    for (const p of lbPairIds) {
      await tx.match.create({
        data: {
          label: p.label,
          phase: "LOSER_BRACKET",
          round: lbRound,
          teamAId: p.tA, teamASource: p.srcA as "WINNER_BRACKET" | "LOSER_BRACKET",
          teamBId: p.tB, teamBSource: p.srcB as "WINNER_BRACKET" | "LOSER_BRACKET",
        },
      });
    }

    // 7. Fetch les détails des équipes pour le payload de l'animation
    const allTeamIds = [
      ...wbPairIds.flatMap((p) => [p.tA, p.tB]),
      ...lbPairIds.flatMap((p) => [p.tA, p.tB]),
    ];
    const teams = await tx.team.findMany({
      where: { id: { in: allTeamIds } },
      select: { id: true, name: true, logoUrl: true },
    });
    const teamMap = new Map(teams.map((t) => [t.id, t]));

    // 8. Construit le TiragePayload
    const wbPairs: TiragePairData[] = wbPairIds.map((p) => ({
      label: p.label,
      teamA: { id: p.tA, name: teamMap.get(p.tA)?.name ?? "?", logoUrl: teamMap.get(p.tA)?.logoUrl ?? null, seed: "WB" },
      teamB: { id: p.tB, name: teamMap.get(p.tB)?.name ?? "?", logoUrl: teamMap.get(p.tB)?.logoUrl ?? null, seed: "WB" },
    }));
    const lbPairs: TiragePairData[] = lbPairIds.map((p) => ({
      label: p.label,
      teamA: { id: p.tA, name: teamMap.get(p.tA)?.name ?? "?", logoUrl: teamMap.get(p.tA)?.logoUrl ?? null, seed: p.srcA === "WINNER_BRACKET" ? "WB→LB" : "LB" },
      teamB: { id: p.tB, name: teamMap.get(p.tB)?.name ?? "?", logoUrl: teamMap.get(p.tB)?.logoUrl ?? null, seed: p.srcB === "WINNER_BRACKET" ? "WB→LB" : "LB" },
    }));

    const tiragePayload: TiragePayload = { wbPairs, lbPairs };

    // 9. Crée le TirageEvent pour diffuser l'animation aux viewers
    const event = await tx.tirageEvent.create({
      data: { payload: tiragePayload as object, currentStep: 0 },
    });

    return {
      wbCreated: wbPairIds.length,
      lbCreated: lbPairIds.length,
      grandFinal: false,
      byes,
      payload: tiragePayload,
      eventId: event.id,
      wbRound,
      lbRound,
    };
  });

  return NextResponse.json({ success: true, ...result });
}
