import { NextRequest, NextResponse } from "next/server";
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

async function rankPool(poolId: string) {
  const teams = await prisma.team.findMany({
    where: { poolId },
    include: {
      matchesAsTeamA: { where: { phase: "POOL", status: "FINISHED" } },
      matchesAsTeamB: { where: { phase: "POOL", status: "FINISHED" } },
    },
  });

  const stats = teams.map((team) => {
    let wins = 0, draws = 0, gf = 0, ga = 0;
    for (const m of team.matchesAsTeamA) {
      gf += m.scoreA ?? 0; ga += m.scoreB ?? 0;
      if (m.result === "TEAM_A") wins++;
      else if (m.result === "DRAW") draws++;
    }
    for (const m of team.matchesAsTeamB) {
      gf += m.scoreB ?? 0; ga += m.scoreA ?? 0;
      if (m.result === "TEAM_B") wins++;
      else if (m.result === "DRAW") draws++;
    }
    return {
      teamId: team.id,
      name: team.name,
      logoUrl: team.logoUrl,
      pts: wins * 3 + draws,
      gd: gf - ga,
      gf,
    };
  });

  return stats.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const unfinished = await prisma.match.findFirst({
    where: { phase: "POOL", status: { not: "FINISHED" } },
  });
  if (unfinished) {
    return NextResponse.json(
      { error: "Tous les matchs de poule doivent être terminés." },
      { status: 400 }
    );
  }

  const existingBracket = await prisma.match.findFirst({
    where: { phase: { in: ["WINNER_BRACKET", "LOSER_BRACKET"] } },
  });
  if (existingBracket) {
    return NextResponse.json(
      { error: "Des matchs de bracket existent déjà. Supprimez-les avant de relancer le tirage." },
      { status: 400 }
    );
  }

  const pools = await prisma.pool.findMany({ orderBy: { name: "asc" } });
  if (pools.length !== 3) {
    return NextResponse.json({ error: "Exactement 3 poules requises." }, { status: 400 });
  }

  const ranked = await Promise.all(pools.map((p) => rankPool(p.id)));
  const [pA, pB, pC] = ranked;

  if (!pA || !pB || !pC || pA.length < 3 || pB.length < 3 || pC.length < 4) {
    return NextResponse.json(
      { error: "Structure attendue : Poule A/B = 3 équipes, Poule C = 4 équipes." },
      { status: 400 }
    );
  }

  // WB seeds : A1, A2, B1, B2, C1, C2
  const wbPool = [
    { ...pA[0]!, seed: "A1" },
    { ...pA[1]!, seed: "A2" },
    { ...pB[0]!, seed: "B1" },
    { ...pB[1]!, seed: "B2" },
    { ...pC[0]!, seed: "C1" },
    { ...pC[1]!, seed: "C2" },
  ];

  // LB seeds : A3, B3, C3, C4
  const lbPool = [
    { ...pA[2]!, seed: "A3" },
    { ...pB[2]!, seed: "B3" },
    { ...pC[2]!, seed: "C3" },
    { ...pC[3]!, seed: "C4" },
  ];

  const wbShuffled = shuffle(wbPool);
  const lbShuffled = shuffle(lbPool);

  const wbPairs = [
    { label: "WB Tour 1 · M1", teamA: wbShuffled[0]!, teamB: wbShuffled[1]! },
    { label: "WB Tour 1 · M2", teamA: wbShuffled[2]!, teamB: wbShuffled[3]! },
    { label: "WB Tour 1 · M3", teamA: wbShuffled[4]!, teamB: wbShuffled[5]! },
  ];
  const lbPairs = [
    { label: "LB Tour 1 · M1", teamA: lbShuffled[0]!, teamB: lbShuffled[1]! },
    { label: "LB Tour 1 · M2", teamA: lbShuffled[2]!, teamB: lbShuffled[3]! },
  ];

  const payload = {
    wbPairs: wbPairs.map((p) => ({
      label: p.label,
      teamA: { id: p.teamA.teamId, name: p.teamA.name, logoUrl: p.teamA.logoUrl, seed: p.teamA.seed },
      teamB: { id: p.teamB.teamId, name: p.teamB.name, logoUrl: p.teamB.logoUrl, seed: p.teamB.seed },
    })),
    lbPairs: lbPairs.map((p) => ({
      label: p.label,
      teamA: { id: p.teamA.teamId, name: p.teamA.name, logoUrl: p.teamA.logoUrl, seed: p.teamA.seed },
      teamB: { id: p.teamB.teamId, name: p.teamB.name, logoUrl: p.teamB.logoUrl, seed: p.teamB.seed },
    })),
  };

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < wbPairs.length; i++) {
      const p = wbPairs[i]!;
      await tx.match.create({
        data: {
          label: p.label,
          phase: "WINNER_BRACKET",
          round: 1,
          teamAId: p.teamA.teamId,
          teamASource: "POOL",
          teamBId: p.teamB.teamId,
          teamBSource: "POOL",
        },
      });
    }
    for (let i = 0; i < lbPairs.length; i++) {
      const p = lbPairs[i]!;
      await tx.match.create({
        data: {
          label: p.label,
          phase: "LOSER_BRACKET",
          round: 1,
          teamAId: p.teamA.teamId,
          teamASource: "POOL",
          teamBId: p.teamB.teamId,
          teamBSource: "POOL",
        },
      });
    }
    await tx.tirageEvent.create({ data: { payload } });
  });

  const event = await prisma.tirageEvent.findFirst({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ success: true, payload, eventId: event?.id });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id, step, end } = await req.json() as { id: string; step?: number; end?: boolean };
  await prisma.tirageEvent.update({
    where: { id },
    data: {
      ...(step !== undefined && { currentStep: step }),
      ...(end && { endedAt: new Date() }),
    },
  });
  return NextResponse.json({ success: true });
}
