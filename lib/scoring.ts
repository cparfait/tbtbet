/**
 * Logique de calcul des points DaronsFC.
 *
 * Barème « cotes » (façon MPP) quand le match a des cotes figées — soit
 * R = points du bon résultat, indexés sur la difficulté de l'issue réelle
 * (R ∈ [1,6], voir `resultPoints` dans lib/odds) :
 *
 * | Résultat                                            | Points |
 * |-----------------------------------------------------|--------|
 * | Score exact                                         | R × 2  |
 * | Bon vainqueur + bonne différence de buts (hors nul) | R + 1  |
 * | Bon sens du résultat (bon vainqueur OU bon nul)      | R      |
 * | Mauvais pronostic                                   | 0      |
 * | Joker activé                                        | × 2    |
 *
 * Repli (match SANS cote figée) : barème historique 3 / 2 / 1 / 0.
 *
 * Note sur les nuls : un nul a toujours une différence de buts nulle, donc le
 * bonus « bonne différence » ne s'applique pas aux nuls — un nul bien vu mais
 * au mauvais score vaut R (et R×2 si exact).
 *
 * Fonction pure — entièrement testable sans base de données.
 */

import { outcomeResultPoints, type OddsInput } from "./odds";

/** Bonus accordé au joueur ayant désigné le bon vainqueur du tournoi. */
export const CHAMPION_BONUS = 50;

export type ScoreInput = {
  homeScore: number;
  awayScore: number;
};

export type ScoreBreakdown = {
  /** Points avant application du joker. */
  base: number;
  /** Points effectivement crédités (× 2 si joker). */
  points: number;
  exactScore: boolean;
  correctResult: boolean;
};

/** -1 = victoire extérieure, 0 = nul, 1 = victoire domicile. */
function outcome({ homeScore, awayScore }: ScoreInput): -1 | 0 | 1 {
  if (homeScore > awayScore) return 1;
  if (homeScore < awayScore) return -1;
  return 0;
}

export function computePoints(
  prediction: ScoreInput,
  result: ScoreInput,
  joker = false,
  odds?: OddsInput | null
): ScoreBreakdown {
  const exactScore =
    prediction.homeScore === result.homeScore &&
    prediction.awayScore === result.awayScore;

  const predOutcome = outcome(prediction);
  const resOutcome = outcome(result);
  const sameOutcome = predOutcome === resOutcome;
  const isDraw = predOutcome === 0;
  const sameDiff =
    prediction.homeScore - prediction.awayScore ===
    result.homeScore - result.awayScore;

  // Points « bon résultat » indexés sur la cote de l'issue RÉELLE (façon MPP) :
  // plus elle était improbable, plus elle rapporte. `null` si pas de cote.
  const R = outcomeResultPoints(odds, resOutcome);

  let base: number;
  if (R !== null) {
    // ── Barème « cotes » ──
    if (!sameOutcome) base = 0;
    else if (exactScore) base = R * 2; // score exact = double le résultat
    else if (sameDiff && !isDraw) base = R + 1; // bonne diff (hors nul)
    else base = R; // bon résultat seul
  } else {
    // ── Repli : barème historique (3 / 2 / 1) ──
    if (exactScore) base = 3;
    else if (sameOutcome && sameDiff && !isDraw) base = 2;
    else if (sameOutcome) base = 1;
    else base = 0;
  }

  return {
    base,
    points: joker ? base * 2 : base,
    exactScore,
    correctResult: sameOutcome,
  };
}
