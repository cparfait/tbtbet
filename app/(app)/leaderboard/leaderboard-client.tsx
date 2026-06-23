"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Trophy, ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeaderboardUser {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  wizzBalance: number;
  jokersLeft: number;
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

const RANK_EMOJI = ["🥇", "🥈", "🥉"];

export function LeaderboardClient({ leaderboard, poolStandings, finalSeries, currentUserId }: Props) {
  const [tab, setTab] = useState<"players" | "teams">("players");

  return (
    <div className="space-y-5">

      {/* ── Toggle ── */}
      <div className="flex rounded-xl bg-[var(--color-surface-2)] p-1 gap-1">
        <button
          onClick={() => setTab("players")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors",
            tab === "players"
              ? "bg-[var(--color-surface-1)] text-[var(--color-cream)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-cream)]"
          )}
        >
          <Trophy className="size-3.5" /> Parieurs
        </button>
        <button
          onClick={() => setTab("teams")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors",
            tab === "teams"
              ? "bg-[var(--color-surface-1)] text-[var(--color-cream)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-cream)]"
          )}
        >
          <Users className="size-3.5" /> Équipes
        </button>
      </div>

      {/* ── Tab : Parieurs ── */}
      {tab === "players" && (
        <div className="space-y-1">
          {leaderboard.length === 0 ? (
            <Card className="p-4 text-center text-sm text-[var(--color-muted)]">
              Aucun joueur classé.
            </Card>
          ) : (
            leaderboard.map((user, i) => (
              <Card
                key={user.id}
                className={cn(
                  "flex items-center gap-3 p-3",
                  user.id === currentUserId && "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5"
                )}
              >
                <span className="w-6 shrink-0 text-center text-sm font-bold">
                  {RANK_EMOJI[i] ?? `#${i + 1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.name || "Anonyme"}
                    {user.id === currentUserId && (
                      <span className="ml-1.5 text-[10px] text-[var(--color-muted)]">(toi)</span>
                    )}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-[var(--color-accent)]">
                  {user.wizzBalance} Wizz
                </p>
              </Card>
            ))
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
                  <Card className="overflow-hidden divide-y divide-[var(--color-border-subtle)]">
                    {/* Entête colonnes */}
                    <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                      <span>Équipe</span>
                      <span className="w-6 text-center">J</span>
                      <span className="w-6 text-center">V</span>
                      <span className="w-6 text-center">N</span>
                      <span className="w-6 text-center">D</span>
                      <span className="w-8 text-center font-black">Pts</span>
                    </div>

                    {pool.standings.map(({ team, wins, draws, losses, played, points }, i) => (
                      <div
                        key={team.id}
                        className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="shrink-0 text-[10px] text-[var(--color-muted)] w-4">{i + 1}</span>
                          {team.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={team.logoUrl} alt={team.name} className="size-5 rounded object-contain shrink-0" />
                          ) : (
                            <div className="size-5 rounded bg-[var(--color-surface-2)] shrink-0" />
                          )}
                          <span className="text-xs font-medium truncate">{team.name}</span>
                        </div>
                        <span className="w-6 text-center text-xs text-[var(--color-muted)]">{played}</span>
                        <span className="w-6 text-center text-xs text-green-400">{wins}</span>
                        <span className="w-6 text-center text-xs text-[var(--color-muted)]">{draws}</span>
                        <span className="w-6 text-center text-xs text-red-400">{losses}</span>
                        <span className="w-8 text-center text-xs font-black text-[var(--color-cream)]">{points}</span>
                      </div>
                    ))}
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
                <p className="text-[10px] text-[var(--color-muted)]">WB · LB · Finale BO3</p>
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
