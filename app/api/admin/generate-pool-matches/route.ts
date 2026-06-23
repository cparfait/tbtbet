import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Génère tous les matchs aller de poules (round-robin) pour chaque poule. */
export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const pools = await prisma.pool.findMany({ include: { teams: true } });

  if (pools.length === 0) {
    return NextResponse.json({ error: "Aucune poule définie." }, { status: 400 });
  }

  // Récupérer les paires déjà existantes (pour ne pas doubler)
  const existing = await prisma.match.findMany({
    where: { phase: "POOL" },
    select: { teamAId: true, teamBId: true },
  });
  const existingPairs = new Set(
    existing.flatMap((m) => [
      `${m.teamAId}:${m.teamBId}`,
      `${m.teamBId}:${m.teamAId}`,
    ])
  );

  const created: string[] = [];

  for (const pool of pools) {
    const teams = pool.teams;
    if (teams.length < 2) continue;

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const teamA = teams[i]!;
        const teamB = teams[j]!;
        const key = `${teamA.id}:${teamB.id}`;
        if (existingPairs.has(key)) continue;

        const match = await prisma.match.create({
          data: {
            label: `${pool.name} — ${teamA.name} vs ${teamB.name}`,
            phase: "POOL",
            teamAId: teamA.id,
            teamASource: "POOL",
            teamBId: teamB.id,
            teamBSource: "POOL",
          },
        });
        created.push(match.id);
        existingPairs.add(`${teamA.id}:${teamB.id}`);
        existingPairs.add(`${teamB.id}:${teamA.id}`);
      }
    }
  }

  return NextResponse.json({ created: created.length, ids: created });
}
