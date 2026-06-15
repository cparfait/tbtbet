// ─────────────────────────────────────────────
// Snapshot des cotes (server-only) — capture les cotes 1X2 sur les matchs à
// venir pour le scoring « façon MPP ».
//
// Séparé de lib/odds.ts (qui reste pur, importable côté client via scoring.ts)
// car ce module touche Prisma.
//
// Cadence : au plus 1 appel toutes les 6 h, et AUCUN appel s'il n'y a aucun
// match à venir. Un seul appel `fetchLiveOdds()` renvoie tous les matchs → coût
// piloté par la fréquence, pas par le nombre de matchs (cf. crédits The Odds API).
// ─────────────────────────────────────────────

import { prisma } from "./prisma";
import { countryCode } from "./flags";
import { fetchLiveOdds, type OddsMatch, type Odds1x2 } from "./odds";

const ODDS_INTERVAL_MS = 6 * 60 * 60_000; // 6 h entre deux captures réussies
const ODDS_ERROR_BACKOFF_MS = 15 * 60_000; // retry plus tôt après un échec dur
const SOON_MS = 72 * 60 * 60_000; // fenêtre « match imminent » pour l'alerte

type SnapshotResult = {
  updated: number;
  /** Matchs imminents non appariés (probable nom d'équipe non mappé). */
  unmatchedSoon: string[];
};

// `nextOddsFetchAt` = prochain instant autorisé. Armé seulement sur SUCCÈS (6 h)
// ou avec un backoff court sur échec → un souci API ne gèle plus 6 h.
let nextOddsFetchAt = 0;
let oddsInFlight: Promise<SnapshotResult> | null = null;

type MatchRow = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  kickoffAt: Date;
};

/**
 * Trouve l'évènement de cotes correspondant à un match (par code drapeau des
 * deux équipes, peu importe l'ordre domicile/extérieur), et renvoie les cotes
 * 1X2 ré-orientées vers le domicile/extérieur de NOTRE match. `null` si aucun
 * évènement n'apparie.
 */
function matchOdds(events: OddsMatch[], m: MatchRow): Odds1x2 | null {
  if (!m.homeFlag || !m.awayFlag) return null;

  const candidates = events.filter((e) => {
    const eh = countryCode(e.home);
    const ea = countryCode(e.away);
    if (!eh || !ea) return false;
    return (
      (eh === m.homeFlag && ea === m.awayFlag) ||
      (eh === m.awayFlag && ea === m.homeFlag)
    );
  });
  if (candidates.length === 0) return null;

  // Le plus proche du coup d'envoi (dédoublonne d'éventuels matchs aller/retour).
  const ev = candidates.reduce((best, e) =>
    Math.abs(+new Date(e.commenceTime) - +m.kickoffAt) <
    Math.abs(+new Date(best.commenceTime) - +m.kickoffAt)
      ? e
      : best
  );

  // L'évènement peut lister les équipes dans l'ordre inverse du nôtre.
  const swapped = countryCode(ev.home) === m.awayFlag;
  return swapped
    ? { home: ev.oddsAway, draw: ev.oddsDraw, away: ev.oddsHome }
    : { home: ev.oddsHome, draw: ev.oddsDraw, away: ev.oddsAway };
}

/**
 * Capture les cotes des matchs à venir (kickoff futur). Ne touche jamais un
 * match déjà commencé → la dernière valeur stockée reste la « closing odd ».
 * No-op silencieux si aucune clé `ODDS_API_KEY` (fetchLiveOdds → null).
 */
export async function snapshotOdds(): Promise<SnapshotResult> {
  const events = await fetchLiveOdds();
  if (!events || events.length === 0) return { updated: 0, unmatchedSoon: [] };

  const now = new Date();
  const soon = now.getTime() + SOON_MS;
  const matches = await prisma.match.findMany({
    where: { kickoffAt: { gt: now } },
    select: {
      id: true,
      homeTeam: true,
      awayTeam: true,
      homeFlag: true,
      awayFlag: true,
      kickoffAt: true,
    },
  });

  let updated = 0;
  const unmatchedSoon: string[] = [];
  for (const m of matches) {
    const odds = matchOdds(events, m);
    if (!odds) {
      // Match imminent sans cote → souvent un nom d'équipe non mappé : on le
      // signale pour backfill manuel (panneau admin « 🎲 Cotes manuelles »).
      if (+m.kickoffAt < soon) unmatchedSoon.push(`${m.homeTeam}–${m.awayTeam}`);
      continue;
    }
    await prisma.match.update({
      where: { id: m.id },
      data: {
        oddsHome: odds.home,
        oddsDraw: odds.draw,
        oddsAway: odds.away,
        oddsCapturedAt: now,
      },
    });
    updated++;
  }
  return { updated, unmatchedSoon };
}

/**
 * Snapshot throttlé : au plus 1 appel toutes les 6 h, et seulement s'il existe
 * un match à venir (garde-fou « pas d'appel sans match »). À appeler depuis la
 * boucle de sync.
 */
export async function maybeSnapshotOdds(): Promise<void> {
  if (Date.now() < nextOddsFetchAt) return;
  if (oddsInFlight) {
    await oddsInFlight.catch(() => {});
    return;
  }
  // Garde-fou : aucun match à venir → aucun appel réseau.
  const upcoming = await prisma.match.count({
    where: { kickoffAt: { gt: new Date() } },
  });
  if (upcoming === 0) return;

  oddsInFlight = snapshotOdds();
  try {
    const { updated, unmatchedSoon } = await oddsInFlight;
    nextOddsFetchAt = Date.now() + ODDS_INTERVAL_MS; // succès → prochaine dans 6 h
    if (updated > 0) console.log(`[odds] ✓ ${updated} matchs cotés`);
    if (unmatchedSoon.length > 0) {
      console.warn(
        `[odds] ⚠ ${unmatchedSoon.length} match(s) imminent(s) sans cote (à backfiller) : ${unmatchedSoon.join(", ")}`
      );
    }
  } catch (e) {
    // Échec dur (clé invalide, réseau…) → on retente bientôt, pas dans 6 h.
    nextOddsFetchAt = Date.now() + ODDS_ERROR_BACKOFF_MS;
    console.error("[odds] ✗", e instanceof Error ? e.message : e);
  } finally {
    oddsInFlight = null;
  }
}
