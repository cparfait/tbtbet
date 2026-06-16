/**
 * Comparateur de classement UNIQUE de DaronsFC.
 *
 * Départage : points → scores exacts → bons résultats → nom (ordre stable).
 * Utilisé par le classement de groupe, le classement live, le snapshot des rangs
 * (flèches ▲▼) et les notifications « tu t'es fait doublé » — une seule
 * définition pour éviter que deux écrans classent différemment à égalité.
 */
export type Rankable = {
  points: number;
  exactScores: number;
  correctResults: number;
  name?: string | null;
};

export function compareRanked(a: Rankable, b: Rankable): number {
  return (
    b.points - a.points ||
    b.exactScores - a.exactScores ||
    b.correctResults - a.correctResults ||
    (a.name ?? "").localeCompare(b.name ?? "")
  );
}
