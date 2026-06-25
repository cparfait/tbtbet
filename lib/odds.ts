import { expectedScore, DEFAULT_ELO } from "@/lib/elo";

export { DEFAULT_ELO };
export const JOKER_MULTIPLIER = 2;
export const ODDS_FLOOR = 1.1;
export const ODDS_CEILING = 15.0;

/**
 * Cote pour une équipe face à son adversaire, dérivée de l'ELO.
 * Au départ (ELO identiques) : ×2.0. S'ajuste dynamiquement ensuite.
 */
export function getOddsForTeam(teamElo: number, opponentElo: number): number {
  const prob = expectedScore(teamElo, opponentElo);
  const raw = 1 / prob;
  const clamped = Math.min(ODDS_CEILING, Math.max(ODDS_FLOOR, raw));
  return Math.round(clamped * 100) / 100;
}

/** Cote nul (conservée pour compatibilité historique). */
export function getOddsForDraw(): number {
  return 2;
}

export function calculatePayout(
  amountWizz: number,
  oddsApplied: number,
  jokerUsed: boolean,
): number {
  return Math.round(amountWizz * oddsApplied * (jokerUsed ? JOKER_MULTIPLIER : 1));
}

export function calculateNetGain(
  amountWizz: number,
  oddsApplied: number,
  jokerUsed: boolean,
): number {
  return calculatePayout(amountWizz, oddsApplied, jokerUsed) - amountWizz;
}
