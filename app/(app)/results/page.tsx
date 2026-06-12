import { PageHeader } from "@/components/page-header";
import { MatchCardInteractive } from "@/components/match-card-interactive";
import { LiveRefresher } from "@/components/live-refresher";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMatches } from "@/lib/data/queries";
import type { Match } from "@/lib/data/matches";
import { jokerBudget } from "@/lib/jokers";
import { dayKey, dayLabel } from "@/lib/utils";

export const metadata = { title: "Résultats · DaronsFC" };
export const dynamic = "force-dynamic";

/** Groupe les matchs par jour, du plus récent au plus ancien. */
function groupByDayDesc(matches: Match[]) {
  const sorted = [...matches].sort(
    (a, b) => +new Date(b.kickoffAt) - +new Date(a.kickoffAt)
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

export default async function ResultsPage() {
  const [allMatches, session] = await Promise.all([getMatches(), auth()]);
  const now = Date.now();
  // Matchs commencés : en cours (live) ou terminés.
  const matches = allMatches.filter(
    (m) => m.live || m.result || new Date(m.kickoffAt).getTime() <= now
  );
  const days = groupByDayDesc(matches);
  const hasLive = matches.some((m) => m.live);

  const predByMatch = new Map<
    string,
    { homeScore: number; awayScore: number; joker: boolean }
  >();
  if (session?.user?.id) {
    try {
      const preds = await prisma.prediction.findMany({
        where: { userId: session.user.id },
        select: { matchId: true, homeScore: true, awayScore: true, joker: true },
      });
      for (const p of preds) {
        predByMatch.set(p.matchId, {
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          joker: p.joker,
        });
      }
    } catch {}
  }

  return (
    <>
      {hasLive && <LiveRefresher seconds={30} />}

      <PageHeader title="Résultats" subtitle="Matchs en cours & terminés" />

      {matches.length === 0 && (
        <Card className="glass p-8 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            Aucun match joué pour l&apos;instant. Les résultats arrivent dès le
            coup d&apos;envoi. ⚽
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-8">
        {days.map(([key, dayMatches]) => (
          <section key={key}>
            <div className="sticky top-0 z-20 -mx-4 mb-4 px-4 py-2.5 backdrop-blur-xl bg-[var(--color-bg)]/80">
              <div className="flex items-center gap-3">
                <div className="h-5 w-1 rounded-full bg-[var(--color-pitch)]" />
                <h2 className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-widest text-[var(--color-cream)]">
                  {dayLabel(dayMatches[0]!.kickoffAt)}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-[var(--color-border-subtle)] to-transparent" />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {dayMatches.map((m) => (
                <MatchCardInteractive
                  key={m.id}
                  match={m}
                  prediction={predByMatch.get(m.id)}
                  jokersLeft={0}
                  jokerBudget={jokerBudget(m.stage)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
