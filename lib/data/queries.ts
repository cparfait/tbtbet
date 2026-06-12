// ─────────────────────────────────────────────
// Couche d'accès aux données (serveur uniquement).
//
// La base (Prisma) est la source de vérité. Chaque getter renvoie un repli
// vide si la base n'est pas joignable — l'app affiche alors des états vides
// plutôt que de planter (utile tant que Postgres n'est pas démarré).
// ─────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { computePoints } from "@/lib/scoring";
import type {
  Match,
  StandingTeam,
  LeaderboardEntry,
  LiveLeaderboardEntry,
  MatchPrediction,
  ComparisonRow,
  BadgeDef,
  UserPrediction,
  UserStats,
} from "./matches";

type DbMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  kickoffAt: Date;
  stage: Match["stage"];
  group: string | null;
  matchday: number | null;
  result: { homeScore: number; awayScore: number; status: string } | null;
};

/** Convertit une ligne Prisma `Match` (avec result) vers le type UI. */
function toUiMatch(m: DbMatch): Match {
  return {
    id: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeFlag: m.homeFlag,
    awayFlag: m.awayFlag,
    kickoffAt: m.kickoffAt.toISOString(),
    stage: m.stage,
    group: m.group,
    matchday: m.matchday,
    result:
      m.result && m.result.status === "FINISHED"
        ? {
            homeScore: m.result.homeScore,
            awayScore: m.result.awayScore,
            status: "FINISHED",
          }
        : undefined,
    live:
      m.result && m.result.status === "LIVE"
        ? { homeScore: m.result.homeScore, awayScore: m.result.awayScore }
        : undefined,
  };
}

/** Tous les matchs, triés par coup d'envoi croissant. */
export async function getMatches(): Promise<Match[]> {
  try {
    const rows = await prisma.match.findMany({
      include: { result: true },
      orderBy: { kickoffAt: "asc" },
    });
    return rows.map(toUiMatch);
  } catch {
    return [];
  }
}

/** Un match par son id, ou null. */
export async function getMatch(id: string): Promise<Match | null> {
  try {
    const m = await prisma.match.findUnique({
      where: { id },
      include: { result: true },
    });
    return m ? toUiMatch(m) : null;
  } catch {
    return null;
  }
}

/** Classements par groupe, calculés depuis les matchs de poule terminés. */
export async function getStandings(): Promise<Record<string, StandingTeam[]>> {
  const matches = await getMatches();
  const groups: Record<string, Map<string, StandingTeam>> = {};

  const ensure = (group: string, team: string, flag: string) => {
    groups[group] ??= new Map();
    if (!groups[group].has(team)) {
      groups[group].set(team, {
        team,
        flag,
        j: 0,
        g: 0,
        n: 0,
        p: 0,
        bp: 0,
        bc: 0,
        pts: 0,
      });
    }
    return groups[group].get(team)!;
  };

  for (const m of matches) {
    if (m.stage !== "GROUP" || !m.group) continue;
    const home = ensure(m.group, m.homeTeam, m.homeFlag);
    const away = ensure(m.group, m.awayTeam, m.awayFlag);
    if (!m.result) continue;

    const { homeScore: hs, awayScore: as } = m.result;
    home.j++;
    away.j++;
    home.bp += hs;
    home.bc += as;
    away.bp += as;
    away.bc += hs;

    if (hs > as) {
      home.g++;
      home.pts += 3;
      away.p++;
    } else if (hs < as) {
      away.g++;
      away.pts += 3;
      home.p++;
    } else {
      home.n++;
      away.n++;
      home.pts++;
      away.pts++;
    }
  }

  // Tri : points, puis différence de buts, puis buts pour.
  const out: Record<string, StandingTeam[]> = {};
  for (const [g, teams] of Object.entries(groups)) {
    out[g] = [...teams.values()].sort(
      (a, b) =>
        b.pts - a.pts || b.bp - b.bc - (a.bp - a.bc) || b.bp - a.bp
    );
  }
  return out;
}

/**
 * Classement général : TOUS les joueurs (y compris ceux sans encore de points,
 * notamment les comptes Google qui n'ont pas de ligne `Score` à l'inscription).
 * Les bannis sont exclus.
 */
export async function getLeaderboard(
  memberIds?: string[]
): Promise<LeaderboardEntry[]> {
  try {
    if (memberIds && memberIds.length === 0) return [];
    const users = await prisma.user.findMany({
      where: {
        banned: false,
        ...(memberIds ? { id: { in: memberIds } } : {}),
      },
      include: {
        score: true,
        badges: { include: { badge: true } },
      },
    });

    return users
      .map((u) => ({
        name: u.name ?? "Anonyme",
        email: u.email,
        points: u.score?.points ?? 0,
        exactScores: u.score?.exactScores ?? 0,
        correctResults: u.score?.correctResults ?? 0,
        badges: u.badges.map((b) => b.badge.key),
      }))
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.exactScores - a.exactScores ||
          b.correctResults - a.correctResults ||
          a.name.localeCompare(b.name)
      )
      .map((entry, i) => ({ rank: i + 1, ...entry }));
  } catch {
    return [];
  }
}

/**
 * Classement LIVE : points acquis + points PROVISOIRES des matchs en cours
 * (statut LIVE), recalculés à la volée. Renvoie aussi l'évolution ▲▼ de
 * chaque joueur (vs le dernier match terminé) et un drapeau `hasLive`.
 */
export async function getLiveLeaderboard(memberIds?: string[]): Promise<{
  entries: LiveLeaderboardEntry[];
  hasLive: boolean;
}> {
  try {
    if (memberIds && memberIds.length === 0) return { entries: [], hasLive: false };
    const [users, liveResults] = await Promise.all([
      prisma.user.findMany({
        where: {
          banned: false,
          ...(memberIds ? { id: { in: memberIds } } : {}),
        },
        include: { score: true, badges: { include: { badge: true } } },
      }),
      prisma.result.findMany({
        where: { status: "LIVE" },
        include: { match: { include: { predictions: true } } },
      }),
    ]);

    // Points provisoires par joueur, agrégés sur tous les matchs en cours.
    const provisional = new Map<string, number>();
    for (const r of liveResults) {
      for (const p of r.match.predictions) {
        const pts = computePoints(
          { homeScore: p.homeScore, awayScore: p.awayScore },
          { homeScore: r.homeScore, awayScore: r.awayScore },
          p.joker
        ).points;
        provisional.set(p.userId, (provisional.get(p.userId) ?? 0) + pts);
      }
    }

    const entries = users
      .map((u) => {
        const points = u.score?.points ?? 0;
        const livePoints = provisional.get(u.id) ?? 0;
        return {
          userId: u.id,
          name: u.name ?? "Anonyme",
          email: u.email,
          points,
          livePoints,
          total: points + livePoints,
          exactScores: u.score?.exactScores ?? 0,
          badges: u.badges.map((b) => b.badge.key),
          previousRank: u.score?.previousRank ?? null,
        };
      })
      .sort(
        (a, b) =>
          b.total - a.total ||
          b.exactScores - a.exactScores ||
          a.name.localeCompare(b.name)
      )
      .map(({ previousRank, ...e }, i) => ({
        rank: i + 1,
        evolution: previousRank != null ? previousRank - (i + 1) : null,
        ...e,
      }));

    return { entries, hasLive: liveResults.length > 0 };
  } catch {
    return { entries: [], hasLive: false };
  }
}

/**
 * Pronostics de TOUS les joueurs sur un match, avec les points (définitifs si
 * terminé, provisoires si en cours). À n'afficher qu'après le coup d'envoi
 * (anti-influence). Triés par points décroissants.
 */
export async function getMatchPredictions(
  matchId: string
): Promise<MatchPrediction[]> {
  try {
    const [match, preds] = await Promise.all([
      prisma.match.findUnique({
        where: { id: matchId },
        include: { result: true },
      }),
      prisma.prediction.findMany({
        where: { matchId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { submittedAt: "asc" },
      }),
    ]);

    const result = match?.result;
    const scored =
      result && (result.status === "FINISHED" || result.status === "LIVE");
    const live = result?.status === "LIVE";

    return preds
      .map((p) => ({
        userId: p.userId,
        name: p.user.name ?? "Anonyme",
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        joker: p.joker,
        comment: p.comment ?? undefined,
        points: scored
          ? computePoints(
              { homeScore: p.homeScore, awayScore: p.awayScore },
              { homeScore: result!.homeScore, awayScore: result!.awayScore },
              p.joker
            ).points
          : null,
        live: !!live,
      }))
      .sort((a, b) => (b.points ?? -1) - (a.points ?? -1));
  } catch {
    return [];
  }
}

/**
 * Compare les pronos d'un joueur cible avec les miens, sur les matchs DÉJÀ
 * commencés uniquement (anti-influence). Triés du plus récent au plus ancien.
 */
export async function getPredictionComparison(
  viewerId: string,
  targetId: string
): Promise<{ targetName: string; rows: ComparisonRow[] } | null> {
  try {
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { name: true },
    });
    if (!target) return null;

    const now = new Date();
    const targetPreds = await prisma.prediction.findMany({
      where: { userId: targetId, match: { kickoffAt: { lte: now } } },
      include: { match: { include: { result: true } } },
      orderBy: { match: { kickoffAt: "desc" } },
    });

    const matchIds = targetPreds.map((p) => p.matchId);
    const minePreds = await prisma.prediction.findMany({
      where: { userId: viewerId, matchId: { in: matchIds } },
    });
    const mineByMatch = new Map(minePreds.map((p) => [p.matchId, p]));

    const rows: ComparisonRow[] = targetPreds.map((tp) => {
      const r = tp.match.result;
      const scored = r && (r.status === "FINISHED" || r.status === "LIVE");
      const pts = (p: { homeScore: number; awayScore: number; joker: boolean }) =>
        scored
          ? computePoints(
              { homeScore: p.homeScore, awayScore: p.awayScore },
              { homeScore: r!.homeScore, awayScore: r!.awayScore },
              p.joker
            ).points
          : null;
      const mine = mineByMatch.get(tp.matchId);
      return {
        match: toUiMatch(tp.match),
        theirs: {
          homeScore: tp.homeScore,
          awayScore: tp.awayScore,
          joker: tp.joker,
          points: pts(tp),
        },
        mine: mine
          ? {
              homeScore: mine.homeScore,
              awayScore: mine.awayScore,
              joker: mine.joker,
              points: pts(mine),
            }
          : null,
      };
    });

    return { targetName: target.name ?? "Anonyme", rows };
  } catch {
    return null;
  }
}

/** Pronostic de l'utilisateur sur un match précis (ou null). */
export async function getMyPrediction(
  userId: string,
  matchId: string
): Promise<{ homeScore: number; awayScore: number; joker: boolean } | null> {
  try {
    const p = await prisma.prediction.findUnique({
      where: { userId_matchId: { userId, matchId } },
      select: { homeScore: true, awayScore: true, joker: true },
    });
    return p;
  } catch {
    return null;
  }
}

/** Catalogue des badges. */
export async function getBadges(): Promise<BadgeDef[]> {
  try {
    const badges = await prisma.badge.findMany();
    return badges.map((b) => ({
      key: b.key,
      label: b.label,
      emoji: b.emoji,
      description: b.description,
    }));
  } catch {
    return [];
  }
}

/** Statistiques agrégées d'un joueur. */
export async function getUserStats(userId: string): Promise<UserStats> {
  const empty: UserStats = {
    points: 0,
    exactScores: 0,
    correctResults: 0,
    jokersUsed: 0,
    badges: [],
  };
  try {
    const [score, jokersUsed, badges] = await Promise.all([
      prisma.score.findUnique({ where: { userId } }),
      prisma.prediction.count({ where: { userId, joker: true } }),
      prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
      }),
    ]);
    return {
      points: score?.points ?? 0,
      exactScores: score?.exactScores ?? 0,
      correctResults: score?.correctResults ?? 0,
      jokersUsed,
      badges: badges.map((b) => b.badge.key),
    };
  } catch {
    return empty;
  }
}

/** Derniers pronostics d'un joueur, enrichis du match. */
export async function getUserPredictions(
  userId: string,
  limit = 10
): Promise<UserPrediction[]> {
  try {
    const preds = await prisma.prediction.findMany({
      where: { userId },
      include: { match: { include: { result: true } } },
      orderBy: { submittedAt: "desc" },
      take: limit,
    });
    return preds.map((p) => ({
      matchId: p.matchId,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      joker: p.joker,
      comment: p.comment ?? undefined,
      match: toUiMatch(p.match),
    }));
  } catch {
    return [];
  }
}
