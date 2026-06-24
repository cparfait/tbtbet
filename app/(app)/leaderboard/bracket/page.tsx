import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getFinalSeries } from "@/lib/data/queries";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TeamLogo } from "@/components/team-logo";

export const metadata = { title: "Bracket · TBT Bet" };
export const dynamic = "force-dynamic";

export default async function BracketPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [wbMatches, lbMatches, finalSeries, allTeams] = await Promise.all([
    prisma.match.findMany({
      where: { phase: "WINNER_BRACKET" },
      include: { teamA: true, teamB: true },
      orderBy: [{ round: "asc" }, { scheduledAt: "asc" }],
    }),
    prisma.match.findMany({
      where: { phase: "LOSER_BRACKET" },
      include: { teamA: true, teamB: true },
      orderBy: [{ round: "asc" }, { scheduledAt: "asc" }],
    }),
    getFinalSeries(),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Grouper par round
  function groupByRound<T extends { round: number | null }>(matches: T[]) {
    const map = new Map<number, T[]>();
    for (const m of matches) {
      const r = m.round ?? 1;
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }

  const wbRounds = groupByRound(wbMatches);
  const lbRounds = groupByRound(lbMatches);

  // V/D uniquement sur les matchs de bracket (pas les poules)
  function bracketStats(teamId: string) {
    let wins = 0, losses = 0;
    for (const m of [...wbMatches, ...lbMatches]) {
      if (m.status !== "FINISHED") continue;
      if (m.teamAId === teamId) {
        m.result === "TEAM_A" ? wins++ : losses++;
      } else if (m.teamBId === teamId) {
        m.result === "TEAM_B" ? wins++ : losses++;
      }
    }
    return { wins, losses };
  }

  const statusLabel = (status: string) => {
    if (status === "FINISHED") return { text: "Terminé", cls: "text-[var(--color-muted)]" };
    if (status === "LIVE") return { text: "LIVE", cls: "text-red-400" };
    return { text: "À venir", cls: "text-orange-400" };
  };

  function WLBadge({ wins, losses }: { wins: number; losses: number }) {
    return (
      <span className="shrink-0 flex items-center gap-0.5 text-[9px] font-semibold">
        <span className={wins > 0 ? "text-green-400" : "text-[var(--color-muted)]"}>{wins}V</span>
        <span className="text-[var(--color-muted)]">·</span>
        <span className={losses > 0 ? "text-orange-400" : "text-[var(--color-muted)]"}>{losses}D</span>
      </span>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function MatchCard({ match }: { match: any }) {
    const { text, cls } = statusLabel(match.status);
    const isFinished = match.status === "FINISHED";
    const hasTBD = !match.teamBId;
    return (
      <Link href={`/matches/${match.id}`}>
        <Card className="p-2.5 hover:border-[var(--color-accent)]/30 transition-colors min-w-[160px]">
          <span className={`text-[10px] font-medium ${cls}`}>{text}</span>
          <div className="mt-1 space-y-1">
            <div className={`flex items-center justify-between gap-2 ${isFinished && match.result === "TEAM_A" ? "text-[var(--color-accent)]" : ""}`}>
              <div className="flex items-center gap-1.5 min-w-0">
                <TeamLogo url={match.teamA?.logoUrl} name={match.teamA?.name ?? "?"} className="size-4 rounded" />
                <span className="text-xs font-medium truncate">{match.teamA?.name ?? "?"}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <WLBadge {...bracketStats(match.teamAId)} />
                {isFinished && <span className="text-xs font-bold">{match.scoreA}</span>}
              </div>
            </div>
            <div className={`flex items-center justify-between gap-2 ${isFinished && match.result === "TEAM_B" ? "text-[var(--color-accent)]" : ""}`}>
              <div className="flex items-center gap-1.5 min-w-0">
                {hasTBD ? (
                  <span className="text-[10px] italic text-[var(--color-muted)]">À déterminer…</span>
                ) : (
                  <>
                    <TeamLogo url={match.teamB?.logoUrl} name={match.teamB?.name ?? "?"} className="size-4 rounded" />
                    <span className="text-xs font-medium truncate">{match.teamB?.name}</span>
                  </>
                )}
              </div>
              {!hasTBD && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <WLBadge {...bracketStats(match.teamBId)} />
                  {isFinished && <span className="text-xs font-bold">{match.scoreB}</span>}
                </div>
              )}
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  const eliminatedTeams = allTeams.filter((t) => t.eliminated);

  return (
    <div className="space-y-6">
      <Link
        href="/leaderboard"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-cream)]"
      >
        <ArrowLeft className="size-4" /> Classement
      </Link>

      <PageHeader title="Bracket" subtitle="Double élimination · WB + LB" />

      {/* Winner Bracket */}
      {wbRounds.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            🏆 Winner Bracket
          </h2>
          <div className="overflow-x-auto">
            <div className="flex gap-4 pb-2" style={{ minWidth: `${wbRounds.length * 180}px` }}>
              {wbRounds.map(([round, rMatches]) => (
                <div key={round} className="flex-none w-44">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] mb-2 text-center">
                    Tour {round}
                  </p>
                  <div className="space-y-2">
                    {rMatches.map((m) => <MatchCard key={m.id} match={m} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loser Bracket */}
      {lbRounds.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            🔻 Loser Bracket
          </h2>
          <div className="overflow-x-auto">
            <div className="flex gap-4 pb-2" style={{ minWidth: `${lbRounds.length * 180}px` }}>
              {lbRounds.map(([round, rMatches]) => (
                <div key={round} className="flex-none w-44">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] mb-2 text-center">
                    LB Tour {round}
                  </p>
                  <div className="space-y-2">
                    {rMatches.map((m) => <MatchCard key={m.id} match={m} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Finale BO3 */}
      {finalSeries && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            🎯 Finale (Best of 3)
          </h2>
          <Card className="p-4">
            {/* Score de série */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-center flex-1">
                <p className="text-sm font-bold">{finalSeries.matches[0]?.teamA?.name ?? "?"}</p>
                <p className="text-4xl font-bold text-[var(--color-accent)]">{finalSeries.teamAWins}</p>
              </div>
              <div className="px-4 text-center">
                <p className="text-xs font-bold text-[var(--color-muted)]">Best of 3</p>
                {finalSeries.winnerTeamId ? (
                  <p className="text-xs text-green-400 mt-1">Champion !</p>
                ) : (
                  <p className="text-xs text-orange-400 mt-1">En cours</p>
                )}
              </div>
              <div className="text-center flex-1">
                <p className="text-sm font-bold">{finalSeries.matches[0]?.teamB?.name ?? "?"}</p>
                <p className="text-4xl font-bold text-[var(--color-accent)]">{finalSeries.teamBWins}</p>
              </div>
            </div>

            {/* Détail des matchs de la finale */}
            <div className="space-y-2">
              {finalSeries.matches.map((m, idx) => {
                const { text, cls } = statusLabel(m.status);
                return (
                  <Link key={m.id} href={`/matches/${m.id}`}>
                    <Card className="p-2.5 hover:border-[var(--color-accent)]/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--color-muted)]">Match {idx + 1}</span>
                        <span className={`text-[10px] font-medium ${cls}`}>{text}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-sm font-medium ${m.result === "TEAM_A" ? "text-[var(--color-accent)]" : ""}`}>
                          {m.teamA.name}
                        </span>
                        {m.status === "FINISHED" ? (
                          <span className="text-sm font-bold">{m.scoreA} - {m.scoreB}</span>
                        ) : (
                          <span className="text-xs text-[var(--color-muted)]">vs</span>
                        )}
                        <span className={`text-sm font-medium ${m.result === "TEAM_B" ? "text-[var(--color-accent)]" : ""}`}>
                          {m.teamB?.name ?? "?"}
                        </span>
                      </div>
                    </Card>
                  </Link>
                );
              })}

              {/* Match 3 en attente si 1-1 */}
              {finalSeries.teamAWins === 1 && finalSeries.teamBWins === 1 &&
                finalSeries.matches.filter((m) => m.status !== "FINISHED").length === 0 && (
                <Card className="p-2.5 border-dashed border-[var(--color-border-subtle)]">
                  <div className="text-center">
                    <span className="text-[10px] text-orange-400">Match 3 — en attente</span>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">
                      Sera généré automatiquement après le match 2
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Équipes éliminées */}
      {eliminatedTeams.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Éliminées
          </h2>
          <div className="flex flex-wrap gap-2">
            {eliminatedTeams.map((t) => (
              <span key={t.id} className="rounded-full bg-red-400/10 px-3 py-1 text-xs text-red-400 line-through">
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {wbMatches.length === 0 && lbMatches.length === 0 && !finalSeries && (
        <Card className="p-6 text-center text-sm text-[var(--color-muted)]">
          Aucun match de bracket pour l&apos;instant. La phase de poules doit se terminer d&apos;abord.
        </Card>
      )}
    </div>
  );
}
