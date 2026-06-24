import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function adminOnly() {
  return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
}

// ── Helpers date ──────────────────────────────────────────────────────────────

function past(days: number, hour = 14) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function future(days: number, hour = 14) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return adminOnly();

  // ── 1. Réinitialisation complète ─────────────────────────────────────────

  await prisma.$transaction(async (tx) => {
    await tx.reaction.deleteMany();
    await tx.pushSubscription.deleteMany();
    await tx.bet.deleteMany();
    await tx.championBet.deleteMany();
    await tx.message.deleteMany();
    await tx.match.deleteMany();
    await tx.finalSeries.deleteMany();
    await tx.team.deleteMany();
    await tx.pool.deleteMany();
    await tx.user.deleteMany({ where: { role: { not: "ADMIN" } } });
    await tx.user.updateMany({
      where: { role: "ADMIN" },
      data: { wizzBalance: 100, jokersLeft: 2, hasSeenWelcome: true, previousWizzRank: null },
    });
  });

  // ── 2. Poules ─────────────────────────────────────────────────────────────

  const [poolA, poolB, poolC] = await Promise.all([
    prisma.pool.create({ data: { name: "Poule A", color: "#E74C3C" } }),
    prisma.pool.create({ data: { name: "Poule B", color: "#3498DB" } }),
    prisma.pool.create({ data: { name: "Poule C", color: "#27AE60" } }),
  ]);

  // ── 3. Équipes ────────────────────────────────────────────────────────────
  // wins = total victoires toutes phases (pour affichage stats)

  const [rois, sultans, pharaons, loups, tigres, lions, aigles, condors, rapaces, faucons] =
    await Promise.all([
      // Poule A
      prisma.team.create({ data: { name: "Les Rois",     player1: "Antoine",   player2: "Lucas",    poolId: poolA.id, wins: 1 } }),
      prisma.team.create({ data: { name: "Les Sultans",  player1: "Thomas",    player2: "Hugo",     poolId: poolA.id, wins: 0 } }),
      prisma.team.create({ data: { name: "Les Pharaons", player1: "Maxime",    player2: "Théo",     poolId: poolA.id, wins: 1 } }),
      // Poule B
      prisma.team.create({ data: { name: "Les Loups",    player1: "Nicolas",   player2: "Pierre",   poolId: poolB.id, wins: 1 } }),
      prisma.team.create({ data: { name: "Les Tigres",   player1: "Julien",    player2: "Simon",    poolId: poolB.id, wins: 0 } }),
      prisma.team.create({ data: { name: "Les Lions",    player1: "Baptiste",  player2: "Clément",  poolId: poolB.id, wins: 1 } }),
      // Poule C
      prisma.team.create({ data: { name: "Les Aigles",   player1: "Alexandre", player2: "François", poolId: poolC.id, wins: 2 } }),
      prisma.team.create({ data: { name: "Les Condors",  player1: "Romain",    player2: "Damien",   poolId: poolC.id, wins: 1 } }),
      prisma.team.create({ data: { name: "Les Rapaces",  player1: "Florian",   player2: "Kevin",    poolId: poolC.id, wins: 2 } }),
      prisma.team.create({ data: { name: "Les Faucons",  player1: "Valentin",  player2: "Adrien",   poolId: poolC.id, wins: 0 } }),
    ]);

  // ── 4. Matchs de poule (tous FINISHED) ───────────────────────────────────
  //
  // Poule A standings :  Rois 4pts · Pharaons 4pts · Sultans 0pts
  // Poule B standings :  Lions 4pts · Loups 3pts · Tigres 1pt
  // Poule C standings :  Rapaces 7pts · Aigles 6pts · Condors 4pts · Faucons 0pts

  type PM = { label: string; tA: typeof rois; tB: typeof rois; sA: number; sB: number; res: "TEAM_A" | "TEAM_B" | "DRAW"; d: Date };

  const poolMatches: PM[] = [
    // Poule A
    { label: "Poule A — Les Rois vs Les Sultans",          tA: rois,    tB: sultans,  sA: 3, sB: 1, res: "TEAM_A", d: past(6, 10) },
    { label: "Poule A — Les Rois vs Les Pharaons",         tA: rois,    tB: pharaons, sA: 2, sB: 2, res: "DRAW",   d: past(5, 14) },
    { label: "Poule A — Les Sultans vs Les Pharaons",      tA: sultans, tB: pharaons, sA: 1, sB: 3, res: "TEAM_B", d: past(4, 10) },
    // Poule B
    { label: "Poule B — Les Loups vs Les Tigres",          tA: loups,   tB: tigres,   sA: 2, sB: 0, res: "TEAM_A", d: past(6, 11) },
    { label: "Poule B — Les Loups vs Les Lions",           tA: loups,   tB: lions,    sA: 1, sB: 2, res: "TEAM_B", d: past(5, 15) },
    { label: "Poule B — Les Tigres vs Les Lions",          tA: tigres,  tB: lions,    sA: 1, sB: 1, res: "DRAW",   d: past(4, 11) },
    // Poule C
    { label: "Poule C — Les Aigles vs Les Condors",        tA: aigles,  tB: condors,  sA: 3, sB: 2, res: "TEAM_A", d: past(6, 12) },
    { label: "Poule C — Les Aigles vs Les Rapaces",        tA: aigles,  tB: rapaces,  sA: 0, sB: 1, res: "TEAM_B", d: past(6, 16) },
    { label: "Poule C — Les Aigles vs Les Faucons",        tA: aigles,  tB: faucons,  sA: 2, sB: 1, res: "TEAM_A", d: past(5, 10) },
    { label: "Poule C — Les Condors vs Les Rapaces",       tA: condors, tB: rapaces,  sA: 2, sB: 2, res: "DRAW",   d: past(5, 16) },
    { label: "Poule C — Les Condors vs Les Faucons",       tA: condors, tB: faucons,  sA: 3, sB: 1, res: "TEAM_A", d: past(4, 12) },
    { label: "Poule C — Les Rapaces vs Les Faucons",       tA: rapaces, tB: faucons,  sA: 2, sB: 0, res: "TEAM_A", d: past(4, 16) },
  ];

  for (const m of poolMatches) {
    await prisma.match.create({
      data: {
        label: m.label, phase: "POOL",
        teamAId: m.tA.id, teamASource: "POOL",
        teamBId: m.tB.id, teamBSource: "POOL",
        status: "FINISHED", result: m.res,
        scoreA: m.sA, scoreB: m.sB,
        scheduledAt: m.d,
      },
    });
  }

  // ── 5. Winner Bracket Round 1 (SCHEDULED, demain) ────────────────────────
  //   WB : 1ers + 2èmes de chaque poule
  //   Rois (A1) · Pharaons (A2) · Lions (B1) · Loups (B2) · Rapaces (C1) · Aigles (C2)

  const [wb1, wb2, wb3] = await Promise.all([
    prisma.match.create({ data: { label: "WB R1 — Les Rois vs Les Loups",      phase: "WINNER_BRACKET", round: 1, teamAId: rois.id,    teamASource: "POOL", teamBId: loups.id,   teamBSource: "POOL", status: "SCHEDULED", scheduledAt: future(1, 10) } }),
    prisma.match.create({ data: { label: "WB R1 — Les Pharaons vs Les Lions",  phase: "WINNER_BRACKET", round: 1, teamAId: pharaons.id, teamASource: "POOL", teamBId: lions.id,   teamBSource: "POOL", status: "SCHEDULED", scheduledAt: future(1, 14) } }),
    prisma.match.create({ data: { label: "WB R1 — Les Rapaces vs Les Aigles",  phase: "WINNER_BRACKET", round: 1, teamAId: rapaces.id,  teamASource: "POOL", teamBId: aigles.id,  teamBSource: "POOL", status: "SCHEDULED", scheduledAt: future(1, 16) } }),
  ]);

  // ── 6. Loser Bracket Round 1 (SCHEDULED, après-demain) ────────────────────
  //   LB : 3èmes + 4ème de Poule C, 3ème de chaque autre poule
  //   Sultans (A3) · Tigres (B3) · Condors (C3) · Faucons (C4)

  await Promise.all([
    prisma.match.create({ data: { label: "LB R1 — Les Sultans vs Les Tigres",  phase: "LOSER_BRACKET", round: 1, teamAId: sultans.id,  teamASource: "POOL", teamBId: tigres.id,   teamBSource: "POOL", status: "SCHEDULED", scheduledAt: future(2, 10) } }),
    prisma.match.create({ data: { label: "LB R1 — Les Condors vs Les Faucons", phase: "LOSER_BRACKET", round: 1, teamAId: condors.id,  teamASource: "POOL", teamBId: faucons.id,  teamBSource: "POOL", status: "SCHEDULED", scheduledAt: future(2, 14) } }),
  ]);

  // ── 7. Joueurs démo ───────────────────────────────────────────────────────

  const passwordHash = await bcrypt.hash("Demo1234!", 10);
  const [alice, bob, charlie, diana, eve] = await Promise.all([
    prisma.user.create({ data: { name: "Alice Dupont",    email: "alice@demo.com",   passwordHash, hasSeenWelcome: true } }),
    prisma.user.create({ data: { name: "Bob Martin",      email: "bob@demo.com",     passwordHash, hasSeenWelcome: true } }),
    prisma.user.create({ data: { name: "Charlie Bernard", email: "charlie@demo.com", passwordHash, hasSeenWelcome: true } }),
    prisma.user.create({ data: { name: "Diana Lefebvre",  email: "diana@demo.com",   passwordHash, hasSeenWelcome: true } }),
    prisma.user.create({ data: { name: "Eve Moreau",      email: "eve@demo.com",     passwordHash, hasSeenWelcome: true } }),
  ]);

  // ── 8. Paris (sur les matchs WB à venir) ─────────────────────────────────

  const bets = [
    { user: alice,   match: wb1, choice: "TEAM_A" as const, amount: 20 }, // Rois
    { user: bob,     match: wb1, choice: "TEAM_B" as const, amount: 15 }, // Loups
    { user: charlie, match: wb2, choice: "TEAM_A" as const, amount: 25 }, // Pharaons
    { user: diana,   match: wb2, choice: "TEAM_B" as const, amount: 20 }, // Lions
    { user: eve,     match: wb3, choice: "TEAM_A" as const, amount: 30 }, // Rapaces
    { user: alice,   match: wb3, choice: "TEAM_A" as const, amount: 10 }, // Rapaces (2e pari d'Alice)
  ];

  for (const bet of bets) {
    await prisma.bet.create({
      data: {
        userId: bet.user.id,
        matchId: bet.match.id,
        choice: bet.choice,
        amountWizz: bet.amount,
        oddsApplied: 2.0,
        settled: false,
      },
    });
    await prisma.user.update({
      where: { id: bet.user.id },
      data: { wizzBalance: { decrement: bet.amount } },
    });
  }

  // ── 9. Paris champion (gratuit) ───────────────────────────────────────────

  await Promise.all([
    prisma.championBet.create({ data: { userId: alice.id, teamId: rapaces.id, amountWizz: 0 } }),
    prisma.championBet.create({ data: { userId: bob.id,   teamId: lions.id,   amountWizz: 0 } }),
  ]);

  return NextResponse.json({
    success: true,
    created: {
      pools: 3, teams: 10,
      poolMatches: poolMatches.length,
      bracketMatches: 5,
      users: 5, bets: bets.length,
    },
  });
}
