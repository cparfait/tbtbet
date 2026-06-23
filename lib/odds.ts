import type { BracketSource, MatchPhase } from "@/lib/generated/prisma";

export const DEFAULT_ODDS = 2;
export const CROSS_LOSER_ODDS = 3;
export const CROSS_WINNER_ODDS = 1.5;
export const JOKER_MULTIPLIER = 2;
export const WINS_PENALTY = 0.2;  // réduction par victoire (bracket seulement)
export const ODDS_FLOOR = 1.2;    // cote minimum

function getBaseOdds(
  phase: MatchPhase,
  teamSource: BracketSource,
  opponentSource: BracketSource
): number {
  if (phase === "POOL") return DEFAULT_ODDS;

  const isCross =
    (teamSource === "WINNER_BRACKET" && opponentSource === "LOSER_BRACKET") ||
    (teamSource === "LOSER_BRACKET" && opponentSource === "WINNER_BRACKET");

  if (isCross) {
    return teamSource === "LOSER_BRACKET" ? CROSS_LOSER_ODDS : CROSS_WINNER_ODDS;
  }

  return DEFAULT_ODDS;
}

/**
 * Calcule la cote pour une équipe donnée dans un match.
 * En poule : toujours x2.
 * En bracket/finale : réduit de 0.2 par victoire accumulée dans le tournoi (plancher x1.2).
 */
export function getOddsForTeam(
  phase: MatchPhase,
  teamSource: BracketSource,
  opponentSource: BracketSource,
  teamWins = 0
): number {
  const base = getBaseOdds(phase, teamSource, opponentSource);
  if (phase === "POOL") return base;
  const raw = base - teamWins * WINS_PENALTY;
  return Math.max(ODDS_FLOOR, Math.round(raw * 10) / 10);
}

/**
 * Cote pour un pari sur l'égalité (poules uniquement).
 */
export function getOddsForDraw(): number {
  return DEFAULT_ODDS;
}

export function calculatePayout(
  amountWizz: number,
  oddsApplied: number,
  jokerUsed: boolean
): number {
  return Math.round(amountWizz * oddsApplied * (jokerUsed ? JOKER_MULTIPLIER : 1));
}

export function calculateNetGain(
  amountWizz: number,
  oddsApplied: number,
  jokerUsed: boolean
): number {
  return calculatePayout(amountWizz, oddsApplied, jokerUsed) - amountWizz;
}
