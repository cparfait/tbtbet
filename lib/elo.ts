export const K_FACTOR = 50;
export const ELO_BASE = 400;
export const DEFAULT_ELO = 1000;

/** Probabilité attendue de gagner pour l'équipe avec `elo` face à `opponentElo`. */
export function expectedScore(elo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - elo) / ELO_BASE));
}

/**
 * Multiplicateur basé sur l'écart de buts (formule du pote).
 * diff ≤ 1 → ×1.0 | diff = 2 → ×1.5 | diff ≥ 3 → ×(log(diff+1)+1)
 */
export function goalDiffMultiplier(scoreA: number, scoreB: number): number {
  const diff = Math.abs(scoreA - scoreB);
  if (diff <= 1) return 1.0;
  if (diff === 2) return 1.5;
  return Math.log(diff + 1) + 1;
}

/** Calcule les deltas ELO après un match. La somme est toujours zéro. */
export function calculateEloChange(
  eloA: number,
  eloB: number,
  scoreA: number,
  scoreB: number,
): { changeA: number; changeB: number } {
  const eA = expectedScore(eloA, eloB);
  const actualA = scoreA > scoreB ? 1.0 : scoreA < scoreB ? 0.0 : 0.5;
  const multiplier = goalDiffMultiplier(scoreA, scoreB);
  const changeA = Math.round(K_FACTOR * (actualA - eA) * multiplier);
  return { changeA, changeB: -changeA };
}
