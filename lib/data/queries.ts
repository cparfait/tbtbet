// ─────────────────────────────────────────────
// Couche d'accès aux données (serveur uniquement).
//
// La base (Prisma) est la source de vérité. Chaque getter renvoie un repli
// vide si la base n'est pas joignable — l'app affiche alors des états vides
// plutôt que de planter (utile tant que Postgres n'est pas démarré).
// ─────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { computePoints } from "@/lib/scoring";
import { compareRanked } from "@/lib/ranking";
import { jokerPhase, JOKER_BUDGET } from "@/lib/jokers";
import type {
  Match,
  StandingTeam,
  LiveLeaderboardEntry,
  MatchPrediction,
  ComparisonRow,
  BadgeDef,
  UserPrediction,
  UserStats,
  JokerUsage,
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
  oddsHome: number | null;
  oddsDraw: number | null;
  oddsAway: number | null;
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
    odds:
      m.oddsHome != null && m.oddsDraw != null && m.oddsAway != null
        ? { home: m.oddsHome, draw: m.oddsDraw, away: m.oddsAway }
        : null,
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

/** Code drapeau de l'équipe de France (flagcdn). */
const FRANCE_FLAG = "fr";

/** Date calendaire (YYYY-MM-DD) d'un instant, dans le fuseau de Paris. */
function parisDateStr(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Le match de l'équipe de France prévu AUJOURD'HUI (fuseau Paris), ou null.
 * Sert à activer le thème tricolore. Renvoie le plus tôt s'il y en a plusieurs.
 */
export async function getFranceMatchToday(): Promise<Match | null> {
  try {
    const now = Date.now();
    const rows = await prisma.match.findMany({
      where: {
        OR: [{ homeFlag: FRANCE_FLAG }, { awayFlag: FRANCE_FLAG }],
        // Fenêtre large (±1 j) pour couvrir tous les fuseaux, on affine ensuite.
        kickoffAt: {
          gte: new Date(now - 24 * 3_600_000),
          lte: new Date(now + 24 * 3_600_000),
        },
      },
      include: { result: true },
      orderBy: { kickoffAt: "asc" },
    });
    const today = parisDateStr(new Date());
    const match = rows.find((m) => parisDateStr(m.kickoffAt) === today);
    return match ? toUiMatch(match) : null;
  } catch {
    return null;
  }
}

export type PersonalStats = {
  totalPredictions: number;
  finished: number;
  points: number;
  avgPoints: number;
  exactScores: number;
  correctResults: number;
  successRate: number; // 0..1 — part des pronos terminés ayant marqué des points
  exactRate: number; // 0..1 — part des pronos terminés au score exact
  jokersUsed: number;
  favoriteTeam: { team: string; flag: string; count: number } | null;
  bestPrediction: {
    homeTeam: string;
    awayTeam: string;
    homeFlag: string;
    awayFlag: string;
    predHome: number;
    predAway: number;
    resHome: number;
    resAway: number;
    points: number;
  } | null;
  championPick: { team: string; flag: string } | null;
};

/** Stats personnelles détaillées d'un joueur (page « Wrapped »). */
export async function getPersonalStats(userId: string): Promise<PersonalStats> {
  const empty: PersonalStats = {
    totalPredictions: 0,
    finished: 0,
    points: 0,
    avgPoints: 0,
    exactScores: 0,
    correctResults: 0,
    successRate: 0,
    exactRate: 0,
    jokersUsed: 0,
    favoriteTeam: null,
    bestPrediction: null,
    championPick: null,
  };
  try {
    const [preds, championPick] = await Promise.all([
      prisma.prediction.findMany({
        where: { userId },
        include: { match: { include: { result: true } } },
      }),
      prisma.championPick.findUnique({
        where: { userId },
        select: { team: true, flag: true },
      }),
    ]);

    let finished = 0;
    let points = 0;
    let exactScores = 0;
    let correctResults = 0;
    let jokersUsed = 0;
    const backed = new Map<string, { flag: string; count: number }>();
    let best: PersonalStats["bestPrediction"] = null;

    for (const p of preds) {
      if (p.joker) jokersUsed++;

      // « Équipe fétiche » = celle que le joueur soutient le plus (prono victoire).
      if (p.homeScore !== p.awayScore) {
        const home = p.homeScore > p.awayScore;
        const team = home ? p.match.homeTeam : p.match.awayTeam;
        const flag = home ? p.match.homeFlag : p.match.awayFlag;
        const e = backed.get(team) ?? { flag, count: 0 };
        e.count++;
        backed.set(team, e);
      }

      const r = p.match.result;
      if (r && r.status === "FINISHED") {
        finished++;
        const b = computePoints(
          { homeScore: p.homeScore, awayScore: p.awayScore },
          { homeScore: r.homeScore, awayScore: r.awayScore },
          p.joker,
          { home: p.match.oddsHome, draw: p.match.oddsDraw, away: p.match.oddsAway }
        );
        points += b.points;
        if (b.exactScore) exactScores++;
        if (b.correctResult) correctResults++;
        if (!best || b.points > best.points) {
          best = {
            homeTeam: p.match.homeTeam,
            awayTeam: p.match.awayTeam,
            homeFlag: p.match.homeFlag,
            awayFlag: p.match.awayFlag,
            predHome: p.homeScore,
            predAway: p.awayScore,
            resHome: r.homeScore,
            resAway: r.awayScore,
            points: b.points,
          };
        }
      }
    }

    const fav = [...backed.entries()].sort((a, b) => b[1].count - a[1].count)[0];

    return {
      totalPredictions: preds.length,
      finished,
      points,
      avgPoints: finished ? points / finished : 0,
      exactScores,
      correctResults,
      successRate: finished ? correctResults / finished : 0,
      exactRate: finished ? exactScores / finished : 0,
      jokersUsed,
      favoriteTeam: fav
        ? { team: fav[0], flag: fav[1].flag, count: fav[1].count }
        : null,
      bestPrediction: best && best.points > 0 ? best : null,
      championPick,
    };
  } catch {
    return empty;
  }
}

/** Pari « vainqueur du tournoi » d'un joueur, ou null s'il n'a pas encore choisi. */
export async function getChampionPick(
  userId: string
): Promise<{ team: string; flag: string } | null> {
  try {
    return await prisma.championPick.findUnique({
      where: { userId },
      select: { team: true, flag: true },
    });
  } catch {
    return null;
  }
}

/** Liste des équipes pariables (distinctes, triées), déduite des matchs. */
export async function getChampionableTeams(): Promise<
  { team: string; flag: string }[]
> {
  try {
    const matches = await prisma.match.findMany({
      select: { homeTeam: true, homeFlag: true, awayTeam: true, awayFlag: true },
    });
    const byTeam = new Map<string, string>();
    for (const m of matches) {
      if (m.homeTeam) byTeam.set(m.homeTeam, m.homeFlag);
      if (m.awayTeam) byTeam.set(m.awayTeam, m.awayFlag);
    }
    return [...byTeam.entries()]
      .map(([team, flag]) => ({ team, flag }))
      .sort((a, b) => a.team.localeCompare(b.team, "fr"));
  } catch {
    return [];
  }
}

/** Une équipe championne pariée + les joueurs du groupe qui l'ont choisie. */
export type GroupChampionPick = {
  team: string;
  flag: string;
  fans: { userId: string; name: string; avatar: string | null }[];
};

/**
 * Champions pariés par l'ensemble des membres d'un groupe, agrégés par équipe
 * et triés du plus populaire au moins populaire. Sert à la page « Les champions
 * du groupe » (ouverte depuis la carte champion du dashboard).
 */
export async function getGroupChampionPicks(
  memberIds: string[]
): Promise<GroupChampionPick[]> {
  try {
    if (memberIds.length === 0) return [];
    const picks = await prisma.championPick.findMany({
      where: { userId: { in: memberIds } },
      include: { user: { select: { id: true, name: true, image: true, avatarUrl: true } } },
    });

    const byTeam = new Map<string, GroupChampionPick>();
    for (const p of picks) {
      const entry = byTeam.get(p.team) ?? { team: p.team, flag: p.flag, fans: [] };
      entry.fans.push({
        userId: p.user.id,
        name: p.user.name ?? "Anonyme",
        avatar: p.user.avatarUrl ?? p.user.image ?? null,
      });
      byTeam.set(p.team, entry);
    }

    return [...byTeam.values()]
      .map((e) => ({
        ...e,
        fans: e.fans.sort((a, b) => a.name.localeCompare(b.name, "fr")),
      }))
      .sort(
        (a, b) =>
          b.fans.length - a.fans.length || a.team.localeCompare(b.team, "fr")
      );
  } catch {
    return [];
  }
}

/** Vainqueur du tournoi désigné manuellement par un admin (ou null). */
export async function getChampionOverride(): Promise<{
  team: string;
  flag: string;
} | null> {
  try {
    return await prisma.championOverride.findUnique({
      where: { id: "singleton" },
      select: { team: true, flag: true },
    });
  } catch {
    return null;
  }
}

/** Le pari champion est-il encore ouvert ? (fermé dès la finale jouée). */
export async function isChampionPickOpen(): Promise<boolean> {
  try {
    const final = await prisma.match.findFirst({
      where: { stage: "FINAL" },
      include: { result: true },
    });
    return !(final?.result && final.result.status === "FINISHED");
  } catch {
    return true;
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
 * Classement LIVE : points acquis + points PROVISOIRES des matchs en cours
 * (statut LIVE), recalculés à la volée. Renvoie aussi l'évolution ▲▼ de
 * chaque joueur (vs le dernier match terminé) et un drapeau `hasLive`.
 */
export async function getLiveLeaderboard(memberIds: string[]): Promise<{
  entries: LiveLeaderboardEntry[];
  hasLive: boolean;
}> {
  try {
    // Le classement est TOUJOURS scopé à un groupe : pas de classement global.
    if (memberIds.length === 0) return { entries: [], hasLive: false };
    const [users, liveResults] = await Promise.all([
      prisma.user.findMany({
        where: {
          banned: false,
          id: { in: memberIds },
        },
        include: {
          score: true,
          badges: { include: { badge: true } },
          championPick: true,
        },
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
          p.joker,
          { home: r.match.oddsHome, draw: r.match.oddsDraw, away: r.match.oddsAway }
        ).points;
        provisional.set(p.userId, (provisional.get(p.userId) ?? 0) + pts);
      }
    }

    // Rang « acquis » (points définitifs uniquement), calculé sur la MÊME base
    // que `previousRank` (cf. snapshotRanks). C'est lui qui sert aux flèches
    // d'évolution → cohérent : pendant un match en cours, aucun point n'est
    // encore acquis, donc les flèches ne bougent qu'au coup de sifflet final.
    const committedRank = new Map<string, number>();
    [...users]
      .map((u) => ({
        userId: u.id,
        name: u.name,
        points: u.score?.points ?? 0,
        exactScores: u.score?.exactScores ?? 0,
        correctResults: u.score?.correctResults ?? 0,
      }))
      .sort(compareRanked)
      .forEach((e, i) => committedRank.set(e.userId, i + 1));

    // Rang « précédent » RAMENÉ AU GROUPE. `Score.previousRank` est un rang
    // GLOBAL (tous joueurs) ; l'utiliser tel quel face à un rang de groupe
    // donnait des évolutions fantaisistes (« +13 » pour un 15ᵉ global mais 2ᵉ
    // de son groupe). On reclasse les membres selon leur rang global figé :
    // l'ordre global restreint au groupe = l'ordre intra-groupe du snapshot
    // précédent (même comparateur), renuméroté 1..N.
    const previousGroupRank = new Map<string, number>();
    users
      .filter((u) => u.score?.previousRank != null)
      .sort((a, b) => a.score!.previousRank! - b.score!.previousRank!)
      .forEach((u, i) => previousGroupRank.set(u.id, i + 1));

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
          correctResults: u.score?.correctResults ?? 0,
          badges: u.badges.map((b) => b.badge.key),
          championFlag: u.championPick?.flag ?? null,
        };
      })
      // Tri live : même comparateur, mais sur le total (acquis + provisoire).
      .sort((a, b) =>
        compareRanked({ ...a, points: a.total }, { ...b, points: b.total })
      )
      .map((e, i) => ({
        rank: i + 1,
        evolution: previousGroupRank.has(e.userId)
          ? previousGroupRank.get(e.userId)! - (committedRank.get(e.userId) ?? i + 1)
          : null,
        userId: e.userId,
        name: e.name,
        email: e.email,
        points: e.points,
        livePoints: e.livePoints,
        total: e.total,
        exactScores: e.exactScores,
        correctResults: e.correctResults,
        badges: e.badges,
        championFlag: e.championFlag,
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
  matchId: string,
  memberIds?: string[]
): Promise<MatchPrediction[]> {
  try {
    if (memberIds && memberIds.length === 0) return [];
    const [match, preds] = await Promise.all([
      prisma.match.findUnique({
        where: { id: matchId },
        include: { result: true },
      }),
      prisma.prediction.findMany({
        where: {
          matchId,
          ...(memberIds ? { userId: { in: memberIds } } : {}),
        },
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
              p.joker,
              { home: match?.oddsHome, draw: match?.oddsDraw, away: match?.oddsAway }
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
): Promise<{ targetName: string; targetBadges: string[]; targetGroups: { id: string; name: string }[]; rows: ComparisonRow[] } | null> {
  try {
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { name: true },
    });
    if (!target) return null;

    const [targetBadges, targetGroups] = await Promise.all([
      prisma.userBadge.findMany({
        where: { userId: targetId },
        include: { badge: true },
      }),
      prisma.groupMember.findMany({
        where: { userId: targetId },
        include: { group: { select: { id: true, name: true } } },
        orderBy: { joinedAt: "asc" },
      }),
    ]);

    // Tous les matchs déjà commencés (les pronos ne sont visibles qu'après le
    // coup d'envoi) — pour afficher la grille complète et repérer les oublis.
    const now = new Date();
    const matches = await prisma.match.findMany({
      where: { kickoffAt: { lte: now } },
      include: { result: true },
      orderBy: { kickoffAt: "desc" },
    });

    const matchIds = matches.map((m) => m.id);
    const [targetPreds, minePreds] = await Promise.all([
      prisma.prediction.findMany({
        where: { userId: targetId, matchId: { in: matchIds } },
      }),
      prisma.prediction.findMany({
        where: { userId: viewerId, matchId: { in: matchIds } },
      }),
    ]);
    const targetByMatch = new Map(targetPreds.map((p) => [p.matchId, p]));
    const mineByMatch = new Map(minePreds.map((p) => [p.matchId, p]));

    const rows: ComparisonRow[] = matches.map((m) => {
      const r = m.result;
      const scored = r && (r.status === "FINISHED" || r.status === "LIVE");
      const pts = (p: { homeScore: number; awayScore: number; joker: boolean }) =>
        scored
          ? computePoints(
              { homeScore: p.homeScore, awayScore: p.awayScore },
              { homeScore: r!.homeScore, awayScore: r!.awayScore },
              p.joker,
              { home: m.oddsHome, draw: m.oddsDraw, away: m.oddsAway }
            ).points
          : null;
      const tp = targetByMatch.get(m.id);
      const mine = mineByMatch.get(m.id);
      return {
        match: toUiMatch(m),
        theirs: tp
          ? {
              homeScore: tp.homeScore,
              awayScore: tp.awayScore,
              joker: tp.joker,
              points: pts(tp),
            }
          : null,
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

    return {
      targetName: target.name ?? "Anonyme",
      targetBadges: targetBadges.map((b) => b.badge.key),
      targetGroups: targetGroups.map((m) => ({
        id: m.group.id,
        name: m.group.name,
      })),
      rows,
    };
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

/** Jokers utilisés par phase pour un joueur (vue d'ensemble). */
export async function getJokerUsage(userId: string): Promise<JokerUsage> {
  const empty: JokerUsage = {
    group: { used: 0, budget: JOKER_BUDGET.group },
    knockout: { used: 0, budget: JOKER_BUDGET.knockout },
  };
  try {
    const preds = await prisma.prediction.findMany({
      where: { userId, joker: true },
      include: { match: { select: { stage: true } } },
    });
    let group = 0;
    let knockout = 0;
    for (const p of preds) {
      if (jokerPhase(p.match.stage) === "group") group++;
      else knockout++;
    }
    return {
      group: { used: group, budget: JOKER_BUDGET.group },
      knockout: { used: knockout, budget: JOKER_BUDGET.knockout },
    };
  } catch {
    return empty;
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
