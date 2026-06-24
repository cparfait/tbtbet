
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Trophy, ChevronRight, Users, ArrowUp, ArrowDown, Minus } from "lucide-react";
import Link from "next/link";
import { cn, poolRankLabel } from "@/lib/utils";
import { TeamLogo } from "@/components/team-logo";
import { UserAvatar } from "@/components/user-avatar";

// ── Types ─────────────────────────────────────────────────────────────────────

const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

interface LeaderboardUser {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  wizzBalance: number;
  jokersLeft: number;
  evolution: number | null;
}

interface TeamStanding {
  team: { id: string; name: string; logoUrl: string | null };
  wins: number;
  draws: number;
  losses: number;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  gd: number;
  points: number;
}

interface PoolStandings {
  id: string;
  name: string;
  color: string;
  standings: TeamStanding[];
}

interface FinalSeries {
  teamAWins: number;
  teamBWins: number;
  winnerTeamId: string | null;
  matches: { teamA: { name: string } | null; teamB: { name: string } | null }[];
}

interface Props {
  leaderboard: LeaderboardUser[];
  poolStandings: PoolStandings[];
  finalSeries: FinalSeries | null;
  currentUserId: string;
}

// ── Composant principal ────────────────────────────────────────────────────────

export function LeaderboardClient({ leaderboard, poolStandings, finalSeries, currentUserId }: Props) {
  const [tab, setTab] = useState<"players" | "teams">("players");

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="space-y-5">

      {/* ── Toggle ── */}
      <div className="flex rounded-xl bg-[var(--color-surface-2)] p-1 gap-1">
        <button
          onClick={() => setTab("players")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all duration-200",
            tab === "players"
              ? "bg-[var(--color-accent)]/15 text-[var(--color-accent-bright)] shadow-[0_0_12px_var(--color-accent-glow)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-cream)]"
          )}
        >
          <Trophy className="size-3.5" /> Global
        </button>
        <button
          onClick={() => setTab("teams")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all duration-200",
            tab === "teams"
              ? "bg-[var(--color-accent)]/15 text-[var(--color-accent-bright)] shadow-[0_0_12px_var(--color-accent-glow)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-cream)]"
          )}
        >
          <Users className="size-3.5" /> Équipes
        </button>
      </div>

      {/* ── Tab : Parieurs ── */}
      {tab === "players" && (
        <div className="space-y-2">
          {leaderboard.length === 0 ? (
            <Card className="p-4 text-center text-sm text-[var(--color-muted)]">
              Aucun joueur classé.
            </Card>
          ) : (
            <>
              {/* ── Podium ── */}
              {top3.length > 0 && (
                <div className="flex items-end justify-center gap-3 px-2 pt-4 pb-8">
                  {top3[1] && (
                    <PodiumCard rank={2} name={top3[1].name || "Anonyme"} avatarUrl={top3[1].avatarUrl} points={top3[1].wizzBalance} index={1} />
                  )}
                  {top3[0] && (
                    <PodiumCard
                      rank={1}
                      name={top3[0].name || "Anonyme"}
                      avatarUrl={top3[0].avatarUrl}
                      points={top3[0].wizzBalance}
                      index={0}
                      champion
                    />
                  )}
                  {top3[2] && (
                    <PodiumCard rank={3} name={top3[2].name || "Anonyme"} avatarUrl={top3[2].avatarUrl} points={top3[2].wizzBalance} index={2} />
                  )}
                </div>
              )}

              {/* ── Classement complet ── */}
              <div className="space-y-2">
              {leaderboard.map((user, i) => (
                <Link
                  key={user.id}
                  href={user.id === currentUserId ? "/profile" : `/players/${user.id}`}
                  className="block"
                >
                  <Card
                    className={cn(
                      "flex items-center gap-3 p-3 transition-colors",
                      i === 0 && "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/[0.04]",
                      user.id === currentUserId
                        ? "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5"
                        : "hover:border-[var(--color-accent)]/20"
                    )}
                  >
                     {/* Rang + évolution */}
                     <div className="flex w-9 shrink-0 flex-col items-center">
                       <span className="font-[family-name:var(--font-display)] text-lg font-bold leading-none">
                         {MEDALS[i] ?? i + 1}
                       </span>
                       <Evolution value={user.evolution} />
                     </div>
                    <UserAvatar src={user.avatarUrl} name={user.name} className="size-8 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate", i === 0 && "font-bold")}>
                        {user.name || "Anonyme"}
                        {user.id === currentUserId && (
                          <span className="ml-1.5 text-[10px] text-[var(--color-muted)]">(toi)</span>
                        )}
                      </p>
                    </div>
                    <p className={cn(
                      "shrink-0 text-sm font-bold tabular-nums",
                      i === 0 ? "text-[var(--color-gold-bright)]" : "text-[var(--color-accent)]"
                    )}>
                      {user.wizzBalance} Wizz
                    </p>
                  </Card>
                </Link>
              ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab : Équipes ── */}
      {tab === "teams" && (
        <div className="space-y-4">

          {/* Classements de poules */}
          {poolStandings.length === 0 ? (
            <Card className="p-4 text-center text-sm text-[var(--color-muted)]">
              Aucune poule configurée.
            </Card>
          ) : (
            poolStandings.map((pool) => (
              <div key={pool.id}>
                {/* Header de poule coloré */}
                <div
                  className="mb-1.5 rounded-xl px-3 py-2 flex items-center justify-between"
                  style={{ background: pool.color + "20", borderLeft: `3px solid ${pool.color}` }}
                >
                  <h3 className="text-sm font-bold" style={{ color: pool.color }}>{pool.name}</h3>
                  <Link
                    href={`/leaderboard/${pool.id}`}
                    className="text-[10px] flex items-center gap-0.5 opacity-70 hover:opacity-100 transition-opacity"
                    style={{ color: pool.color }}
                  >
                    Détails <ChevronRight className="size-3" />
                  </Link>
                </div>

                {/* Tableau */}
                {pool.standings.length === 0 ? (
                  <Card className="p-3 text-xs text-[var(--color-muted)] text-center">Pas encore de matchs joués</Card>
                ) : (
                  <Card
                    className="overflow-hidden divide-y divide-[var(--color-border-subtle)]"
                    style={{ borderColor: pool.color, borderWidth: "1.5px" }}
                  >
                    {/* Entête colonnes */}
                    <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                      <span>Équipe</span>
                      <span className="w-6 text-center">J</span>
                      <span className="w-6 text-center">V</span>
                      <span className="w-6 text-center">N</span>
                      <span className="w-6 text-center">D</span>
                      <span className="w-8 text-center font-black">Pts</span>
                    </div>

                    {pool.standings.map(({ team, wins, draws, losses, played, points }, i) => {
                      const anyPlayed = pool.standings.some(s => s.played > 0);
                      const rank = poolRankLabel(i, anyPlayed);
                      return (
                        <div
                          key={team.id}
                          className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center px-3 py-2 border-b border-[var(--color-border-subtle)] last:border-0"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0 text-[10px] text-[var(--color-muted)] w-4">{i + 1}</span>
                            <TeamLogo url={team.logoUrl} name={team.name} poolColor={pool.color} className="size-5 rounded" />
                            <div className="min-w-0">
                              <span className="text-xs font-medium truncate block">{team.name}</span>
                              {rank && <span className={`text-[9px] font-semibold ${rank.color}`}>{rank.label}</span>}
                            </div>
                          </div>
                          <span className="w-6 text-center text-xs text-[var(--color-muted)]">{played}</span>
                          <span className="w-6 text-center text-xs text-green-400">{wins}</span>
                          <span className="w-6 text-center text-xs text-[var(--color-muted)]">{draws}</span>
                          <span className="w-6 text-center text-xs text-red-400">{losses}</span>
                          <span className="w-8 text-center text-xs font-black text-[var(--color-cream)]">{points}</span>
                        </div>
                      );
                    })}
                  </Card>
                )}
              </div>
            ))
          )}

          {/* Bracket */}
          <Link href="/leaderboard/bracket">
            <Card className="flex items-center justify-between p-3 hover:border-[var(--color-accent)]/30 transition-colors">
              <div>
                <p className="text-sm font-semibold">Bracket double élimination</p>
                <p className="text-[10px] text-[var(--color-muted)]">Winners · Losers · Finale BO3</p>
              </div>
              <ChevronRight className="size-4 text-[var(--color-muted)]" />
            </Card>
          </Link>

          {/* Finale BO3 */}
          {finalSeries && (
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-3">Finale</p>
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-sm font-bold">{finalSeries.matches[0]?.teamA?.name ?? "—"}</p>
                  <p className="text-3xl font-bold text-[var(--color-accent)]">{finalSeries.teamAWins}</p>
                </div>
                <div className="px-4 text-center">
                  <p className="text-xs font-bold text-[var(--color-muted)]">Best of 3</p>
                  {finalSeries.winnerTeamId && (
                    <p className="text-xs text-[var(--color-accent)] mt-1">Terminée !</p>
                  )}
                </div>
                <div className="text-center flex-1">
                  <p className="text-sm font-bold">{finalSeries.matches[0]?.teamB?.name ?? "—"}</p>
                  <p className="text-3xl font-bold text-[var(--color-accent)]">{finalSeries.teamBWins}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Flèche d'évolution ─── */
function Evolution({ value }: { value: number | null }) {
  if (value == null) return null;
  if (value > 0) {
    return (
      <span className="inline-flex items-center text-[10px] font-bold leading-none text-[var(--color-pitch-bright)]">
        <ArrowUp className="size-3" />
        {value}
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center text-[10px] font-bold leading-none text-red-400">
        <ArrowDown className="size-3" />
        {Math.abs(value)}
      </span>
    );
  }
  return <Minus className="size-3 text-[var(--color-muted)]/50" />;
}

/* ─── Podium card ─── */
function PodiumCard({
  rank,
  name,
  avatarUrl,
  points,
  index,
  champion = false,
}: {
  rank: number;
  name: string;
  avatarUrl: string | null;
  points: number;
  index: number;
  champion?: boolean;
}) {
  const heights = ["h-40", "h-28", "h-24"] as const;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2",
        champion && "animate-stagger",
        !champion && `stagger-${index + 1}`
      )}
      style={{ animationDelay: champion ? "0ms" : `${(index + 1) * 150}ms` }}
    >
      {champion && (
        <span className="text-2xl drop-shadow-[0_0_8px_var(--color-gold)]">
          {"\u{1F451}"}
        </span>
      )}

      <UserAvatar
        src={avatarUrl}
        name={name}
        className={cn(
          champion
            ? "size-16 ring-2 ring-[var(--color-gold)]/60 shadow-[0_0_20px_var(--color-gold)]/30"
            : "size-12 ring-2 ring-[var(--color-border-subtle)]"
        )}
      />

      <p
        className={cn(
          "font-[family-name:var(--font-display)] font-semibold truncate max-w-[80px]",
          champion ? "text-sm" : "text-xs"
        )}
      >
        {name}
      </p>
      <p
        className={cn(
          "font-[family-name:var(--font-display)] font-bold tabular-nums",
          champion
            ? "text-xl text-[var(--color-gold-bright)]"
            : "text-base text-[var(--color-gold)]"
        )}
      >
        {points} Wizz
      </p>

      <div
        className={cn(
          "w-full rounded-t-lg",
          heights[rank - 1],
          champion
            ? "w-24 bg-gradient-to-t from-[var(--color-gold)]/20 to-[var(--color-gold)]/5 border border-[var(--color-gold)]/20"
            : "w-20 bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]"
        )}
      />
    </div>
  );
}