// ─────────────────────────────────────────────
// Client « cotes » (The Odds API) — expérimental.
//
// Récupère les cotes 1X2 (marché « h2h ») d'une compétition et en déduit des
// probabilités implicites + un palier de difficulté façon MPP. Sert pour
// l'instant la page de test /odds-test.
//
// Clé gratuite : https://the-odds-api.com (500 req/mois). Sans clé, l'appelant
// retombe sur SAMPLE_ODDS pour visualiser le rendu.
// ─────────────────────────────────────────────

const BASE_URL = "https://api.the-odds-api.com/v4";

/** Clé de sport The Odds API (défaut : Coupe du Monde). Surchageable par env. */
export const ODDS_SPORT = process.env.ODDS_API_SPORT ?? "soccer_fifa_world_cup";
/** Région bookmakers (eu couvre bien les compétitions internationales). */
export const ODDS_REGION = process.env.ODDS_API_REGION ?? "eu";

/** Cotes 1X2 (décimales) d'un match, normalisées pour notre usage. */
export type OddsMatch = {
  home: string;
  away: string;
  commenceTime: string; // ISO
  oddsHome: number;
  oddsDraw: number;
  oddsAway: number;
  bookmaker?: string;
};

// ── Types partiels du payload The Odds API ──
type ApiOutcome = { name: string; price: number };
type ApiMarket = { key: string; outcomes: ApiOutcome[] };
type ApiBookmaker = { key: string; title: string; markets: ApiMarket[] };
type ApiEvent = {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: ApiBookmaker[];
};

/** Extrait les cotes 1X2 d'un évènement (1er bookmaker proposant le h2h). */
function toOddsMatch(ev: ApiEvent): OddsMatch | null {
  for (const bk of ev.bookmakers) {
    const h2h = bk.markets.find((m) => m.key === "h2h");
    if (!h2h) continue;
    const home = h2h.outcomes.find((o) => o.name === ev.home_team)?.price;
    const away = h2h.outcomes.find((o) => o.name === ev.away_team)?.price;
    const draw = h2h.outcomes.find((o) => o.name === "Draw")?.price;
    if (home && away && draw) {
      return {
        home: ev.home_team,
        away: ev.away_team,
        commenceTime: ev.commence_time,
        oddsHome: home,
        oddsDraw: draw,
        oddsAway: away,
        bookmaker: bk.title,
      };
    }
  }
  return null;
}

/**
 * Récupère les cotes 1X2 en direct. Renvoie null si aucune clé n'est
 * configurée (l'appelant bascule alors sur les données d'exemple).
 */
export async function fetchLiveOdds(): Promise<OddsMatch[] | null> {
  const key = process.env.ODDS_API_KEY;
  if (!key) return null;

  const url =
    `${BASE_URL}/sports/${ODDS_SPORT}/odds/?apiKey=${key}` +
    `&regions=${ODDS_REGION}&markets=h2h&oddsFormat=decimal`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`the-odds-api ${res.status}: ${res.statusText} ${body}`.trim());
  }
  const events = (await res.json()) as ApiEvent[];
  return events
    .map(toOddsMatch)
    .filter((m): m is OddsMatch => m !== null)
    .sort((a, b) => +new Date(a.commenceTime) - +new Date(b.commenceTime));
}

/**
 * Probabilités implicites (en %) déduites des cotes, normalisées pour retirer
 * la marge du bookmaker (« vig ») : p_i = (1/cote_i) / Σ(1/cote).
 */
export function impliedProbabilities(m: OddsMatch): {
  home: number;
  draw: number;
  away: number;
} {
  const rHome = 1 / m.oddsHome;
  const rDraw = 1 / m.oddsDraw;
  const rAway = 1 / m.oddsAway;
  const total = rHome + rDraw + rAway;
  return {
    home: (rHome / total) * 100,
    draw: (rDraw / total) * 100,
    away: (rAway / total) * 100,
  };
}

/** Étiquette de difficulté d'une issue (juste pour le visuel / la couleur). */
export type Tier = {
  label: string;
  /** Couleur d'accent (variable CSS) pour l'UI. */
  accent: string;
};

export function outcomeTier(probPct: number): Tier {
  if (probPct >= 50) return { label: "Favori", accent: "var(--color-muted)" };
  if (probPct >= 33)
    return { label: "Équilibré", accent: "var(--color-pitch-bright)" };
  if (probPct >= 18) return { label: "Outsider", accent: "var(--color-gold)" };
  return { label: "Gros outsider", accent: "var(--color-gold-bright)" };
}

/**
 * Points pour un BON RÉSULTAT selon la proba implicite de l'issue choisie.
 * Courbe douce bornée ~1–6 : plus l'issue est improbable, plus ça rapporte.
 *   points = 1 + 5 × (1 − proba), arrondi.
 * Le score exact et la différence de buts s'ajouteraient par-dessus (hors proto).
 */
export function resultPoints(probPct: number): number {
  const p = Math.min(1, Math.max(0, probPct / 100));
  return Math.round(1 + 5 * (1 - p));
}

/** Cotes 1X2 décimales d'un match (telles que stockées sur `Match`). */
export type Odds1x2 = { home: number; draw: number; away: number };

/** Cotes telles que lues en base : chaque champ peut être absent/null. */
export type OddsInput = {
  home?: number | null;
  draw?: number | null;
  away?: number | null;
};

/**
 * Points « bon résultat » (R) pour une issue, déduits des cotes 1X2.
 * `outcome` : 1 = victoire domicile, 0 = nul, -1 = victoire extérieur.
 * Renvoie `null` si les cotes sont absentes/invalides → l'appelant retombe sur
 * le barème historique.
 */
export function outcomeResultPoints(
  odds: OddsInput | null | undefined,
  outcome: -1 | 0 | 1
): number | null {
  const home = odds?.home;
  const draw = odds?.draw;
  const away = odds?.away;
  if (!home || !draw || !away || home <= 1 || draw <= 1 || away <= 1) return null;
  const rHome = 1 / home;
  const rDraw = 1 / draw;
  const rAway = 1 / away;
  const total = rHome + rDraw + rAway;
  const p =
    outcome === 1 ? rHome / total : outcome === 0 ? rDraw / total : rAway / total;
  return resultPoints(p * 100);
}

/** Jeu d'exemple (sans clé API) — quelques affiches Coupe du Monde. */
export const SAMPLE_ODDS: OddsMatch[] = [
  {
    home: "France",
    away: "Norway",
    commenceTime: "2026-06-16T19:00:00Z",
    oddsHome: 1.4,
    oddsDraw: 4.8,
    oddsAway: 7.5,
    bookmaker: "Exemple",
  },
  {
    home: "Brazil",
    away: "Croatia",
    commenceTime: "2026-06-17T16:00:00Z",
    oddsHome: 1.85,
    oddsDraw: 3.6,
    oddsAway: 4.2,
    bookmaker: "Exemple",
  },
  {
    home: "Japan",
    away: "Spain",
    commenceTime: "2026-06-18T18:00:00Z",
    oddsHome: 6.0,
    oddsDraw: 4.0,
    oddsAway: 1.55,
    bookmaker: "Exemple",
  },
  {
    home: "England",
    away: "Argentina",
    commenceTime: "2026-06-19T20:00:00Z",
    oddsHome: 2.7,
    oddsDraw: 3.2,
    oddsAway: 2.6,
    bookmaker: "Exemple",
  },
];
