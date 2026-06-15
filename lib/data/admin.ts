// ─────────────────────────────────────────────
// Couche d'accès aux données — console admin (serveur uniquement).
// ─────────────────────────────────────────────

import { prisma } from "@/lib/prisma";

export type AdminStats = {
  users: number;
  activePlayers: number;
  predictions: number;
  messages: number;
  finishedMatches: number;
  totalMatches: number;
  topScorer: { name: string; points: number } | null;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  banned: boolean;
  points: number;
  predictions: number;
};

/** Compteurs globaux pour le tableau de bord admin. */
export async function getAdminStats(): Promise<AdminStats> {
  const empty: AdminStats = {
    users: 0,
    activePlayers: 0,
    predictions: 0,
    messages: 0,
    finishedMatches: 0,
    totalMatches: 0,
    topScorer: null,
  };
  try {
    const [users, activePlayers, predictions, messages, finishedMatches, totalMatches, top] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { predictions: { some: {} } } }),
        prisma.prediction.count(),
        prisma.message.count(),
        prisma.result.count({ where: { status: "FINISHED" } }),
        prisma.match.count(),
        prisma.score.findFirst({
          where: { user: { banned: false } },
          orderBy: [{ points: "desc" }, { exactScores: "desc" }],
          include: { user: { select: { name: true } } },
        }),
      ]);
    return {
      users,
      activePlayers,
      predictions,
      messages,
      finishedMatches,
      totalMatches,
      topScorer:
        top && top.points > 0
          ? { name: top.user.name ?? "Anonyme", points: top.points }
          : null,
    };
  } catch {
    return empty;
  }
}

/** Liste des joueurs avec leur statut et leurs stats clés. */
export async function getAdminUsers(): Promise<AdminUser[]> {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        score: { select: { points: true } },
        _count: { select: { predictions: true } },
      },
    });
    return users.map((u) => ({
      id: u.id,
      name: u.name ?? "Daron anonyme",
      email: u.email,
      role: u.role,
      banned: u.banned,
      points: u.score?.points ?? 0,
      predictions: u._count.predictions,
    }));
  } catch {
    return [];
  }
}

export type AdminGroupMember = {
  id: string;
  name: string;
  role: string;
};

export type AdminGroupMessage = {
  id: string;
  userName: string;
  content: string;
  createdAt: string;
};

export type AdminGroup = {
  id: string;
  name: string;
  token: string;
  memberCount: number;
  createdByName: string | null;
  members: AdminGroupMember[];
  recentMessages: AdminGroupMessage[];
};

export async function getAdminGroups(): Promise<AdminGroup[]> {
  try {
    const groups = await prisma.group.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { members: true } },
        members: {
          select: {
            userId: true,
            role: true,
            user: { select: { name: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { user: { select: { name: true } } },
        },
      },
    });
    const owners = new Map<string, string | null>();
    for (const g of groups) {
      const owner = g.members.find((m) => m.role === "OWNER");
      owners.set(g.id, owner?.user.name ?? null);
    }
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      token: g.token,
      memberCount: g._count.members,
      createdByName: owners.get(g.id) ?? null,
      members: g.members.map((m) => ({
        id: m.userId,
        name: m.user.name ?? "Anonyme",
        role: m.role,
      })),
      recentMessages: g.messages
        .slice()
        .reverse()
        .map((m) => ({
          id: m.id,
          userName: m.user.name ?? "Anonyme",
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        })),
    }));
  } catch {
    return [];
  }
}

export type AdminPredictionEntry = {
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  joker: boolean;
};

export type AdminPredictionMap = Record<string, AdminPredictionEntry>;

export async function getAdminPredictions(): Promise<AdminPredictionMap> {
  try {
    const preds = await prisma.prediction.findMany({
      select: { userId: true, matchId: true, homeScore: true, awayScore: true, joker: true },
    });
    const map: AdminPredictionMap = {};
    for (const p of preds) {
      map[`${p.userId}|${p.matchId}`] = {
        userId: p.userId,
        matchId: p.matchId,
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        joker: p.joker,
      };
    }
    return map;
  } catch {
    return {};
  }
}

export type AdminMatchResult = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  /** Résultat déjà saisi (terminé) → permet la correction + le pré-remplissage. */
  finished: boolean;
  homeScore: number | null;
  awayScore: number | null;
  /** Cotes 1X2 figées (pour saisie/backfill manuel) — null si absentes. */
  oddsHome: number | null;
  oddsDraw: number | null;
  oddsAway: number | null;
};

/**
 * Matchs éligibles à la saisie manuelle d'un score : ceux dont le coup d'envoi
 * est passé OU qui ont déjà un résultat. Les matchs terminés sont inclus pour
 * permettre une CORRECTION (le score saisi recalcule alors les points).
 * Triés du plus récent au plus ancien.
 */
export async function getMatchesForResultEntry(): Promise<AdminMatchResult[]> {
  try {
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ kickoffAt: { lte: new Date() } }, { result: { isNot: null } }],
      },
      orderBy: { kickoffAt: "desc" },
      include: { result: { select: { homeScore: true, awayScore: true, status: true } } },
    });
    return matches.map((m) => ({
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      kickoffAt: m.kickoffAt.toISOString(),
      finished: m.result?.status === "FINISHED",
      homeScore: m.result?.homeScore ?? null,
      awayScore: m.result?.awayScore ?? null,
      oddsHome: m.oddsHome,
      oddsDraw: m.oddsDraw,
      oddsAway: m.oddsAway,
    }));
  } catch {
    return [];
  }
}

export type AdminMatchBrief = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  finished: boolean;
};

/** TOUS les matchs (passés inclus) — pour l'import de pronos. */
export async function getAllMatchesBrief(): Promise<AdminMatchBrief[]> {
  try {
    const matches = await prisma.match.findMany({
      orderBy: { kickoffAt: "asc" },
      include: { result: { select: { status: true } } },
    });
    return matches.map((m) => ({
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      finished: m.result?.status === "FINISHED",
    }));
  } catch {
    return [];
  }
}
