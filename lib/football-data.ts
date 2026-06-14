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
import { compareRanked } from "./ranking";
import { postMatchRecaps, postKickoffReminders } from "./match-recap";
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

// Horodatage du dernier sync RÉUSSI (mis à jour par tout appel à syncMatches,
// y compris la boucle d'instrumentation) + verrou anti-concurrence intra-process.
// Best-effort : sur un déploiement multi-réplicas, un store partagé (Redis/DB)
// serait nécessaire pour dédupliquer entre instances.
let lastSyncAt = 0;
let syncInFlight: Promise<{ matches: number; results: number }> | null = null;

/**
 * Déclenche syncMatches() seulement si le dernier sync réussi date de plus de
 * `minIntervalMs` ms. Utilisé pour les déclenchements automatiques (login,
 * navigation) sans risquer de spammer l'API football-data.org (10 req/min).
 * Coalesce les appels concurrents : deux navigations simultanées ne lancent
 * qu'un seul appel réseau.
 */
export async function maybeSyncMatches(minIntervalMs = 2 * 60_000): Promise<void> {
  if (Date.now() - lastSyncAt < minIntervalMs) return;
  if (syncInFlight) {
    // Un sync est déjà en cours : on s'y rattache plutôt que d'en lancer un 2ᵉ.
    await syncInFlight.catch(() => {});
    return;
  }
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
 *
 * Met à jour `lastSyncAt` et partage un verrou anti-concurrence avec
 * maybeSyncMatches() : un sync auto (instrumentation) repousse donc d'autant
 * les syncs déclenchés par la navigation.
 */
export async function syncMatches(
  competition = COMPETITION
): Promise<{ matches: number; results: number }> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = runSyncMatches(competition).finally(() => {
    lastSyncAt = Date.now();
    syncInFlight = null;
  });
  return syncInFlight;
}

async function runSyncMatches(
  competition: string
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

  // Rappels « pense à pronostiquer » pour les matchs imminents (idempotent).
  await postKickoffReminders().catch((e) =>
    console.error("[reminder] ignoré:", e instanceof Error ? e.message : e)
  );

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
      name: true,
      score: {
        select: { points: true, exactScores: true, correctResults: true },
      },
    },
  });

  const ordered = users
    .map((u) => ({
      userId: u.id,
      name: u.name,
      hasScore: u.score != null,
      points: u.score?.points ?? 0,
      exactScores: u.score?.exactScores ?? 0,
      correctResults: u.score?.correctResults ?? 0,
    }))
    .sort(compareRanked);

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
 * Enregistre (ou corrige) le résultat d'un match et (re)calcule les points.
 *
 * Robuste aux CORRECTIONS : au lieu d'incrémenter, on RECALCULE intégralement
 * le score de chaque joueur concerné à partir de tous ses pronos terminés. Un
 * re-appel avec un score corrigé met donc le classement à jour correctement
 * (et un re-appel à l'identique est un no-op). Le tout dans une transaction →
 * pas d'état partiel en cas de coupure.
 *
 * Réutilisé par la synchro automatique ET la saisie manuelle (console admin).
 * `force: true` (admin) saute le fast-path et recalcule même si le résultat
 * est identique — utile pour ré-appliquer un barème qui a changé.
 */
export async function applyMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
  opts: { force?: boolean } = {}
): Promise<{ scored: number }> {
  // Statut AVANT cet appel → permet de détecter la transition vers FINISHED
  // (pour ne poster le récap chat qu'une fois, jamais sur un simple rescore).
  const priorResult = await prisma.result.findUnique({ where: { matchId } });
  const justFinished = priorResult?.status !== "FINISHED";

  // Fast-path pour la sync auto (toutes les 90 s en live) : si ce résultat est
  // déjà enregistré à l'identique et qu'aucun prono n'attend de points, il n'y
  // a rien à faire — on évite de rouvrir transaction + recalcul + badges pour
  // chaque match terminé à chaque cycle.
  if (!opts.force) {
    if (
      priorResult?.status === "FINISHED" &&
      priorResult.homeScore === homeScore &&
      priorResult.awayScore === awayScore
    ) {
      const pending = await prisma.prediction.count({
        where: { matchId, pointsAwarded: null },
      });
      if (pending === 0) return { scored: 0 };
    }
  }

  const preds = await prisma.prediction.findMany({ where: { matchId } });

  // Ce résultat change-t-il réellement quelque chose ? (nouveau résultat ou
  // points d'au moins un prono différents de ce qui est déjà crédité)
  const changed = preds.some((p) => {
    const pts = computePoints(
      { homeScore: p.homeScore, awayScore: p.awayScore },
      { homeScore, awayScore },
      p.joker
    ).points;
    return p.pointsAwarded !== pts;
  });

  // On fige le classement courant (= rang AVANT ce match) pour les flèches
  // d'évolution — uniquement si les rangs vont bouger. Défensif : un souci ici
  // ne doit pas empêcher l'attribution des points.
  if (changed && preds.length > 0) {
    try {
      await snapshotRanks();
    } catch (e) {
      console.error("[snapshotRanks] ignoré:", e instanceof Error ? e.message : e);
    }
  }

  // Écriture atomique : résultat + pointsAwarded de ce match + recalcul du
  // score agrégé de chaque joueur concerné.
  await prisma.$transaction(
    async (tx) => {
      await tx.result.upsert({
        where: { matchId },
        update: { homeScore, awayScore, status: "FINISHED" },
        create: { matchId, homeScore, awayScore, status: "FINISHED" },
      });

      for (const pred of preds) {
        const { points } = computePoints(
          { homeScore: pred.homeScore, awayScore: pred.awayScore },
          { homeScore, awayScore },
          pred.joker
        );
        if (pred.pointsAwarded !== points) {
          await tx.prediction.update({
            where: { id: pred.id },
            data: { pointsAwarded: points },
          });
        }
      }

      // Recalcul complet du score de chaque joueur concerné, à partir de TOUS
      // ses pronos sur des matchs terminés (source de vérité = les résultats).
      const userIds = [...new Set(preds.map((p) => p.userId))];
      for (const userId of userIds) {
        const userPreds = await tx.prediction.findMany({
          where: { userId, match: { result: { status: "FINISHED" } } },
          include: { match: { include: { result: true } } },
        });
        let points = 0;
        let exactScores = 0;
        let correctResults = 0;
        for (const up of userPreds) {
          const r = up.match.result;
          if (!r) continue;
          const b = computePoints(
            { homeScore: up.homeScore, awayScore: up.awayScore },
            { homeScore: r.homeScore, awayScore: r.awayScore },
            up.joker
          );
          points += b.points;
          if (b.exactScore) exactScores++;
          if (b.correctResult) correctResults++;
        }
        await tx.score.upsert({
          where: { userId },
          update: { points, exactScores, correctResults },
          create: { userId, points, exactScores, correctResults },
        });
      }
    },
    { timeout: 20_000 }
  );

  // Badges : une seule passe par joueur concerné, après commit (idempotent).
  const userIds = [...new Set(preds.map((p) => p.userId))];
  await Promise.all(
    userIds.map((userId) =>
      checkAndAwardBadges(userId).catch((e) =>
        console.error("[badges] ignoré:", e instanceof Error ? e.message : e)
      )
    )
  );

  // Récap auto dans le tchat de chaque groupe — uniquement à la transition vers
  // FINISHED (jamais sur un rescore). Idempotent par (match, groupe).
  if (justFinished) {
    await postMatchRecaps(matchId).catch((e) =>
      console.error("[recap] ignoré:", e instanceof Error ? e.message : e)
    );
  }

  return { scored: preds.length };
}

// ─────────────────────────────────────────────
// Attribution automatique des badges
// ─────────────────────────────────────────────

async function checkAndAwardBadges(userId: string): Promise<void> {
  const [score, existingBadges, scoredPreds, allPreds] = await Promise.all([
    prisma.score.findUnique({ where: { userId } }),
    prisma.userBadge.findMany({
      where: { userId },
      include: { badge: { select: { key: true, id: true } } },
    }),
    prisma.prediction.findMany({
      where: { userId, pointsAwarded: { not: null } },
      include: {
        match: { include: { result: true } },
      },
      orderBy: { match: { kickoffAt: "asc" } },
    }),
    prisma.prediction.findMany({
      where: { userId },
      include: { match: { select: { matchday: true, kickoffAt: true } } },
    }),
  ]);

  const points = score?.points ?? 0;

  // Badges calculés (et donc réconciliés) par cette fonction. Les badges hors
  // de cette liste — ex. « daronissime », attribué à la clôture du tournoi — ne
  // sont jamais retirés ici.
  const MANAGED_KEYS = new Set([
    "premier_pas",
    "sniper",
    "demi_centurion",
    "centurion",
    "perfectionniste",
    "nostradamus",
    "en_feu",
    "meme_pas_mal",
    "assidu",
  ]);

  // Ensemble des badges MÉRITÉS d'après les données actuelles. On le recalcule
  // intégralement à chaque passe pour qu'un recalcul (correction de résultat,
  // joker ajouté puis retiré…) retire les badges qui ne sont plus justifiés.
  const shouldHave = new Set<string>();
  const want = (key: string, cond: boolean) => {
    if (cond) shouldHave.add(key);
  };

  const isExact = (p: (typeof scoredPreds)[number]) =>
    !!p.match.result &&
    p.homeScore === p.match.result.homeScore &&
    p.awayScore === p.match.result.awayScore;

  // ── Seuils simples ──
  want("premier_pas", allPreds.length >= 1);
  want("sniper", (score?.exactScores ?? 0) >= 10);
  want("demi_centurion", points >= 50);
  want("centurion", points >= 100);

  // ── perfectionniste : un score exact avec joker ──
  want("perfectionniste", scoredPreds.some((p) => p.joker && isExact(p)));

  // ── nostradamus : 3 scores exacts consécutifs ──
  {
    let streak = 0;
    for (const p of scoredPreds) {
      streak = isExact(p) ? streak + 1 : 0;
      if (streak >= 3) {
        shouldHave.add("nostradamus");
        break;
      }
    }
  }

  // ── en_feu : 5 bons résultats consécutifs (points > 0) ──
  {
    let streak = 0;
    for (const p of scoredPreds) {
      streak = (p.pointsAwarded ?? 0) > 0 ? streak + 1 : 0;
      if (streak >= 5) {
        shouldHave.add("en_feu");
        break;
      }
    }
  }

  // ── Regroupement par journée (meme_pas_mal + assidu) ──
  const byDay = new Map<number, typeof allPreds>();
  for (const p of allPreds) {
    const day = p.match.matchday;
    if (day == null) continue;
    const list = byDay.get(day) ?? [];
    list.push(p);
    byDay.set(day, list);
  }

  // ── meme_pas_mal : 0 pt sur une journée complète (≥2 pronos, tous terminés) ──
  for (const dayPreds of byDay.values()) {
    if (
      dayPreds.length >= 2 &&
      dayPreds.every((p) => p.pointsAwarded !== null) &&
      dayPreds.every((p) => p.pointsAwarded === 0)
    ) {
      shouldHave.add("meme_pas_mal");
      break;
    }
  }

  // ── assidu : tous les matchs d'une journée pronostiqués ──
  for (const [day, dayPreds] of byDay.entries()) {
    const total = await prisma.match.count({ where: { matchday: day } });
    if (total >= 2 && dayPreds.length >= total) {
      shouldHave.add("assidu");
      break;
    }
  }

  // ── Réconciliation : attribuer les manquants, retirer les non-mérités ──
  const hasBadge = new Set(existingBadges.map((b) => b.badge.key));

  // Attribution des badges mérités mais pas encore détenus.
  const toAward = [...shouldHave].filter((key) => !hasBadge.has(key));
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

  // Retrait des badges gérés ici qui ne sont plus mérités.
  const toRevoke = existingBadges.filter(
    (b) => MANAGED_KEYS.has(b.badge.key) && !shouldHave.has(b.badge.key)
  );
  for (const b of toRevoke) {
    await prisma.userBadge.delete({
      where: { userId_badgeId: { userId, badgeId: b.badge.id } },
    });
    console.log(`[badges] ❌ "${b.badge.key}" retiré à ${userId}`);
  }
}
