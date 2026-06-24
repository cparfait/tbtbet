import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Tous les matchs de poule doivent être terminés
  const unfinished = await prisma.match.findFirst({
    where: { phase: "POOL", status: { not: "FINISHED" } },
  });
  if (unfinished) {
    return NextResponse.json(
      { error: "Tous les matchs de poule doivent être terminés." },
      { status: 400 },
    );
  }

  // Aucun match de bracket ne doit exister
  const existingBracket = await prisma.match.findFirst({
    where: { phase: { in: ["WINNER_BRACKET", "LOSER_BRACKET"] } },
  });
  if (existingBracket) {
    return NextResponse.json(
      { error: "Des matchs de bracket existent déjà." },
      { status: 400 },
    );
  }

  // Récupérer les poules triées par nom
  const pools = await prisma.pool.findMany({ orderBy: { name: "asc" } });
  if (pools.length !== 3) {
    return NextResponse.json(
      { error: "3 poules exactement sont requises pour la génération automatique." },
      { status: 400 },
    );
  }

  // Classer les équipes de chaque poule
  const rankedPools = await Promise.all(pools.map(rankPool));

  const pA = rankedPools[0]!;
  const pB = rankedPools[1]!;
  const pC = rankedPools[2]!;

  // Vérifications minimales
  if (pA.length < 3 || pB.length < 3 || pC.length < 4) {
    return NextResponse.json(
      { error: "Structure attendue : Poule A/B = 3 équipes, Poule C = 4 équipes." },
      { status: 400 },
    );
  }

  // ── WB R1 : A1 vs B1, A2 vs B2, C1 vs C2 ─────────────────
  // ── LB R1 : A3 vs B3, C3 vs C4 ───────────────────────────
  const wbMatches = [
    { label: "WB Tour 1 · M1", a: pA[0], b: pB[0] },
    { label: "WB Tour 1 · M2", a: pA[1], b: pB[1] },
    { label: "WB Tour 1 · M3", a: pC[0], b: pC[1] },
  ];
  const lbMatches = [
    { label: "LB Tour 1 · M1", a: pA[2], b: pB[2] },
    { label: "LB Tour 1 · M2", a: pC[2], b: pC[3] },
  ];

  await prisma.$transaction(async (tx) => {
    for (const m of wbMatches) {
      await tx.match.create({
        data: {
          label: m.label,
          phase: "WINNER_BRACKET",
          round: 1,
          teamAId: m.a!.id,
          teamASource: "POOL",
          teamBId: m.b!.id,
          teamBSource: "POOL",
        },
      });
    }
    for (const m of lbMatches) {
      await tx.match.create({
        data: {
          label: m.label,
          phase: "LOSER_BRACKET",
          round: 1,
          teamAId: m.a!.id,
          teamASource: "POOL",
          teamBId: m.b!.id,
          teamBSource: "POOL",
        },
      });
    }
  });

  return NextResponse.json({
    success: true,
    wbCreated: wbMatches.length,
    lbCreated: lbMatches.length,
  });
}

// ─────────────────────────────────────────────────────────────
// Classement d'une poule (points → diff. buts → buts marqués)
// ─────────────────────────────────────────────────────────────

async function rankPool(pool: { id: string }) {
  const teams = await prisma.team.findMany({
    where: { poolId: pool.id },
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
    return { ...team, pts: wins * 3 + draws, gd: gf - ga, gf };
  });

  return stats.sort(
    (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf,
  );
}
