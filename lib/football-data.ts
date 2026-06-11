/**
 * Client football-data.org (v4) — source GRATUITE des matchs.
 * Palier gratuit : couvre la Coupe du Monde (code `WC`), 10 req/min.
 * Token gratuit : https://www.football-data.org/client/register
 *
 * Synchronise les matchs vers la base (modèle `Match` + `Result`).
 */

import { prisma } from "./prisma";
import { countryCode } from "./flags";
import { computePoints } from "./scoring";
import type { Stage } from "./data/matches";

const BASE_URL = "https://api.football-data.org/v4";

/** Code compétition football-data (défaut : Coupe du Monde). */
export const COMPETITION = process.env.FOOTBALL_DATA_COMPETITION ?? "WC";

// ── Types partiels du payload /matches qui nous intéressent ──
type FdMatch = {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED | ...
  stage: string; // GROUP_STAGE | LAST_16 | QUARTER_FINALS | SEMI_FINALS | THIRD_PLACE | FINAL
  group: string | null; // "GROUP_A" | null
  matchday: number | null;
  homeTeam: { name: string | null };
  awayTeam: { name: string | null };
  score: { fullTime: { home: number | null; away: number | null } };
};

type FdMatchesResponse = { matches: FdMatch[] };

async function apiFetch<T>(path: string): Promise<T> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    throw new Error(
      "FOOTBALL_DATA_TOKEN manquant — récupère un token gratuit sur football-data.org."
    );
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": token },
    // Pas de cache : c'est le planificateur de sync (90 s en live / 30 min
    // hors match) qui régule le rythme. Un cache figerait la fraîcheur.
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`football-data ${res.status}: ${res.statusText} ${body}`.trim());
  }

  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────
// Mapping football-data → modèle DaronsFC
// ─────────────────────────────────────────────

const TEAM_NAME_FR: Record<string, string> = {
  Algeria: "Algérie",
  Argentina: "Argentine",
  Australia: "Australie",
  Austria: "Autriche",
  Belgium: "Belgique",
  "Bosnia-Herzegovina": "Bosnie-Herzégovine",
  Brazil: "Brésil",
  Canada: "Canada",
  "Cape Verde Islands": "Cap-Vert",
  "Cape Verde": "Cap-Vert",
  Colombia: "Colombie",
  "Congo DR": "Congo RD",
  "DR Congo": "Congo RD",
  Croatia: "Croatie",
  Curaçao: "Curaçao",
  Czechia: "Tchéquie",
  "Czech Republic": "Tchéquie",
  Ecuador: "Équateur",
  Egypt: "Égypte",
  England: "Angleterre",
  France: "France",
  Germany: "Allemagne",
  Ghana: "Ghana",
  Haiti: "Haïti",
  Iran: "Iran",
  Iraq: "Irak",
  "Ivory Coast": "Côte d'Ivoire",
  Japan: "Japon",
  Jordan: "Jordanie",
  Mexico: "Mexique",
  Morocco: "Maroc",
  Netherlands: "Pays-Bas",
  "New Zealand": "Nouvelle-Zélande",
  Norway: "Norvège",
  Panama: "Panama",
  Paraguay: "Paraguay",
  Portugal: "Portugal",
  Qatar: "Qatar",
  "Saudi Arabia": "Arabie Saoudite",
  Scotland: "Écosse",
  Senegal: "Sénégal",
  "South Africa": "Afrique du Sud",
  "South Korea": "Corée du Sud",
  "Korea Republic": "Corée du Sud",
  Spain: "Espagne",
  Sweden: "Suède",
  Switzerland: "Suisse",
  Tunisia: "Tunisie",
  Turkey: "Türkiye",
  Türkiye: "Türkiye",
  "United States": "États-Unis",
  USA: "États-Unis",
  Uruguay: "Uruguay",
  Uzbekistan: "Ouzbékistan",
  Wales: "Pays de Galles",
  Italy: "Italie",
  Poland: "Pologne",
  Denmark: "Danemark",
  Serbia: "Serbie",
  Cameroon: "Cameroun",
  Nigeria: "Nigéria",
  "Costa Rica": "Costa Rica",
  Ukraine: "Ukraine",
};

function translateTeam(name: string): string {
  return TEAM_NAME_FR[name] ?? name;
}

const STAGE_MAP: Record<string, Stage> = {
  GROUP_STAGE: "GROUP",
  LAST_32: "ROUND_OF_32",
  LAST_16: "ROUND_OF_16",
  QUARTER_FINALS: "QUARTER",
  SEMI_FINALS: "SEMI",
  THIRD_PLACE: "THIRD_PLACE",
  FINAL: "FINAL",
};

function mapStage(stage: string): Stage {
  return STAGE_MAP[stage] ?? "GROUP";
}

/** "GROUP_A" → "A", sinon null. */
function mapGroup(group: string | null): string | null {
  if (!group) return null;
  const m = group.match(/GROUP[_\s]?([A-L])/i);
  return m?.[1] ? m[1].toUpperCase() : null;
}

let lastSyncAt = 0;

/**
 * Déclenche syncMatches() seulement si le dernier sync date de plus de
 * `minIntervalMs` ms. Utilisé pour les déclenchements automatiques (login,
 * navigation) sans risquer de spammer l'API football-data.org (10 req/min).
 */
export async function maybeSyncMatches(minIntervalMs = 2 * 60_000): Promise<void> {
  const now = Date.now();
  if (now - lastSyncAt < minIntervalMs) return;
  lastSyncAt = now;
  try {
    const result = await syncMatches();
    console.log(
      `[sync] ✓ ${result.matches} matchs, ${result.results} résultats — ${new Date().toLocaleTimeString("fr-FR")}`
    );
  } catch (err) {
    console.error("[sync] ✗", err instanceof Error ? err.message : err);
  }
}

/**
 * Synchronise les matchs de la compétition vers la base.
 * Idempotent : upsert sur `externalId`. Renvoie les compteurs.
 */
export async function syncMatches(
  competition = COMPETITION
): Promise<{ matches: number; results: number }> {
  const data = await apiFetch<FdMatchesResponse>(
    `/competitions/${competition}/matches`
  );

  let results = 0;

  for (const fd of data.matches) {
    // On ignore les matchs sans équipes définies (qualifications à venir).
    const homeTeam = fd.homeTeam.name;
    const awayTeam = fd.awayTeam.name;
    if (!homeTeam || !awayTeam) continue;

    const matchData = {
      homeTeam: translateTeam(homeTeam),
      awayTeam: translateTeam(awayTeam),
      homeFlag: countryCode(homeTeam),
      awayFlag: countryCode(awayTeam),
      kickoffAt: new Date(fd.utcDate),
      stage: mapStage(fd.stage),
      group: mapGroup(fd.group),
      matchday: fd.matchday,
      externalId: fd.id,
    };

    const existing = await prisma.match.findFirst({
      where: { externalId: fd.id },
      select: { id: true },
    });

    const match = existing
      ? await prisma.match.update({ where: { id: existing.id }, data: matchData })
      : await prisma.match.create({ data: matchData });

    // Résultat
    const home = fd.score.fullTime.home;
    const away = fd.score.fullTime.away;
    if (fd.status === "FINISHED" && home != null && away != null) {
      await applyMatchResult(match.id, home, away);
      results++;
    } else if (
      (fd.status === "IN_PLAY" || fd.status === "PAUSED") &&
      home != null &&
      away != null
    ) {
      // Score en direct : stocké avec le statut LIVE, SANS créditer de points
      // (les points ne sont attribués qu'au coup de sifflet final).
      await prisma.result.upsert({
        where: { matchId: match.id },
        update: { homeScore: home, awayScore: away, status: "LIVE" },
        create: { matchId: match.id, homeScore: home, awayScore: away, status: "LIVE" },
      });
    }
  }

  return { matches: data.matches.length, results };
}

/**
 * Fige le classement courant (rang de chaque joueur) dans `Score.previousRank`.
 * Appelé juste AVANT de créditer les points d'un match qui se termine, pour
 * pouvoir afficher l'évolution ▲▼ par rapport au match précédent.
 */
async function snapshotRanks(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { banned: false },
    select: {
      id: true,
      score: {
        select: { points: true, exactScores: true, correctResults: true },
      },
    },
  });

  const ordered = users
    .map((u) => ({
      userId: u.id,
      hasScore: u.score != null,
      points: u.score?.points ?? 0,
      exact: u.score?.exactScores ?? 0,
      correct: u.score?.correctResults ?? 0,
    }))
    .sort(
      (a, b) => b.points - a.points || b.exact - a.exact || b.correct - a.correct
    );

  let rank = 1;
  for (const o of ordered) {
    if (o.hasScore) {
      await prisma.score.update({
        where: { userId: o.userId },
        data: { previousRank: rank },
      });
    }
    rank++;
  }
}

/**
 * Indique s'il y a une fenêtre de match « active » (un match dont le coup
 * d'envoi est imminent ou qui est probablement en cours), d'après les
 * horaires en base — SANS appeler l'API. Sert à décider de la fréquence de
 * synchronisation (rapide en live, lente sinon).
 */
export async function hasActiveMatchWindow(): Promise<boolean> {
  const now = Date.now();
  const from = new Date(now - 140 * 60_000); // kickoff jusqu'à 2h20 avant
  const to = new Date(now + 15 * 60_000); // kickoff jusqu'à 15 min après now
  try {
    const count = await prisma.match.count({
      where: { kickoffAt: { gte: from, lte: to } },
    });
    return count > 0;
  } catch {
    return false;
  }
}

/**
 * Enregistre le résultat d'un match et attribue les points correspondants.
 * Idempotent : seules les prédictions non encore traitées (pointsAwarded null)
 * sont créditées, donc un re-appel avec le même résultat ne double pas les points.
 * Réutilisé par la synchro automatique ET la saisie manuelle (console admin).
 */
export async function applyMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number
): Promise<{ scored: number }> {
  const preds = await prisma.prediction.findMany({
    where: { matchId, pointsAwarded: null },
  });

  // Si ce match va effectivement créditer des points, on fige d'abord le
  // classement actuel (= rang AVANT ce match) pour les flèches d'évolution.
  if (preds.length > 0) {
    await snapshotRanks();
  }

  await prisma.result.upsert({
    where: { matchId },
    update: { homeScore, awayScore, status: "FINISHED" },
    create: { matchId, homeScore, awayScore, status: "FINISHED" },
  });

  for (const pred of preds) {
    const { points, exactScore, correctResult } = computePoints(
      { homeScore: pred.homeScore, awayScore: pred.awayScore },
      { homeScore, awayScore },
      pred.joker
    );
    await prisma.prediction.update({
      where: { id: pred.id },
      data: { pointsAwarded: points },
    });
    await prisma.score.upsert({
      where: { userId: pred.userId },
      update: {
        points: { increment: points },
        exactScores: { increment: exactScore ? 1 : 0 },
        correctResults: { increment: correctResult ? 1 : 0 },
      },
      create: {
        userId: pred.userId,
        points,
        exactScores: exactScore ? 1 : 0,
        correctResults: correctResult ? 1 : 0,
      },
    });
    await checkAndAwardBadges(pred.userId);
  }

  return { scored: preds.length };
}

// ─────────────────────────────────────────────
// Attribution automatique des badges
// ─────────────────────────────────────────────

async function checkAndAwardBadges(userId: string): Promise<void> {
  const [score, existingBadges] = await Promise.all([
    prisma.score.findUnique({ where: { userId } }),
    prisma.userBadge.findMany({
      where: { userId },
      include: { badge: { select: { key: true } } },
    }),
  ]);

  const hasBadge = new Set(existingBadges.map((b) => b.badge.key));
  const toAward: string[] = [];

  // ── sniper : 10 scores exacts au total ──
  if (!hasBadge.has("sniper") && (score?.exactScores ?? 0) >= 10) {
    toAward.push("sniper");
  }

  // ── nostradamus : 3 scores exacts consécutifs ──
  if (!hasBadge.has("nostradamus")) {
    const scoredPreds = await prisma.prediction.findMany({
      where: { userId, pointsAwarded: { not: null } },
      include: {
        match: {
          select: { kickoffAt: true },
          include: { result: true },
        },
      },
      orderBy: { match: { kickoffAt: "asc" } },
    });

    let consecutive = 0;
    for (const p of scoredPreds) {
      const r = p.match.result;
      if (r && p.homeScore === r.homeScore && p.awayScore === r.awayScore) {
        consecutive++;
        if (consecutive >= 3) {
          toAward.push("nostradamus");
          break;
        }
      } else {
        consecutive = 0;
      }
    }
  }

  // ── meme_pas_mal : 0 pt sur toutes les prédictions d'une même journée ──
  if (!hasBadge.has("meme_pas_mal")) {
    const allPreds = await prisma.prediction.findMany({
      where: { userId },
      include: { match: { select: { matchday: true, result: true } } },
    });

    const byMatchday = new Map<number, typeof allPreds>();
    for (const p of allPreds) {
      const day = p.match.matchday;
      if (day == null) continue;
      const list = byMatchday.get(day) ?? [];
      list.push(p);
      byMatchday.set(day, list);
    }

    for (const dayPreds of byMatchday.values()) {
      // Journée avec au moins 2 pronostics, tous terminés et tous à 0 pt
      if (
        dayPreds.length >= 2 &&
        dayPreds.every((p) => p.pointsAwarded !== null) &&
        dayPreds.every((p) => p.pointsAwarded === 0)
      ) {
        toAward.push("meme_pas_mal");
        break;
      }
    }
  }

  // ── Award ──
  for (const key of toAward) {
    const badge = await prisma.badge.findUnique({ where: { key } });
    if (!badge) continue;
    await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      update: {},
      create: { userId, badgeId: badge.id },
    });
    console.log(`[badges] 🎖️ "${key}" attribué à ${userId}`);
  }
}
