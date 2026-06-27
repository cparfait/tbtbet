/**
 * Requêtes Prisma pour TBT Bet.
 * Requêtes Prisma pour TBT Bet.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma";

// ─────────────────────────────────────────────
// Utilisateurs
// ─────────────────────────────────────────────

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      image: true,
      role: true,
      wizzBalance: true,
      jokersLeft: true,
      lastSeenAt: true,
      hasSeenWelcome: true,
      banned: true,
    },
  });
}

export async function getUserWithBets(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      bets: {
        include: {
          match: {
            include: {
              teamA: true,
              teamB: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      championBet: {
        include: { team: true },
      },
    },
  });
}

// ─────────────────────────────────────────────
// Équipes
// ─────────────────────────────────────────────

export async function getAllTeams() {
  return prisma.team.findMany({
    include: { pool: true },
    orderBy: { name: "asc" },
  });
}

export async function getTeamsByPool(poolId: string) {
  return prisma.team.findMany({
    where: { poolId },
    orderBy: { name: "asc" },
  });
}

// ─────────────────────────────────────────────
// Poules
// ─────────────────────────────────────────────

export async function getAllPools() {
  return prisma.pool.findMany({
    include: { teams: true },
    orderBy: { name: "asc" },
  });
}

// ─────────────────────────────────────────────
// Matchs
// ─────────────────────────────────────────────

export type MatchWithTeams = Prisma.MatchGetPayload<{
  include: { teamA: true; teamB: true; finalSeries: true };
}>;

export async function getMatchById(id: string) {
  return prisma.match.findUnique({
    where: { id },
    include: {
      teamA: { include: { pool: true } },
      teamB: { include: { pool: true } },
      finalSeries: true,
      bets: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });
}

export async function getPoolMatchesByPoolId(poolId: string) {
  return prisma.match.findMany({
    where: {
      phase: "POOL",
      OR: [{ teamA: { poolId } }, { teamB: { poolId } }],
    },
    include: {
      teamA: true,
      teamB: true,
    },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function getScheduledMatches() {
  return prisma.match.findMany({
    where: { status: { in: ["SCHEDULED", "LIVE"] } },
    include: {
      teamA: true,
      teamB: true,
      finalSeries: true,
    },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function getFinishedMatches() {
  return prisma.match.findMany({
    where: { status: "FINISHED" },
    include: {
      teamA: true,
      teamB: true,
      finalSeries: true,
    },
    orderBy: { scheduledAt: "desc" },
  });
}

export async function getAllMatches() {
  return prisma.match.findMany({
    include: {
      teamA: true,
      teamB: true,
      finalSeries: true,
    },
    orderBy: { scheduledAt: "asc" },
  });
}

// Variante avec pool inclus dans les équipes (pour grouper par poule dans l'UI)
export async function getAllMatchesWithPool() {
  return prisma.match.findMany({
    include: {
      teamA: { include: { pool: true } },
      teamB: { include: { pool: true } },
      finalSeries: true,
    },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function getMatchesByPhase(phase: string) {
  return prisma.match.findMany({
    where: { phase: phase as "POOL" | "WINNER_BRACKET" | "LOSER_BRACKET" | "FINAL_SERIES" },
    include: {
      teamA: true,
      teamB: true,
      finalSeries: true,
    },
    orderBy: { scheduledAt: "asc" },
  });
}

// ─────────────────────────────────────────────
// Paris
// ─────────────────────────────────────────────

export async function getUserBetForMatch(userId: string, matchId: string) {
  return prisma.bet.findUnique({
    where: { userId_matchId: { userId, matchId } },
    include: { match: { include: { teamA: true, teamB: true } } },
  });
}

export async function getUserBets(userId: string) {
  return prisma.bet.findMany({
    where: { userId },
    include: {
      match: {
        include: { teamA: true, teamB: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBetsForMatch(matchId: string) {
  return prisma.bet.findMany({
    where: { matchId },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
}

// ─────────────────────────────────────────────
// Pari Champion
// ─────────────────────────────────────────────

export async function getUserChampionBet(userId: string) {
  return prisma.championBet.findUnique({
    where: { userId },
    include: { team: true },
  });
}

export async function getAllChampionBets() {
  return prisma.championBet.findMany({
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      team: true,
    },
  });
}

export async function getChampionBetsByTeam() {
  const teams = await prisma.team.findMany({
    include: {
      championBets: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });
  return teams
    .map((t) => ({
      id: t.id,
      name: t.name,
      logoUrl: t.logoUrl,
      players: t.championBets.map((b) => b.user),
      count: t.championBets.length,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

// ─────────────────────────────────────────────
// Classement
// ─────────────────────────────────────────────

export async function getLeaderboard() {
  const users = await prisma.user.findMany({
    where: { banned: false, email: { not: "admin@tbtbet.local" } },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      image: true,
      wizzBalance: true,
      jokersLeft: true,
      previousWizzRank: true,
    },
    orderBy: { wizzBalance: "desc" },
  });

  // Calcule l'évolution : précédent rang - rang actuel
  // > 0 = a grimpé, < 0 = a baissé, 0 = stable, null = première fois
  return users.map((u, i) => {
    const currentRank = i + 1;
    const evolution =
      u.previousWizzRank != null
        ? u.previousWizzRank - currentRank
        : null;
    return {
      id: u.id,
      name: u.name,
      avatarUrl: u.avatarUrl ?? u.image,
      wizzBalance: u.wizzBalance,
      jokersLeft: u.jokersLeft,
      evolution,
    };
  });
}

/** Snapshot les rangs actuels du classement (à appeler après règlement des paris). */
export async function snapshotRanks() {
  const users = await prisma.user.findMany({
    where: { banned: false, email: { not: "admin@tbtbet.local" } },
    orderBy: { wizzBalance: "desc" },
    select: { id: true },
  });

  await Promise.all(
    users.map((u, i) =>
      prisma.user.update({
        where: { id: u.id },
        data: { previousWizzRank: i + 1 },
      })
    )
  );
}

// ─────────────────────────────────────────────
// Classement de poule
// ─────────────────────────────────────────────

export async function getPoolStandings(poolId: string) {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      teams: {
        include: {
          matchesAsTeamA: {
            where: { phase: "POOL", status: "FINISHED" },
          },
          matchesAsTeamB: {
            where: { phase: "POOL", status: "FINISHED" },
          },
        },
      },
    },
  });

  if (!pool) return null;

  const standings = pool.teams.map((team) => {
    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;

    for (const m of team.matchesAsTeamA) {
      goalsFor += m.scoreA ?? 0;
      goalsAgainst += m.scoreB ?? 0;
      if (m.result === "TEAM_A") wins++;
      else if (m.result === "DRAW") draws++;
      else losses++;
    }
    for (const m of team.matchesAsTeamB) {
      goalsFor += m.scoreB ?? 0;
      goalsAgainst += m.scoreA ?? 0;
      if (m.result === "TEAM_B") wins++;
      else if (m.result === "DRAW") draws++;
      else losses++;
    }

    const points = wins * 3 + draws;
    const gd = goalsFor - goalsAgainst;
    const played = wins + draws + losses;

    return { team, wins, draws, losses, played, goalsFor, goalsAgainst, gd, points };
  });

  standings.sort((a, b) =>
    b.points - a.points || b.gd - a.gd || b.goalsFor - a.goalsFor
  );

  return { pool, standings };
}

export async function getAllPoolsWithStandings() {
  const pools = await prisma.pool.findMany({
    orderBy: { name: "asc" },
    include: { teams: true },
  });
  return pools;
}

export async function getAllPoolsStandings() {
  const pools = await prisma.pool.findMany({
    orderBy: { name: "asc" },
    include: {
      teams: {
        include: {
          matchesAsTeamA: { where: { phase: "POOL", status: "FINISHED" } },
          matchesAsTeamB: { where: { phase: "POOL", status: "FINISHED" } },
        },
      },
    },
  });

  return pools.map((pool) => {
    const standings = pool.teams.map((team) => {
      let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
      for (const m of team.matchesAsTeamA) {
        goalsFor += m.scoreA ?? 0; goalsAgainst += m.scoreB ?? 0;
        if (m.result === "TEAM_A") wins++;
        else if (m.result === "DRAW") draws++;
        else losses++;
      }
      for (const m of team.matchesAsTeamB) {
        goalsFor += m.scoreB ?? 0; goalsAgainst += m.scoreA ?? 0;
        if (m.result === "TEAM_B") wins++;
        else if (m.result === "DRAW") draws++;
        else losses++;
      }
      const points = wins * 3 + draws;
      const gd = goalsFor - goalsAgainst;
      const played = wins + draws + losses;
      return { team, wins, draws, losses, played, goalsFor, goalsAgainst, gd, points };
    }).sort((a, b) => b.points - a.points || b.gd - a.gd || b.goalsFor - a.goalsFor);

    return { id: pool.id, name: pool.name, color: pool.color, standings };
  });
}

// ─────────────────────────────────────────────
// Final Series
// ─────────────────────────────────────────────

export async function getFinalSeries() {
  return prisma.finalSeries.findFirst({
    include: {
      matches: {
        include: {
          teamA: true,
          teamB: true,
        },
        orderBy: { scheduledAt: "asc" },
      },
    },
  });
}

export async function getTournamentChampion() {
  const series = await prisma.finalSeries.findFirst({
    where: { winnerTeamId: { not: null } },
  });
  if (!series?.winnerTeamId) return null;
  return prisma.team.findUnique({ where: { id: series.winnerTeamId } });
}

// ─────────────────────────────────────────────
// Admin
// ─────────────────────────────────────────────

export async function hasBracketMatches(): Promise<boolean> {
  const count = await prisma.match.count({
    where: { phase: { in: ["WINNER_BRACKET", "LOSER_BRACKET"] } },
  });
  return count > 0;
}

export async function getAdminStats() {
  const [users, matches, finishedMatches, messages, bets] = await Promise.all([
    prisma.user.count({ where: { banned: false } }),
    prisma.match.count(),
    prisma.match.count({ where: { status: "FINISHED" } }),
    prisma.message.count(),
    prisma.bet.count(),
  ]);

  return {
    users,
    matches,
    finishedMatches,
    messages,
    bets,
  };
}

export async function getAdminUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      wizzBalance: true,
      jokersLeft: true,
      banned: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─────────────────────────────────────────────
// Comparaison joueurs
// ─────────────────────────────────────────────

export async function getPlayerComparison(currentUserId: string, targetUserId: string) {
  const [currentUser, targetUser, matches] = await Promise.all([
    prisma.user.findUnique({
      where: { id: currentUserId },
      select: { id: true, name: true, avatarUrl: true, image: true, wizzBalance: true },
    }),
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, avatarUrl: true, image: true, wizzBalance: true },
    }),
    prisma.match.findMany({
      where: {
        status: "FINISHED",
        bets: { some: { userId: { in: [currentUserId, targetUserId] } } },
      },
      include: {
        teamA: { select: { id: true, name: true, logoUrl: true } },
        teamB: { select: { id: true, name: true, logoUrl: true } },
        bets: {
          where: { userId: { in: [currentUserId, targetUserId] } },
          select: {
            userId: true,
            choice: true,
            amountWizz: true,
            payout: true,
            settled: true,
            jokerUsed: true,
          },
        },
      },
      orderBy: { scheduledAt: "desc" },
    }),
  ]);

  return { currentUser, targetUser, matches };
}

// ─────────────────────────────────────────────
// Paramètres globaux
// ─────────────────────────────────────────────

export async function getSiteSetting(key: string): Promise<string | null> {
  try {
    const s = await prisma.siteSetting.findUnique({ where: { key } });
    return s?.value ?? null;
  } catch {
    return null;
  }
}