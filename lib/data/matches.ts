// ─────────────────────────────────────────────
// Types partagés du domaine DaronsFC.
//
// ⚠️ Ce fichier ne contient AUCUNE donnée : la source de vérité est la base
// (Prisma), alimentée par API-Football. Les getters serveur vivent dans
// `lib/data/queries.ts`.
// ─────────────────────────────────────────────

export type Stage =
  | "GROUP"
  | "ROUND_OF_32"
  | "ROUND_OF_16"
  | "QUARTER"
  | "SEMI"
  | "THIRD_PLACE"
  | "FINAL";

/** Libellés FR des phases du tournoi. */
export const STAGE_LABELS: Record<Stage, string> = {
  GROUP: "Phase de poules",
  ROUND_OF_32: "16ᵉˢ de finale",
  ROUND_OF_16: "8ᵉˢ de finale",
  QUARTER: "Quart de finale",
  SEMI: "Demi-finale",
  THIRD_PLACE: "Petite finale",
  FINAL: "Finale",
};

/** Match tel que consommé par l'UI (kickoff sérialisé en ISO string). */
export type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  kickoffAt: string;
  stage: Stage;
  group: string | null;
  matchday: number | null;
  result?: { homeScore: number; awayScore: number; status: "FINISHED" };
  /** Score en direct (match en cours) — non crédité tant que pas terminé. */
  live?: { homeScore: number; awayScore: number };
  /** Cotes 1X2 figées (pour afficher les points par issue) — null si absentes. */
  odds?: { home: number; draw: number; away: number } | null;
};

/** Ligne de classement d'un groupe. */
export type StandingTeam = {
  team: string;
  flag: string;
  j: number;
  g: number;
  n: number;
  p: number;
  bp: number;
  bc: number;
  pts: number;
};

/** Entrée du classement LIVE (points acquis + points provisoires en cours). */
export type LiveLeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  email: string;
  /** Points déjà acquis (matchs terminés). */
  points: number;
  /** Points provisoires des matchs en cours. */
  livePoints: number;
  /** points + livePoints. */
  total: number;
  exactScores: number;
  correctResults: number;
  badges: string[];
  /** Évolution de rang vs match précédent (positif = monte), null si inconnu. */
  evolution: number | null;
  /** Drapeau de l'équipe choisie comme vainqueur du tournoi (ou null). */
  championFlag: string | null;
};

/** Statistiques agrégées d'un joueur (page profil). */
export type UserStats = {
  points: number;
  exactScores: number;
  correctResults: number;
  jokersUsed: number;
  badges: string[];
};

/** Jokers utilisés / budget, par phase de la compétition. */
export type JokerUsage = {
  group: { used: number; budget: number };
  knockout: { used: number; budget: number };
};

/** Définition d'un badge (catalogue applicatif). */
export type BadgeDef = {
  key: string;
  label: string;
  emoji: string;
  description: string;
};

/** Pronostic d'un joueur, enrichi du match associé. */
export type UserPrediction = {
  matchId: string;
  homeScore: number;
  awayScore: number;
  joker: boolean;
  comment?: string;
  match: Match;
};

/** Ligne de comparaison de pronos entre le viewer et un autre joueur. */
export type ComparisonRow = {
  match: Match;
  /** null = le joueur a oublié de pronostiquer ce match. */
  theirs: { homeScore: number; awayScore: number; joker: boolean; points: number | null } | null;
  mine: { homeScore: number; awayScore: number; joker: boolean; points: number | null } | null;
};

/** Pronostic d'un joueur sur un match donné (vue publique après coup d'envoi). */
export type MatchPrediction = {
  userId: string;
  name: string;
  homeScore: number;
  awayScore: number;
  joker: boolean;
  comment?: string;
  /** Points (définitifs si terminé, provisoires si en cours, null sinon). */
  points: number | null;
  /** true si les points sont provisoires (match en cours). */
  live: boolean;
};

/** Message du tchat. */
export type ChatMessage = {
  id: string;
  user: string;
  text: string;
  pinned: boolean;
  timestamp: string;
  reactions: { emoji: string; count: number; reacted: boolean }[];
};
