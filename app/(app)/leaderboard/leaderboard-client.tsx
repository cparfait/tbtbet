
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Trophy, ChevronRight, Users, ArrowUp, ArrowDown, Minus } from "lucide-react";
import Link from "next/link";
import { cn, poolRankLabel } from "@/lib/utils";
import { TeamLogo } from "@/components/team-logo";
import { UserAvatar } from "@/components/user-avatar";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BracketTeam {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface BracketMatch {
  id: string;
  phase: string;
  round: number | null;
  status: string;
  result: string | null;
  scoreA: number | null;
  scoreB: number | null;
  teamAId: string;
  teamBId: string | null;
  teamA: BracketTeam;
  teamB: BracketTeam | null;
}

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

interface FinalMatch {
  id: string;
  status: string;
  result: string | null;
  scoreA: number | null;
  scoreB: number | null;
  scheduledAt: string | Date | null;
  teamA: { name: string; logoUrl?: string | null };
  teamB: { name: string; logoUrl?: string | null } | null;
}

interface FinalSeries {
  teamAWins: number;
  teamBWins: number;
  winnerTeamId: string | null;
  matches: FinalMatch[];
}

interface Props {
  leaderboard: LeaderboardUser[];
  poolStandings: PoolStandings[];
  finalSeries: FinalSeries | null;
  currentUserId: string;
  hasBracketPhase?: boolean;
  bracketMatches?: BracketMatch[];
}

// ── Composant principal ────────────────────────────────────────────────────────

export function LeaderboardClient({ leaderboard, poolStandings, finalSeries, currentUserId, hasBracketPhase = false, bracketMatches = [] }: Props) {
  const [tab, setTab] = useState<"players" | "teams">("players");

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="space-y-5">

      {/* ── Bloc Finale (toujours visible si finale active) ── */}
      {finalSeries && <FinaleBlock finalSeries={finalSeries} />}

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
                <div className="flex items-end justify-center gap-4 md:gap-10 px-2 pt-4 pb-8">
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
              <div className="space-y-1.5">
              {leaderboard.map((user, i) => (
                <Link
                  key={user.id}
                  href={user.id === currentUserId ? "/profile" : `/players/${user.id}`}
                  className="block"
                >
                  <Card
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 transition-colors",
                      i === 0 && "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/[0.04]",
                      user.id === currentUserId
                        ? "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5"
                        : "hover:border-[var(--color-accent)]/20"
                    )}
                  >
                    {/* Rang + évolution */}
                    <div className="flex w-10 shrink-0 flex-col items-center gap-0.5">
                      <span className="font-[family-name:var(--font-display)] text-xl font-bold leading-none">
                        {MEDALS[i] ?? <span className="text-base text-[var(--color-muted)]">{i + 1}</span>}
                      </span>
                      <Evolution value={user.evolution} />
                    </div>

                    <UserAvatar src={user.avatarUrl} name={user.name} className="size-9 md:size-10 shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm md:text-base font-medium truncate", i === 0 && "font-bold")}>
                        {user.name || "Anonyme"}
                        {user.id === currentUserId && (
                          <span className="ml-1.5 text-[10px] text-[var(--color-muted)]">(toi)</span>
                        )}
                      </p>
                    </div>

                    <p className={cn(
                      "shrink-0 text-sm md:text-base font-bold tabular-nums",
                      i === 0 ? "text-[var(--color-gold-bright)]" : "text-[var(--color-accent)]"
                    )}>
                      {user.wizzBalance} Wiz
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

          {/* ── Bracket inline si phase bracket active ── */}
          {hasBracketPhase && bracketMatches.length > 0 ? (
            <BracketInline matches={bracketMatches} finalSeries={finalSeries} />
          ) : (
            /* Lien vers le bracket si pas encore commencé */
            <Link href="/leaderboard/bracket">
              <Card className="flex items-center justify-between p-3 hover:border-[var(--color-accent)]/30 transition-colors">
                <div>
                  <p className="text-sm font-semibold">Bracket double élimination</p>
                  <p className="text-[10px] text-[var(--color-muted)]">Winners · Losers · Finale BO3</p>
                </div>
                <ChevronRight className="size-4 text-[var(--color-muted)]" />
              </Card>
            </Link>
          )}

          {/* ── Séparateur entre bracket et poules ── */}
          {hasBracketPhase && poolStandings.length > 0 && (
            <div className="flex items-center gap-3 pt-2">
              <div className="h-px flex-1 bg-[var(--color-border-subtle)]" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
                Phase de poules
              </span>
              <div className="h-px flex-1 bg-[var(--color-border-subtle)]" />
            </div>
          )}

          {/* ── Classements de poules ── */}
          {poolStandings.length === 0 ? (
            <Card className="p-4 text-center text-sm text-[var(--color-muted)]">
              Aucune poule configurée.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {poolStandings.map((pool) => (
              <div key={pool.id}>
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

                {pool.standings.length === 0 ? (
                  <Card className="p-3 text-xs text-[var(--color-muted)] text-center">Pas encore de matchs joués</Card>
                ) : (
                  <Card
                    className="overflow-hidden divide-y divide-[var(--color-border-subtle)]"
                    style={{ borderColor: pool.color, borderWidth: "1.5px" }}
                  >
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
            ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Bloc Finale ─── */

function FinaleBlock({ finalSeries }: { finalSeries: FinalSeries }) {
  const teamAName = finalSeries.matches[0]?.teamA?.name ?? "—";
  const teamBName = finalSeries.matches[0]?.teamB?.name ?? "—";
  const teamALogo = finalSeries.matches[0]?.teamA?.logoUrl ?? null;
  const teamBLogo = finalSeries.matches[0]?.teamB?.logoUrl ?? null;
  const isOver = !!finalSeries.winnerTeamId;

  const statusLabel = (m: FinalMatch) => {
    if (m.status === "FINISHED") return { text: "Terminé", cls: "text-[var(--color-muted)]" };
    if (m.status === "LIVE") return { text: "LIVE", cls: "text-red-400 animate-pulse" };
    return { text: "À venir", cls: "text-orange-400" };
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#eab308" }}>🎯 Finale — Best of 3</span>
        <div className="h-px flex-1" style={{ background: "#eab30840" }} />
        {isOver && <span className="text-[10px] font-semibold text-[var(--color-accent)]">Terminée</span>}
      </div>

      <Card className="overflow-hidden border-[var(--color-accent)]/30" style={{ background: "linear-gradient(135deg, rgba(234,179,8,0.06) 0%, transparent 60%)" }}>
        {/* Score de série */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <TeamLogo url={teamALogo} name={teamAName} className="size-12 rounded-xl" />
            <p className="text-xs font-bold text-center truncate max-w-[80px]">{teamAName}</p>
            <p className="text-4xl font-black text-[var(--color-accent)]">{finalSeries.teamAWins}</p>
          </div>
          <div className="flex flex-col items-center gap-1 px-3 shrink-0">
            <p className="text-[10px] text-[var(--color-muted)] font-semibold uppercase tracking-wider">BO3</p>
            <p className="text-lg font-black text-[var(--color-muted)]">–</p>
          </div>
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <TeamLogo url={teamBLogo} name={teamBName} className="size-12 rounded-xl" />
            <p className="text-xs font-bold text-center truncate max-w-[80px]">{teamBName}</p>
            <p className="text-4xl font-black text-[var(--color-accent)]">{finalSeries.teamBWins}</p>
          </div>
        </div>

        {/* Détail des matchs */}
        {finalSeries.matches.length > 0 && (
          <div className="border-t border-[var(--color-border-subtle)] divide-y divide-[var(--color-border-subtle)]">
            {finalSeries.matches.map((m, idx) => {
              const { text, cls } = statusLabel(m);
              return (
                <Link key={m.id} href={`/matches/${m.id}`}>
                  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--color-surface-2)] transition-colors">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[10px] text-[var(--color-muted)] shrink-0">M{idx + 1}</span>
                      <span className={cn("text-xs font-semibold truncate", m.result === "TEAM_A" ? "text-[var(--color-accent)]" : "")}>
                        {m.teamA.name}
                      </span>
                    </div>
                    <div className="px-3 text-center shrink-0">
                      {m.status === "FINISHED" ? (
                        <span className="text-xs font-bold">{m.scoreA} – {m.scoreB}</span>
                      ) : (
                        <span className={`text-[10px] font-semibold ${cls}`}>{text}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                      <span className={cn("text-xs font-semibold truncate", m.result === "TEAM_B" ? "text-[var(--color-accent)]" : "")}>
                        {m.teamB?.name ?? "?"}
                      </span>
                      <ChevronRight className="size-3 text-[var(--color-muted)] shrink-0" />
                    </div>
                  </div>
                </Link>
              );
            })}
            {/* Match 3 en attente si 1-1 et M2 terminé */}
            {finalSeries.teamAWins === 1 && finalSeries.teamBWins === 1 &&
              finalSeries.matches.every((m) => m.status === "FINISHED") && (
              <div className="flex items-center justify-center px-4 py-2.5 gap-2">
                <span className="text-[10px] text-orange-400 font-semibold">Match 3 — en attente de génération</span>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ─── Bracket inline ─── */

const PHASE_COLOR: Record<string, string> = {
  WINNER_BRACKET: "#22c55e",
  LOSER_BRACKET: "#f97316",
};

function groupByRound(matches: BracketMatch[]) {
  const map = new Map<number, BracketMatch[]>();
  for (const m of matches) {
    const r = m.round ?? 1;
    if (!map.has(r)) map.set(r, []);
    map.get(r)!.push(m);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a - b);
}

function bracketStats(matches: BracketMatch[], teamId: string) {
  let wins = 0, losses = 0;
  for (const m of matches) {
    if (m.status !== "FINISHED") continue;
    if (m.teamAId === teamId) { m.result === "TEAM_A" ? wins++ : losses++; }
    else if (m.teamBId === teamId) { m.result === "TEAM_B" ? wins++ : losses++; }
  }
  return { wins, losses };
}

function WLBadge({ wins, losses }: { wins: number; losses: number }) {
  return (
    <span className="shrink-0 flex items-center gap-0.5 text-[9px] font-semibold">
      <span className={wins > 0 ? "text-green-400" : "text-[var(--color-muted)]"}>{wins}V</span>
      <span className="text-[var(--color-muted)]">·</span>
      <span className={losses > 0 ? "text-orange-400" : "text-[var(--color-muted)]"}>{losses}D</span>
    </span>
  );
}

function BracketMatchCard({ match, allMatches }: { match: BracketMatch; allMatches: BracketMatch[] }) {
  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "LIVE";
  const hasTBD = !match.teamBId;
  const phaseColor = PHASE_COLOR[match.phase] ?? "#eab308";
  const statusText = isFinished ? "Terminé" : isLive ? "LIVE" : "À venir";
  const statusCls = isFinished ? "text-[var(--color-muted)]" : isLive ? "text-red-400" : "text-orange-400";

  const statsA = bracketStats(allMatches, match.teamAId);
  const statsB = match.teamBId ? bracketStats(allMatches, match.teamBId) : null;
  const eliminatedA = statsA.losses >= 2;
  const eliminatedB = statsB ? statsB.losses >= 2 : false;

  return (
    <Link href={`/matches/${match.id}`}>
      <Card className="p-2.5 hover:border-[var(--color-accent)]/30 transition-colors min-w-[160px]">
        <span className={`text-[10px] font-medium ${statusCls}`}>{statusText}</span>
        <div className="mt-1 space-y-1">
          <div className={`flex items-center justify-between gap-2 ${isFinished && match.result === "TEAM_A" ? "text-[var(--color-accent)]" : ""}`}>
            <div className="flex items-center gap-1.5 min-w-0">
              <TeamLogo url={match.teamA?.logoUrl} name={match.teamA?.name ?? "?"} poolColor={phaseColor} className="size-4 rounded" />
              <span className={cn("text-xs font-medium truncate", eliminatedA && "line-through text-red-400")}>
                {match.teamA?.name ?? "?"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <WLBadge {...statsA} />
              {isFinished && <span className="text-xs font-bold">{match.scoreA}</span>}
            </div>
          </div>
          <div className={`flex items-center justify-between gap-2 ${isFinished && match.result === "TEAM_B" ? "text-[var(--color-accent)]" : ""}`}>
            <div className="flex items-center gap-1.5 min-w-0">
              {hasTBD ? (
                <span className="text-[10px] italic text-[var(--color-muted)]">À déterminer…</span>
              ) : (
                <>
                  <TeamLogo url={match.teamB?.logoUrl ?? null} name={match.teamB?.name ?? "?"} poolColor={phaseColor} className="size-4 rounded" />
                  <span className={cn("text-xs font-medium truncate", eliminatedB && "line-through text-red-400")}>
                    {match.teamB?.name}
                  </span>
                </>
              )}
            </div>
            {!hasTBD && match.teamBId && statsB && (
              <div className="flex items-center gap-1.5 shrink-0">
                <WLBadge {...statsB} />
                {isFinished && <span className="text-xs font-bold">{match.scoreB}</span>}
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function BracketSection({ label, color, rounds, allMatches }: {
  label: string;
  color: string;
  rounds: [number, BracketMatch[]][];
  allMatches: BracketMatch[];
}) {
  if (rounds.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold" style={{ color }}>{label}</span>
        <div className="h-px flex-1" style={{ background: `${color}40` }} />
      </div>
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-3 pb-2" style={{ minWidth: `${rounds.length * 172}px` }}>
          {rounds.map(([round, rMatches]) => (
            <div key={round} className="flex-none w-40">
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] mb-2 text-center">
                Tour {round}
              </p>
              <div className="space-y-2">
                {rMatches.map((m) => (
                  <BracketMatchCard key={m.id} match={m} allMatches={allMatches} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BracketInline({ matches, finalSeries }: { matches: BracketMatch[]; finalSeries: FinalSeries | null }) {
  const wb = matches.filter((m) => m.phase === "WINNER_BRACKET");
  const lb = matches.filter((m) => m.phase === "LOSER_BRACKET");
  const wbRounds = groupByRound(wb);
  const lbRounds = groupByRound(lb);

  return (
    <div className="space-y-5">
      {/* Header avec lien détail */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Bracket double élimination</p>
          <p className="text-[10px] text-[var(--color-muted)]">Winners · Losers · Finale BO3</p>
        </div>
        <Link
          href="/leaderboard/bracket"
          className="flex items-center gap-1 text-[10px] text-[var(--color-muted)] hover:text-[var(--color-cream)] transition-colors"
        >
          Détails <ChevronRight className="size-3" />
        </Link>
      </div>

      <BracketSection label="🏆 Winners Bracket" color="#22c55e" rounds={wbRounds} allMatches={matches} />
      <BracketSection label="🔻 Losers Bracket" color="#f97316" rounds={lbRounds} allMatches={matches} />

      {/* Finale BO3 */}
      {finalSeries && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold" style={{ color: "#eab308" }}>🎯 Finale (Best of 3)</span>
            <div className="h-px flex-1" style={{ background: "#eab30840" }} />
          </div>
          <Card className="p-4">
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
        {points} Wiz
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