import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { getMatchById, getUserBetForMatch, getUserById, getPoolStandings, getPoolMatchesByPoolId } from "@/lib/data/queries";
import { getOddsForTeam, getOddsForDraw } from "@/lib/odds";
import { BetForm } from "./bet-form";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { formatMatchLabel, poolRankLabel } from "@/lib/utils";
import { TeamLogo } from "@/components/team-logo";

export const metadata = { title: "Match · TBT Bet" };
export const dynamic = "force-dynamic";

const PHASE_LABEL: Record<string, string> = {
  POOL: "Phase de poules",
  WINNER_BRACKET: "Winner Bracket",
  LOSER_BRACKET: "Loser Bracket",
  FINAL_SERIES: "Finale (BO3)",
};


export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [match, user, existingBet] = await Promise.all([
    getMatchById(id),
    getUserById(session.user.id),
    getUserBetForMatch(session.user.id, id),
  ]);

  if (!match) notFound();

  const poolId = match.phase === "POOL" ? match.teamA.pool?.id : null;
  const [poolData, poolMatches] = poolId
    ? await Promise.all([getPoolStandings(poolId), getPoolMatchesByPoolId(poolId)])
    : [null, []];

  const oddsA = getOddsForTeam(match.phase, match.teamASource, match.teamBSource, match.teamA.wins);
  const oddsB = getOddsForTeam(match.phase, match.teamBSource, match.teamASource, match.teamB?.wins ?? 0);
  const oddsDraw = getOddsForDraw();
  const allowDraw = match.phase === "POOL";

  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "LIVE";
  const closesAt = match.bettingClosesAt ?? match.scheduledAt;
  const isClosed =
    !isFinished &&
    closesAt != null &&
    new Date(closesAt) <= new Date();
  const isOpen = !isFinished && !isClosed;

  const betWon =
    existingBet?.settled &&
    existingBet.payout != null &&
    existingBet.payout > existingBet.amountWizz;
  const betLost =
    existingBet?.settled &&
    existingBet.payout != null &&
    existingBet.payout === 0;

  return (
    <div className="space-y-4">
      {/* Retour */}
      <Link
        href="/matches"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-cream)]"
      >
        <ArrowLeft className="size-4" /> Matchs
      </Link>

      {/* ── Hero du match ── */}
      <Card className="overflow-hidden">
        {/* Bandeau phase + statut */}
        <div className="flex items-center justify-between bg-[var(--color-surface-2)] px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            {formatMatchLabel(match.label) || (PHASE_LABEL[match.phase] ?? match.phase)}
          </span>
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400">
              <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          )}
          {isFinished && (
            <span className="text-[10px] font-semibold text-[var(--color-muted)]">
              Terminé
            </span>
          )}
          {isClosed && !isFinished && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--color-muted)]">
              <Lock className="size-3" /> Paris fermés
            </span>
          )}
        </div>

        {/* Corps : équipes */}
        <div className="px-4 pt-5 pb-6">
          <div className="flex items-center gap-2">
            {/* Équipe A */}
            <div className="flex-1 flex flex-col items-center gap-2 text-center">
              <TeamLogo url={match.teamA.logoUrl} name={match.teamA.name} poolColor={match.teamA.pool?.color} className="size-14 rounded-xl" />
              <div>
                <p
                  className={`font-bold text-base leading-tight ${
                    match.result === "TEAM_A"
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-cream)]"
                  }`}
                >
                  {match.teamA.name}
                </p>
              </div>
            </div>

            {/* Centre VS / Score */}
            <div className="w-20 shrink-0 text-center">
              {isFinished ? (
                <>
                  <p className="text-4xl font-black tabular-nums">
                    {match.scoreA}
                    <span className="text-[var(--color-muted)] mx-1">-</span>
                    {match.scoreB}
                  </p>
                  {match.result === "DRAW" && (
                    <p className="text-[10px] text-[var(--color-muted)] mt-0.5">
                      Nul
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-2xl font-black text-[var(--color-muted)]">
                    VS
                  </p>
                  {match.scheduledAt && (
                    <p className="mt-1 text-[9px] text-[var(--color-muted)] leading-tight">
                      {new Date(match.scheduledAt).toLocaleDateString("fr-FR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                      <br />
                      {new Date(match.scheduledAt).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Équipe B */}
            <div className="flex-1 flex flex-col items-center gap-2 text-center">
              <TeamLogo url={match.teamB?.logoUrl} name={match.teamB?.name ?? "?"} poolColor={match.teamB?.pool?.color} className="size-14 rounded-xl" />
              <div>
                <p
                  className={`font-bold text-base leading-tight ${
                    match.result === "TEAM_B"
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-cream)]"
                  }`}
                >
                  {match.teamB?.name ?? "À déterminer"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Formulaire de pari (match ouvert) ── */}
      {isOpen && (
        <BetForm
          matchId={match.id}
          teamA={match.teamA.name}
          teamALogo={match.teamA.logoUrl ?? null}
          teamB={match.teamB?.name ?? "?"}
          teamBLogo={match.teamB?.logoUrl ?? null}
          oddsA={oddsA}
          oddsB={oddsB}
          oddsDraw={oddsDraw}
          allowDraw={allowDraw}
          userWizz={user?.wizzBalance ?? 0}
          jokersLeft={user?.jokersLeft ?? 0}
          existingBet={
            existingBet
              ? {
                  choice: existingBet.choice,
                  amountWizz: existingBet.amountWizz,
                  jokerUsed: existingBet.jokerUsed,
                }
              : null
          }
        />
      )}

      {/* ── Résultat du pari (match terminé) ── */}
      {isFinished && existingBet && (
        <Card className={`p-4 border-l-4 ${betWon ? "border-l-green-500" : betLost ? "border-l-red-500" : "border-l-[var(--color-border-subtle)]"}`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-3">
            Ton pari
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">
                {existingBet.choice === "TEAM_A"
                  ? match.teamA.name
                  : existingBet.choice === "TEAM_B"
                  ? (match.teamB?.name ?? "?")
                  : "Égalité"}
                {existingBet.jokerUsed && (
                  <span className="ml-2 text-xs text-[var(--color-muted)]">
                    🃏 Joker ×2
                  </span>
                )}
              </p>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                Mise : {existingBet.amountWizz} Wizz
              </p>
            </div>
            {existingBet.settled && existingBet.payout != null && (
              <div className="text-right">
                <p
                  className={`text-xl font-black ${
                    betWon ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {betWon
                    ? `+${existingBet.payout - existingBet.amountWizz}`
                    : `-${existingBet.amountWizz}`}
                </p>
                <p className="text-[10px] text-[var(--color-muted)]">Wizz</p>
              </div>
            )}
          </div>
        </Card>
      )}


      {/* ── Paris des autres joueurs ── */}
      {match.bets.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Paris ({match.bets.length})
          </p>
          <div className="space-y-1">
            {match.bets.map((bet) => (
              <div
                key={bet.id}
                className="flex items-center justify-between rounded-lg bg-[var(--color-surface-2)] px-3 py-2 text-sm"
              >
                <span className="font-medium">{bet.user.name || "Anonyme"}</span>
                <div className="flex items-center gap-2 text-[var(--color-muted)]">
                  <span className="text-xs">{bet.amountWizz} Wizz</span>
                  {bet.jokerUsed && <span className="text-xs">🃏</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Classement de la poule ── */}
      {poolData && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
              style={{ background: poolData.pool.color + "25", color: poolData.pool.color }}>
              {poolData.pool.name}
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Classement</p>
          </div>
          <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: poolData.pool.color }}>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-muted)]">
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Équipe</th>
                  <th className="px-2 py-2 text-center font-medium">J</th>
                  <th className="px-2 py-2 text-center font-medium">G</th>
                  <th className="px-2 py-2 text-center font-medium">N</th>
                  <th className="px-2 py-2 text-center font-medium">P</th>
                  <th className="px-2 py-2 text-center font-medium">Diff</th>
                  <th className="px-3 py-2 text-center font-bold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {poolData.standings.map((row, i) => {
                  const isCurrent = row.team.id === match.teamA.id || row.team.id === (match.teamBId ?? "");
                  const anyPlayed = poolMatches.some(pm => pm.status === "FINISHED");
                  const rank = poolRankLabel(i, anyPlayed);
                  return (
                    <tr
                      key={row.team.id}
                      className={`border-b border-[var(--color-border-subtle)] last:border-0 ${isCurrent ? "bg-white/5" : ""}`}
                    >
                      <td className="px-3 py-2.5 text-[var(--color-muted)]">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <TeamLogo url={row.team.logoUrl} name={row.team.name} poolColor={poolData.pool.color} className="size-5 rounded" />
                          <div>
                            <span className={`font-semibold block leading-tight ${isCurrent ? "text-[var(--color-cream)] underline underline-offset-2 decoration-[var(--color-border-subtle)]" : ""}`}>
                              {row.team.name}
                            </span>
                            {rank && <span className={`text-[9px] font-semibold ${rank.color}`}>{rank.label}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-center text-[var(--color-muted)]">{row.played}</td>
                      <td className="px-2 py-2.5 text-center">{row.wins}</td>
                      <td className="px-2 py-2.5 text-center">{row.draws}</td>
                      <td className="px-2 py-2.5 text-center">{row.losses}</td>
                      <td className="px-2 py-2.5 text-center text-[var(--color-muted)]">
                        {row.gd > 0 ? `+${row.gd}` : row.gd}
                      </td>
                      <td className="px-3 py-2.5 text-center font-black">{row.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── Matchs de la poule ── */}
      {poolMatches.length > 0 && poolData && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Matchs de la poule
          </p>
          <div className="space-y-1.5">
            {poolMatches.map((pm) => {
              const isCurrent = pm.id === match.id;
              return (
                <Link key={pm.id} href={`/matches/${pm.id}`}>
                  <div className={`flex items-center gap-2 rounded-xl border-l-4 px-3 py-2 text-xs transition-colors ${
                    isCurrent ? "bg-[var(--color-accent)]/10" : "bg-[var(--color-surface-2)]"
                  }`} style={{ borderLeftColor: poolData.pool.color }}>
                    {/* Team A */}
                    <div className="flex flex-1 items-center gap-1.5 min-w-0">
                      <TeamLogo url={pm.teamA.logoUrl} name={pm.teamA.name} poolColor={poolData.pool.color} className="size-5 rounded" />
                      <span className={`font-semibold truncate ${pm.result === "TEAM_A" ? "text-green-400" : ""}`}>
                        {pm.teamA.name}
                      </span>
                    </div>
                    {/* Score */}
                    <span className="shrink-0 font-black tabular-nums text-[var(--color-cream)] text-sm">
                      {pm.status === "FINISHED" ? `${pm.scoreA} – ${pm.scoreB}` : "vs"}
                    </span>
                    {/* Team B */}
                    <div className="flex flex-1 items-center gap-1.5 justify-end min-w-0">
                      <span className={`font-semibold truncate text-right ${pm.result === "TEAM_B" ? "text-green-400" : ""}`}>
                        {pm.teamB?.name ?? "?"}
                      </span>
                      <TeamLogo url={pm.teamB?.logoUrl} name={pm.teamB?.name ?? "?"} poolColor={poolData.pool.color} className="size-5 rounded" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
