import { PageHeader } from "@/components/page-header";
import { MatchCardInteractive } from "@/components/match-card-interactive";
import { LiveRefresher } from "@/components/live-refresher";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMatches } from "@/lib/data/queries";
import type { Match } from "@/lib/data/matches";
import { jokerPhase, jokerBudget, JOKER_BUDGET } from "@/lib/jokers";
import { dayKey, dayLabel } from "@/lib/utils";

export const metadata = { title: "Matchs · DaronsFC" };
export const dynamic = "force-dynamic";

/** Groupe les matchs par jour, triés chronologiquement. */
function groupByDay(matches: Match[]) {
  const sorted = [...matches].sort(
    (a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt)
  );
  const groups = new Map<string, Match[]>();
  for (const m of sorted) {
    const key = dayKey(m.kickoffAt);
    const list = groups.get(key) ?? [];
    list.push(m);
    groups.set(key, list);
  }
  return [...groups.entries()];
}

export default async function MatchesPage() {
  const [matches, session] = await Promise.all([getMatches(), auth()]);
  const days = groupByDay(matches);
  const totalMatches = matches.length;
  const finishedCount = matches.filter(
    (m) => m.result?.status === "FINISHED"
  ).length;
  const hasLive = matches.some((m) => m.live);

  // Pronostics de l'utilisateur + jokers utilisés par phase (pour l'inline).
  const predByMatch = new Map<
    string,
    { homeScore: number; awayScore: number; joker: boolean }
  >();
  let groupJokers = 0;
  let knockoutJokers = 0;
  if (session?.user?.id) {
    try {
      const preds = await prisma.prediction.findMany({
        where: { userId: session.user.id },
        include: { match: { select: { stage: true } } },
      });
      for (const p of preds) {
        predByMatch.set(p.matchId, {
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          joker: p.joker,
        });
        if (p.joker) {
          if (jokerPhase(p.match.stage) === "group") groupJokers++;
          else knockoutJokers++;
        }
      }
    } catch {}
  }

  /** Jokers restants pour la phase d'un match (hors prono de ce match). */
  function jokersLeftFor(m: Match): number {
    const phase = jokerPhase(m.stage);
    const used = phase === "group" ? groupJokers : knockoutJokers;
    const thisJoker = predByMatch.get(m.id)?.joker ? 1 : 0;
    return Math.max(0, JOKER_BUDGET[phase] - (used - thisJoker));
  }

  return (
    <>
      {hasLive && <LiveRefresher seconds={30} />}

      {/* ── Header ── */}
      <PageHeader title="Matchs" subtitle="Coupe du Monde 2026" />

      {/* ── Stats bar ── */}
      <div className="mb-6 flex items-center gap-3">
        <div className="glass flex items-center gap-2 rounded-full px-3.5 py-1.5">
          <span className="text-xs font-[family-name:var(--font-mono)] text-[var(--color-muted)]">
            {totalMatches}
          </span>
          <span className="text-xs text-[var(--color-muted)]">matchs</span>
        </div>
        <div className="glass flex items-center gap-2 rounded-full px-3.5 py-1.5">
          <span className="size-2 rounded-full bg-[var(--color-pitch-bright)]" />
          <span className="text-xs font-[family-name:var(--font-mono)] text-[var(--color-pitch-bright)]">
            {finishedCount}
          </span>
          <span className="text-xs text-[var(--color-muted)]">terminés</span>
        </div>
        <div className="glass flex items-center gap-2 rounded-full px-3.5 py-1.5">
          <span className="size-2 rounded-full bg-[var(--color-gold)]" />
          <span className="text-xs font-[family-name:var(--font-mono)] text-[var(--color-gold)]">
            {totalMatches - finishedCount}
          </span>
          <span className="text-xs text-[var(--color-muted)]">à jouer</span>
        </div>
      </div>

      {/* ── Empty state ── */}
      {totalMatches === 0 && (
        <Card className="glass p-8 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            Aucun match pour l&apos;instant. Lance la synchronisation
            API-Football depuis la console admin. ⚽
          </p>
        </Card>
      )}

      {/* ── Match groups by day ── */}
      <div className="flex flex-col gap-8">
        {days.map(([key, matches], dayIdx) => (
          <section key={key} className="animate-stagger stagger-2">
            {/* Sticky day header */}
            <div className="sticky top-0 z-20 -mx-4 mb-4 px-4 py-2.5 backdrop-blur-xl bg-[var(--color-bg)]/80">
              <div className="flex items-center gap-3">
                {/* Green accent bar */}
                <div className="h-5 w-1 rounded-full bg-[var(--color-pitch)]" />
                <h2 className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-widest text-[var(--color-cream)]">
                  {dayLabel(matches[0]!.kickoffAt)}
                </h2>
                <span className="font-[family-name:var(--font-mono)] text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                  {matches.length} match{matches.length > 1 ? "s" : ""}
                </span>
                {/* Decorative line */}
                <div className="h-px flex-1 bg-gradient-to-r from-[var(--color-border-subtle)] to-transparent" />
              </div>
            </div>

            {/* Match cards */}
            <div className="flex flex-col gap-3">
              {matches.map((m, i) => (
                <div
                  key={m.id}
                  className="animate-stagger"
                  style={{ animationDelay: `${0.05 * i + 0.1 * dayIdx}s` }}
                >
                  <MatchCardInteractive
                    match={m}
                    prediction={predByMatch.get(m.id)}
                    jokersLeft={jokersLeftFor(m)}
                    jokerBudget={jokerBudget(m.stage)}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
