import { Prisma } from "@/lib/generated/prisma";

type Tx = Prisma.TransactionClient;
type Phase = "WINNER_BRACKET" | "LOSER_BRACKET";
type Source = "WINNER_BRACKET" | "LOSER_BRACKET" | "POOL";

// ─────────────────────────────────────────────────────────────
// Génération automatique du R1 bracket après la fin des poules
// ─────────────────────────────────────────────────────────────

export async function tryAutoGenerateBracketR1(tx: Tx) {
  // Déjà des matchs bracket ? Rien à faire.
  const existing = await tx.match.findFirst({
    where: { phase: { in: ["WINNER_BRACKET", "LOSER_BRACKET"] } },
  });
  if (existing) return;

  // Reste-t-il des matchs de poule non terminés ?
  const unfinished = await tx.match.findFirst({
    where: { phase: "POOL", status: { not: "FINISHED" } },
  });
  if (unfinished) return;

  // Récupérer les 3 poules triées par nom
  const pools = await tx.pool.findMany({ orderBy: { name: "asc" } });
  if (pools.length !== 3) return;

  const rankedPools = await Promise.all(pools.map((pool) => rankPoolTx(tx, pool.id)));
  const [pA, pB, pC] = rankedPools;
  if (!pA || !pB || !pC) return;
  if (pA.length < 3 || pB.length < 3 || pC.length < 4) return;

  // WB R1 : A1 vs B1, A2 vs B2, C1 vs C2
  const wbSeeds = [
    { label: "WB Tour 1 · M1", a: pA[0]!, b: pB[0]! },
    { label: "WB Tour 1 · M2", a: pA[1]!, b: pB[1]! },
    { label: "WB Tour 1 · M3", a: pC[0]!, b: pC[1]! },
  ];
  // LB R1 : A3 vs B3, C3 vs C4
  const lbSeeds = [
    { label: "LB Tour 1 · M1", a: pA[2]!, b: pB[2]! },
    { label: "LB Tour 1 · M2", a: pC[2]!, b: pC[3]! },
  ];

  for (const m of wbSeeds) {
    await tx.match.create({
      data: {
        label: m.label,
        phase: "WINNER_BRACKET",
        round: 1,
        teamAId: m.a.teamId,
        teamASource: "POOL",
        teamBId: m.b.teamId,
        teamBSource: "POOL",
      },
    });
  }
  for (const m of lbSeeds) {
    await tx.match.create({
      data: {
        label: m.label,
        phase: "LOSER_BRACKET",
        round: 1,
        teamAId: m.a.teamId,
        teamASource: "POOL",
        teamBId: m.b.teamId,
        teamBSource: "POOL",
      },
    });
  }
}

async function rankPoolTx(tx: Tx, poolId: string) {
  const teams = await tx.team.findMany({
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
    return { teamId: team.id, pts: wins * 3 + draws, gd: gf - ga, gf };
  });

  return stats.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

/**
 * Appelé après la saisie d'un résultat de bracket (WB ou LB).
 * Place automatiquement le vainqueur et le perdant dans les prochains matchs.
 * Gère les byes et crée la FinalSeries quand les deux brackets sont terminés.
 */
export async function advanceBracket(
  matchId: string,
  tx: Tx,
  isCorrection: boolean,
) {
  // Les corrections de résultat ne déclenchent pas de nouvel avancement
  if (isCorrection) return;

  const match = await tx.match.findUnique({ where: { id: matchId } });
  if (!match) return;
  if (match.phase === "POOL" || match.phase === "FINAL_SERIES") return;
  if (!match.result || match.result === "DRAW") return;

  const round = match.round ?? 1;
  const winnerId = match.result === "TEAM_A" ? match.teamAId : match.teamBId!;
  const loserId  = match.result === "TEAM_A" ? match.teamBId! : match.teamAId;
  const phase = match.phase as Phase;

  if (phase === "WINNER_BRACKET") {
    // Vainqueur WB → prochain tour WB
    await maybeAdvance(tx, "WINNER_BRACKET", round + 1, winnerId, "WINNER_BRACKET");
    // Perdant WB → LB même numéro de tour (WB R1 loser → LB R2, etc.)
    await maybeAdvance(tx, "LOSER_BRACKET", round + 1, loserId, "WINNER_BRACKET");
  } else {
    // Vainqueur LB → prochain tour LB (s'il y a encore un adversaire à venir)
    await maybeAdvanceLB(tx, round, winnerId);
    // Perdant LB → éliminé (géré dans le handler principal)
  }

  // Résoudre les byes : si un slot attend sans adversaire possible
  await resolveByesIfNeeded(tx);

  // Si WB + LB sont terminés, créer automatiquement la FinalSeries
  await tryAutoFinalSeries(tx);
}

// ─────────────────────────────────────────────────────────────
// Placement
// ─────────────────────────────────────────────────────────────

/**
 * Avance une équipe vers (phase, round) si quelqu'un peut encore venir ou si
 * un slot vide attend déjà un adversaire.
 */
async function maybeAdvance(
  tx: Tx,
  phase: Phase,
  round: number,
  teamId: string,
  source: Source,
) {
  const nullSlot = await tx.match.findFirst({
    where: { phase, round, teamBId: null, status: { not: "CANCELLED" } },
  });
  const anyoneComing = await couldTeamArrive(tx, phase, round);

  if (nullSlot || anyoneComing) {
    await fillOrCreate(tx, phase, round, teamId, source);
  }
}

/**
 * Avance un vainqueur LB. Arrête si aucun slot vide ET personne ne peut encore
 * arriver (= vainqueur LB final, géré par tryAutoFinalSeries).
 */
async function maybeAdvanceLB(tx: Tx, currentRound: number, winnerId: string) {
  const nextRound = currentRound + 1;
  const nullSlot = await tx.match.findFirst({
    where: { phase: "LOSER_BRACKET", round: nextRound, teamBId: null, status: { not: "CANCELLED" } },
  });
  const anyoneComing = await couldTeamArrive(tx, "LOSER_BRACKET", nextRound);

  if (nullSlot || anyoneComing) {
    await fillOrCreate(tx, "LOSER_BRACKET", nextRound, winnerId, "LOSER_BRACKET");
  }
}

/**
 * Remplit le slot vide d'un match existant, ou crée un nouveau match
 * avec un seul slot occupé (l'adversaire sera placé plus tard).
 */
async function fillOrCreate(
  tx: Tx,
  phase: Phase,
  round: number,
  teamId: string,
  source: Source,
) {
  const existing = await tx.match.findFirst({
    where: { phase, round, teamBId: null, status: { not: "CANCELLED" } },
  });

  if (existing) {
    await tx.match.update({
      where: { id: existing.id },
      data: { teamBId: teamId, teamBSource: source },
    });
  } else {
    const prefix = phase === "WINNER_BRACKET" ? "WB" : "LB";
    await tx.match.create({
      data: {
        label: `${prefix} Tour ${round}`,
        phase,
        round,
        teamAId: teamId,
        teamASource: source,
        teamBSource: source,
        status: "SCHEDULED",
      },
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Gestion des byes
// ─────────────────────────────────────────────────────────────

/**
 * Détecte les matchs avec un seul slot et aucun adversaire possible = bye.
 * Annule le match (CANCELLED) et avance l'équipe au tour suivant.
 * Récursif pour les byes en cascade.
 */
async function resolveByesIfNeeded(tx: Tx) {
  const nullSlots = await tx.match.findMany({
    where: {
      phase: { in: ["WINNER_BRACKET", "LOSER_BRACKET"] },
      teamBId: null,
      status: { not: "CANCELLED" },
    },
  });

  for (const m of nullSlots) {
    if (!m.teamAId) continue;

    const phase = m.phase as Phase;
    const round = m.round ?? 1;

    const anyoneComing = await couldTeamArrive(tx, phase, round);
    if (anyoneComing) continue; // Un adversaire peut encore arriver

    // Bye confirmé : annuler le match, avancer l'équipe
    await tx.match.update({
      where: { id: m.id },
      data: { status: "CANCELLED", label: `${m.label} (bye)` },
    });

    if (phase === "WINNER_BRACKET") {
      await maybeAdvance(tx, "WINNER_BRACKET", round + 1, m.teamAId, m.teamASource);
    } else {
      await maybeAdvanceLB(tx, round, m.teamAId);
    }

    // Relancer pour détecter d'éventuels nouveaux byes créés
    await resolveByesIfNeeded(tx);
    return;
  }
}

// ─────────────────────────────────────────────────────────────
// Finale auto
// ─────────────────────────────────────────────────────────────

/**
 * Si WB et LB sont tous deux terminés (aucun match actif ou en attente),
 * crée automatiquement la FinalSeries avec les matchs 1 et 2.
 */
async function tryAutoFinalSeries(tx: Tx) {
  const existing = await tx.finalSeries.findFirst();
  if (existing) return;

  // Matchs bracket encore actifs ?
  const active = await tx.match.findFirst({
    where: {
      phase: { in: ["WINNER_BRACKET", "LOSER_BRACKET"] },
      status: { notIn: ["FINISHED", "CANCELLED"] },
    },
  });
  if (active) return;

  // Slots TBD encore ouverts ?
  const pending = await tx.match.findFirst({
    where: {
      phase: { in: ["WINNER_BRACKET", "LOSER_BRACKET"] },
      teamBId: null,
      status: { not: "CANCELLED" },
    },
  });
  if (pending) return;

  const wbFinal = await tx.match.findFirst({
    where: { phase: "WINNER_BRACKET", status: "FINISHED" },
    orderBy: { round: "desc" },
  });
  const lbFinal = await tx.match.findFirst({
    where: { phase: "LOSER_BRACKET", status: "FINISHED" },
    orderBy: { round: "desc" },
  });

  if (!wbFinal || !lbFinal) return;

  const wbChampId = wbFinal.result === "TEAM_A" ? wbFinal.teamAId : wbFinal.teamBId;
  const lbChampId = lbFinal.result === "TEAM_A" ? lbFinal.teamAId : lbFinal.teamBId;
  if (!wbChampId || !lbChampId) return;

  const series = await tx.finalSeries.create({
    data: { teamAId: wbChampId, teamBId: lbChampId },
  });

  for (const i of [1, 2]) {
    await tx.match.create({
      data: {
        label: `Finale · Match ${i}`,
        phase: "FINAL_SERIES",
        round: i,
        teamAId: wbChampId,
        teamASource: "WINNER_BRACKET",
        teamBId: lbChampId,
        teamBSource: "LOSER_BRACKET",
        finalSeriesId: series.id,
      },
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Renvoie true si des matchs du tour précédent peuvent encore envoyer une équipe
 * vers (phase, round).
 *
 * Règles :
 *  - WB R(N) ← WB R(N-1) vainqueurs
 *  - LB R(N) ← LB R(N-1) vainqueurs + WB R(N-1) perdants
 */
async function couldTeamArrive(tx: Tx, phase: Phase, round: number): Promise<boolean> {
  if (phase === "WINNER_BRACKET") {
    const count = await tx.match.count({
      where: {
        phase: "WINNER_BRACKET",
        round: round - 1,
        status: { notIn: ["FINISHED", "CANCELLED"] },
        teamBId: { not: null },
      },
    });
    return count > 0;
  }

  // LB : vérifier LB R(N-1) ET WB R(N-1)
  const lbCount = await tx.match.count({
    where: {
      phase: "LOSER_BRACKET",
      round: round - 1,
      status: { notIn: ["FINISHED", "CANCELLED"] },
      teamBId: { not: null },
    },
  });
  const wbCount = await tx.match.count({
    where: {
      phase: "WINNER_BRACKET",
      round: round - 1,
      status: { notIn: ["FINISHED", "CANCELLED"] },
      teamBId: { not: null },
    },
  });
  return lbCount + wbCount > 0;
}
