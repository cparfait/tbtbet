import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { BracketSource, MatchPhase, MatchResult } from "@/lib/generated/prisma";

function adminOnly() {
  return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
}

function past(days: number, hour = 14): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function future(days: number, hour = 14): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const VALID_PHASES = ["pre-pools-end", "post-bracket-r1", "pre-finale"] as const;
type TestPhase = (typeof VALID_PHASES)[number];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return adminOnly();

  const body = await req.json() as { phase: TestPhase };
  if (!VALID_PHASES.includes(body.phase)) {
    return NextResponse.json({ error: "Phase invalide" }, { status: 400 });
  }
  const testPhase = body.phase;

  // ── Reset (garde les admins) ──────────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    await tx.reaction.deleteMany();
    await tx.pushSubscription.deleteMany();
    await tx.bet.deleteMany();
    await tx.championBet.deleteMany();
    await tx.message.deleteMany();
    await tx.match.deleteMany();
    await tx.finalSeries.deleteMany();
    await tx.tirageEvent.deleteMany();
    await tx.team.deleteMany();
    await tx.pool.deleteMany();
    await tx.user.deleteMany({ where: { role: { not: "ADMIN" } } });
    await tx.user.updateMany({
      where: { role: "ADMIN" },
      data: { wizzBalance: 500, jokersLeft: 3, hasSeenWelcome: true, previousWizzRank: null },
    });
  });

  // ── Poules ────────────────────────────────────────────────────────────────
  const [poolA, poolB, poolC] = await Promise.all([
    prisma.pool.create({ data: { name: "Poule A", color: "#E74C3C" } }),
    prisma.pool.create({ data: { name: "Poule B", color: "#3498DB" } }),
    prisma.pool.create({ data: { name: "Poule C", color: "#27AE60" } }),
  ]);

  // ── Équipes (10) ──────────────────────────────────────────────────────────
  const [rois, sultans, pharaons, loups, tigres, lions, aigles, condors, rapaces, faucons] =
    await Promise.all([
      prisma.team.create({ data: { name: "Les Rois",     player1: "Antoine",   player2: "Lucas",    poolId: poolA.id, elo: 1050 } }),
      prisma.team.create({ data: { name: "Les Sultans",  player1: "Thomas",    player2: "Hugo",     poolId: poolA.id, elo: 980  } }),
      prisma.team.create({ data: { name: "Les Pharaons", player1: "Maxime",    player2: "Théo",     poolId: poolA.id, elo: 1020 } }),
      prisma.team.create({ data: { name: "Les Loups",    player1: "Nicolas",   player2: "Pierre",   poolId: poolB.id, elo: 1010 } }),
      prisma.team.create({ data: { name: "Les Tigres",   player1: "Julien",    player2: "Simon",    poolId: poolB.id, elo: 970  } }),
      prisma.team.create({ data: { name: "Les Lions",    player1: "Baptiste",  player2: "Clément",  poolId: poolB.id, elo: 1040 } }),
      prisma.team.create({ data: { name: "Les Aigles",   player1: "Alexandre", player2: "François", poolId: poolC.id, elo: 1030 } }),
      prisma.team.create({ data: { name: "Les Condors",  player1: "Romain",    player2: "Damien",   poolId: poolC.id, elo: 1000 } }),
      prisma.team.create({ data: { name: "Les Rapaces",  player1: "Florian",   player2: "Kevin",    poolId: poolC.id, elo: 1060 } }),
      prisma.team.create({ data: { name: "Les Faucons",  player1: "Valentin",  player2: "Adrien",   poolId: poolC.id, elo: 960  } }),
    ]);

  // ── 10 utilisateurs démo ──────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Demo1234!", 10);
  const [alice, bob, charlie, diana, eve, frank, grace, hugo, iris, julien] = await Promise.all([
    prisma.user.create({ data: { name: "Alice Dupont",    email: "alice@demo.com",   passwordHash, hasSeenWelcome: true, wizzBalance: 300 } }),
    prisma.user.create({ data: { name: "Bob Martin",      email: "bob@demo.com",     passwordHash, hasSeenWelcome: true, wizzBalance: 300 } }),
    prisma.user.create({ data: { name: "Charlie Bernard", email: "charlie@demo.com", passwordHash, hasSeenWelcome: true, wizzBalance: 300 } }),
    prisma.user.create({ data: { name: "Diana Lefebvre",  email: "diana@demo.com",   passwordHash, hasSeenWelcome: true, wizzBalance: 300 } }),
    prisma.user.create({ data: { name: "Eve Moreau",      email: "eve@demo.com",     passwordHash, hasSeenWelcome: true, wizzBalance: 300 } }),
    prisma.user.create({ data: { name: "Frank Dumont",    email: "frank@demo.com",   passwordHash, hasSeenWelcome: true, wizzBalance: 300 } }),
    prisma.user.create({ data: { name: "Grace Petit",     email: "grace@demo.com",   passwordHash, hasSeenWelcome: true, wizzBalance: 300 } }),
    prisma.user.create({ data: { name: "Hugo Blanc",      email: "hugo@demo.com",    passwordHash, hasSeenWelcome: true, wizzBalance: 300 } }),
    prisma.user.create({ data: { name: "Iris Simon",      email: "iris@demo.com",    passwordHash, hasSeenWelcome: true, wizzBalance: 300 } }),
    prisma.user.create({ data: { name: "Julien Roux",     email: "julien@demo.com",  passwordHash, hasSeenWelcome: true, wizzBalance: 300 } }),
  ]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  async function mkF(
    label: string,
    mp: MatchPhase,
    tAId: string, tAS: BracketSource,
    tBId: string, tBS: BracketSource,
    sA: number, sB: number,
    result: MatchResult,
    scheduledAt: Date,
    round?: number,
  ) {
    return prisma.match.create({
      data: { label, phase: mp, teamAId: tAId, teamASource: tAS, teamBId: tBId, teamBSource: tBS, status: "FINISHED", result, scoreA: sA, scoreB: sB, scheduledAt, round },
    });
  }

  async function mkS(
    label: string,
    mp: MatchPhase,
    tAId: string, tAS: BracketSource,
    tBId: string, tBS: BracketSource,
    scheduledAt: Date,
    round?: number,
    finalSeriesId?: string,
  ) {
    return prisma.match.create({
      data: { label, phase: mp, teamAId: tAId, teamASource: tAS, teamBId: tBId, teamBSource: tBS, status: "SCHEDULED", scheduledAt, round, finalSeriesId },
    });
  }

  async function placeBet(userId: string, matchId: string, choice: MatchResult, amount: number) {
    await prisma.bet.create({ data: { userId, matchId, choice, amountWizz: amount, oddsApplied: 2.0, settled: false } });
    await prisma.user.update({ where: { id: userId }, data: { wizzBalance: { decrement: amount } } });
  }

  // ── Matchs de poule communs ───────────────────────────────────────────────
  // (tous FINISHED pour phases 2 et 3 ; partiels pour phase 1)

  async function seedAllPoolsFinished(offset = 0) {
    await mkF("Poule A — Rois vs Sultans",     "POOL", rois.id,    "POOL", sultans.id,  "POOL", 3, 1, "TEAM_A", past(offset + 10, 10));
    await mkF("Poule A — Rois vs Pharaons",    "POOL", rois.id,    "POOL", pharaons.id, "POOL", 2, 2, "DRAW",   past(offset + 9,  14));
    await mkF("Poule A — Sultans vs Pharaons", "POOL", sultans.id, "POOL", pharaons.id, "POOL", 1, 3, "TEAM_B", past(offset + 8,  10));
    await mkF("Poule B — Loups vs Tigres",     "POOL", loups.id,   "POOL", tigres.id,   "POOL", 2, 0, "TEAM_A", past(offset + 10, 11));
    await mkF("Poule B — Loups vs Lions",      "POOL", loups.id,   "POOL", lions.id,    "POOL", 1, 2, "TEAM_B", past(offset + 9,  15));
    await mkF("Poule B — Tigres vs Lions",     "POOL", tigres.id,  "POOL", lions.id,    "POOL", 1, 1, "DRAW",   past(offset + 8,  11));
    await mkF("Poule C — Aigles vs Condors",   "POOL", aigles.id,  "POOL", condors.id,  "POOL", 3, 2, "TEAM_A", past(offset + 10, 12));
    await mkF("Poule C — Aigles vs Rapaces",   "POOL", aigles.id,  "POOL", rapaces.id,  "POOL", 0, 1, "TEAM_B", past(offset + 10, 16));
    await mkF("Poule C — Aigles vs Faucons",   "POOL", aigles.id,  "POOL", faucons.id,  "POOL", 2, 1, "TEAM_A", past(offset + 9,  10));
    await mkF("Poule C — Condors vs Rapaces",  "POOL", condors.id, "POOL", rapaces.id,  "POOL", 2, 2, "DRAW",   past(offset + 9,  16));
    await mkF("Poule C — Condors vs Faucons",  "POOL", condors.id, "POOL", faucons.id,  "POOL", 3, 1, "TEAM_A", past(offset + 8,  12));
    await mkF("Poule C — Rapaces vs Faucons",  "POOL", rapaces.id, "POOL", faucons.id,  "POOL", 2, 0, "TEAM_A", past(offset + 8,  16));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 1 : Fin de poules imminente
  // Poule A : 2/3 terminés · Poule B : 3/3 terminés · Poule C : 5/6 terminés
  // 2 matchs restants → paris dessus
  // ─────────────────────────────────────────────────────────────────────────
  if (testPhase === "pre-pools-end") {
    await mkF("Poule A — Rois vs Sultans",  "POOL", rois.id,   "POOL", sultans.id,  "POOL", 3, 1, "TEAM_A", past(3, 10));
    await mkF("Poule A — Rois vs Pharaons", "POOL", rois.id,   "POOL", pharaons.id, "POOL", 2, 2, "DRAW",   past(2, 14));
    const a3 = await mkS("Poule A — Sultans vs Pharaons", "POOL", sultans.id, "POOL", pharaons.id, "POOL", future(1, 10));

    await mkF("Poule B — Loups vs Tigres", "POOL", loups.id,  "POOL", tigres.id, "POOL", 2, 0, "TEAM_A", past(3, 11));
    await mkF("Poule B — Loups vs Lions",  "POOL", loups.id,  "POOL", lions.id,  "POOL", 1, 2, "TEAM_B", past(2, 15));
    await mkF("Poule B — Tigres vs Lions", "POOL", tigres.id, "POOL", lions.id,  "POOL", 1, 1, "DRAW",   past(1, 11));

    await mkF("Poule C — Aigles vs Condors",  "POOL", aigles.id,  "POOL", condors.id, "POOL", 3, 2, "TEAM_A", past(4, 12));
    await mkF("Poule C — Aigles vs Rapaces",  "POOL", aigles.id,  "POOL", rapaces.id, "POOL", 0, 1, "TEAM_B", past(4, 16));
    await mkF("Poule C — Aigles vs Faucons",  "POOL", aigles.id,  "POOL", faucons.id, "POOL", 2, 1, "TEAM_A", past(3, 10));
    await mkF("Poule C — Condors vs Rapaces", "POOL", condors.id, "POOL", rapaces.id, "POOL", 2, 2, "DRAW",   past(2, 16));
    await mkF("Poule C — Condors vs Faucons", "POOL", condors.id, "POOL", faucons.id, "POOL", 3, 1, "TEAM_A", past(1, 12));
    const c6 = await mkS("Poule C — Rapaces vs Faucons", "POOL", rapaces.id, "POOL", faucons.id, "POOL", future(1, 14));

    await placeBet(alice.id,   a3.id, "TEAM_A", 20);
    await placeBet(bob.id,     a3.id, "TEAM_B", 30);
    await placeBet(charlie.id, a3.id, "DRAW",   15);
    await placeBet(diana.id,   a3.id, "TEAM_B", 25);
    await placeBet(eve.id,     c6.id, "TEAM_A", 30);
    await placeBet(frank.id,   c6.id, "TEAM_A", 20);
    await placeBet(grace.id,   c6.id, "TEAM_B", 15);
    await placeBet(hugo.id,    a3.id, "TEAM_A", 10);
    await placeBet(iris.id,    c6.id, "TEAM_A", 25);
    await placeBet(julien.id,  c6.id, "TEAM_B", 20);

    await prisma.championBet.createMany({ data: [
      { userId: alice.id,   teamId: rapaces.id, amountWizz: 0 },
      { userId: bob.id,     teamId: lions.id,   amountWizz: 0 },
      { userId: charlie.id, teamId: rois.id,    amountWizz: 0 },
    ]});
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 2 : Fin Tour 1 bracket
  // Poules + WB R1 + LB R1 terminés → WB R2 + LB R2 à venir (4 matchs)
  //
  // Classements poules :
  //   A : Rois (1er) · Pharaons (2e) · Sultans (3e)
  //   B : Lions (1er) · Loups (2e) · Tigres (3e)
  //   C : Rapaces (1er) · Aigles (2e) · Condors (3e) · Faucons (4e)
  // WB R1 : Rois bat Loups · Lions bat Pharaons · Rapaces bat Aigles
  // LB R1 : Sultans bat Tigres · Condors bat Faucons
  // WB R2 (SCHEDULED) : Rois vs Rapaces · Lions vs Aigles (wild card)
  // LB R2 (SCHEDULED) : Loups vs Sultans · Pharaons vs Condors
  // ─────────────────────────────────────────────────────────────────────────
  if (testPhase === "post-bracket-r1") {
    await seedAllPoolsFinished(5);

    await mkF("WB R1 — Rois vs Loups",      "WINNER_BRACKET", rois.id,    "POOL", loups.id,   "POOL", 2, 1, "TEAM_A", past(5, 10), 1);
    await mkF("WB R1 — Lions vs Pharaons",   "WINNER_BRACKET", lions.id,   "POOL", pharaons.id,"POOL", 3, 2, "TEAM_A", past(5, 14), 1);
    await mkF("WB R1 — Rapaces vs Aigles",   "WINNER_BRACKET", rapaces.id, "POOL", aigles.id,  "POOL", 2, 0, "TEAM_A", past(5, 16), 1);
    await mkF("LB R1 — Sultans vs Tigres",   "LOSER_BRACKET",  sultans.id, "POOL", tigres.id,  "POOL", 2, 1, "TEAM_A", past(4, 10), 1);
    await mkF("LB R1 — Condors vs Faucons",  "LOSER_BRACKET",  condors.id, "POOL", faucons.id, "POOL", 3, 2, "TEAM_A", past(4, 14), 1);

    const wb2a = await mkS("WB R2 — Rois vs Rapaces",    "WINNER_BRACKET", rois.id,    "WINNER_BRACKET", rapaces.id,  "WINNER_BRACKET", future(2, 14), 2);
    const wb2b = await mkS("WB R2 — Lions vs Aigles",    "WINNER_BRACKET", lions.id,   "WINNER_BRACKET", aigles.id,   "WINNER_BRACKET", future(2, 16), 2);
    const lb2a = await mkS("LB R2 — Loups vs Sultans",   "LOSER_BRACKET",  loups.id,   "WINNER_BRACKET", sultans.id,  "LOSER_BRACKET",  future(2, 10), 2);
    const lb2b = await mkS("LB R2 — Pharaons vs Condors","LOSER_BRACKET",  pharaons.id,"WINNER_BRACKET", condors.id,  "LOSER_BRACKET",  future(2, 12), 2);

    await placeBet(alice.id,   wb2a.id, "TEAM_A", 30);
    await placeBet(bob.id,     wb2a.id, "TEAM_B", 25);
    await placeBet(charlie.id, wb2b.id, "TEAM_A", 20);
    await placeBet(diana.id,   wb2b.id, "TEAM_B", 20);
    await placeBet(eve.id,     lb2a.id, "TEAM_A", 15);
    await placeBet(frank.id,   lb2a.id, "TEAM_B", 20);
    await placeBet(grace.id,   lb2b.id, "TEAM_A", 25);
    await placeBet(hugo.id,    lb2b.id, "TEAM_B", 15);
    await placeBet(iris.id,    wb2a.id, "TEAM_A", 30);
    await placeBet(julien.id,  lb2a.id, "TEAM_A", 20);

    await prisma.championBet.createMany({ data: [
      { userId: alice.id,   teamId: rapaces.id, amountWizz: 0 },
      { userId: bob.id,     teamId: rois.id,    amountWizz: 0 },
      { userId: charlie.id, teamId: lions.id,   amountWizz: 0 },
    ]});
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 3 : Avant finale BO3
  // Tout est terminé sauf la finale (3 matchs pré-créés)
  //
  // WB : Rapaces gagnent la WB Final → vont en Grand Final
  // LB : Lions (WB Final loser) passent par LB → gagnent LB Final
  // Grand Final : Rapaces vs Lions (BO3, 3 matchs SCHEDULED)
  // ─────────────────────────────────────────────────────────────────────────
  if (testPhase === "pre-finale") {
    await seedAllPoolsFinished(10);

    // WB
    await mkF("WB R1 — Rois vs Loups",     "WINNER_BRACKET", rois.id,    "POOL",            loups.id,   "POOL",            2, 1, "TEAM_A", past(15, 10), 1);
    await mkF("WB R1 — Lions vs Pharaons", "WINNER_BRACKET", lions.id,   "POOL",            pharaons.id,"POOL",            3, 2, "TEAM_A", past(15, 14), 1);
    await mkF("WB R1 — Rapaces vs Aigles", "WINNER_BRACKET", rapaces.id, "POOL",            aigles.id,  "POOL",            2, 0, "TEAM_A", past(15, 16), 1);
    await mkF("WB R2 — Rois vs Rapaces",   "WINNER_BRACKET", rois.id,    "WINNER_BRACKET",  rapaces.id, "WINNER_BRACKET",  1, 2, "TEAM_B", past(10, 14), 2);
    await mkF("WB R2 — Lions vs Aigles",   "WINNER_BRACKET", lions.id,   "WINNER_BRACKET",  aigles.id,  "WINNER_BRACKET",  2, 0, "TEAM_A", past(10, 16), 2);
    await mkF("WB Final — Rapaces vs Lions","WINNER_BRACKET", rapaces.id, "WINNER_BRACKET",  lions.id,   "WINNER_BRACKET",  2, 1, "TEAM_A", past(5,  16), 3);

    // LB
    await mkF("LB R1 — Sultans vs Tigres",    "LOSER_BRACKET", sultans.id, "POOL",           tigres.id,   "POOL",          2, 1, "TEAM_A", past(14, 10), 1);
    await mkF("LB R1 — Condors vs Faucons",   "LOSER_BRACKET", condors.id, "POOL",           faucons.id,  "POOL",          3, 2, "TEAM_A", past(14, 14), 1);
    await mkF("LB R2 — Loups vs Sultans",     "LOSER_BRACKET", loups.id,   "WINNER_BRACKET", sultans.id,  "LOSER_BRACKET", 2, 0, "TEAM_A", past(10, 10), 2);
    await mkF("LB R2 — Pharaons vs Condors",  "LOSER_BRACKET", pharaons.id,"WINNER_BRACKET", condors.id,  "LOSER_BRACKET", 3, 1, "TEAM_A", past(10, 12), 2);
    await mkF("LB R3 — Aigles vs Loups",      "LOSER_BRACKET", aigles.id,  "WINNER_BRACKET", loups.id,    "LOSER_BRACKET", 2, 1, "TEAM_A", past(7, 10),  3);
    await mkF("LB R3 — Rois vs Pharaons",     "LOSER_BRACKET", rois.id,    "WINNER_BRACKET", pharaons.id, "LOSER_BRACKET", 2, 1, "TEAM_A", past(7, 14),  3);
    await mkF("LB R4 — Aigles vs Rois",       "LOSER_BRACKET", aigles.id,  "LOSER_BRACKET",  rois.id,     "LOSER_BRACKET", 2, 1, "TEAM_A", past(5, 12),  4);
    await mkF("LB Final — Lions vs Aigles",   "LOSER_BRACKET", lions.id,   "WINNER_BRACKET", aigles.id,   "LOSER_BRACKET", 2, 0, "TEAM_A", past(3, 14),  5);

    // Finale BO3 (3 matchs pré-créés)
    const finalSeries = await prisma.finalSeries.create({
      data: { teamAId: rapaces.id, teamBId: lions.id },
    });

    const f1 = await mkS("Finale BO3 — Match 1",              "FINAL_SERIES", rapaces.id, "WINNER_BRACKET", lions.id, "LOSER_BRACKET", future(1, 15), 1, finalSeries.id);
    const f2 = await mkS("Finale BO3 — Match 2",              "FINAL_SERIES", rapaces.id, "WINNER_BRACKET", lions.id, "LOSER_BRACKET", future(1, 17), 2, finalSeries.id);
    const f3 = await mkS("Finale BO3 — Match 3 (si besoin)",  "FINAL_SERIES", rapaces.id, "WINNER_BRACKET", lions.id, "LOSER_BRACKET", future(1, 19), 3, finalSeries.id);

    await placeBet(alice.id,   f1.id, "TEAM_A", 50);
    await placeBet(bob.id,     f1.id, "TEAM_B", 40);
    await placeBet(charlie.id, f1.id, "TEAM_A", 30);
    await placeBet(diana.id,   f1.id, "TEAM_B", 35);
    await placeBet(eve.id,     f1.id, "TEAM_A", 25);
    await placeBet(frank.id,   f2.id, "TEAM_B", 20);
    await placeBet(grace.id,   f2.id, "TEAM_A", 30);
    await placeBet(hugo.id,    f1.id, "TEAM_B", 15);
    await placeBet(iris.id,    f3.id, "TEAM_A", 20);
    await placeBet(julien.id,  f1.id, "TEAM_A", 40);

    await prisma.championBet.createMany({ data: [
      { userId: alice.id,   teamId: rapaces.id, amountWizz: 0 },
      { userId: bob.id,     teamId: lions.id,   amountWizz: 0 },
      { userId: charlie.id, teamId: rapaces.id, amountWizz: 0 },
      { userId: diana.id,   teamId: lions.id,   amountWizz: 0 },
    ]});
  }

  return NextResponse.json({ success: true, phase: testPhase });
}
