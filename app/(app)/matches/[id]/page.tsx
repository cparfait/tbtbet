import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { getMatchById, getUserBetForMatch, getUserById } from "@/lib/data/queries";
import { getOddsForTeam, getOddsForDraw } from "@/lib/odds";
import { BetForm } from "./bet-form";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

export const metadata = { title: "Match · TBT Bet" };
export const dynamic = "force-dynamic";

const PHASE_LABEL: Record<string, string> = {
  POOL: "Phase de poules",
  WINNER_BRACKET: "Winner Bracket",
  LOSER_BRACKET: "Loser Bracket",
  FINAL_SERIES: "Finale (BO3)",
};

const SOURCE_LABEL: Record<string, string> = {
  POOL: "Poule",
  WINNER_BRACKET: "Winner",
  LOSER_BRACKET: "Loser",
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

  const oddsA = getOddsForTeam(match.phase, match.teamASource, match.teamBSource, match.teamA.wins);
  const oddsB = getOddsForTeam(match.phase, match.teamBSource, match.teamASource, match.teamB.wins);
  const oddsDraw = getOddsForDraw();
  const allowDraw = match.phase === "POOL";

  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "LIVE";
  const isClosed =
    !isFinished &&
    match.bettingClosesAt != null &&
    new Date(match.bettingClosesAt) <= new Date();
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
            {PHASE_LABEL[match.phase] ?? match.phase}
            {match.label ? ` · ${match.label}` : ""}
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
              {match.teamA.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={match.teamA.logoUrl}
                  alt={match.teamA.name}
                  className="size-14 rounded-xl object-contain"
                />
              ) : (
                <div className="size-14 rounded-xl bg-[var(--color-surface-2)]" />
              )}
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
                <p className="text-[10px] text-[var(--color-muted)] mt-0.5">
                  {SOURCE_LABEL[match.teamASource]}
                </p>
                {!isFinished && (
                  <p className="mt-1 text-sm font-bold text-[var(--color-accent)]">
                    ×{oddsA}
                  </p>
                )}
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
              {match.teamB.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={match.teamB.logoUrl}
                  alt={match.teamB.name}
                  className="size-14 rounded-xl object-contain"
                />
              ) : (
                <div className="size-14 rounded-xl bg-[var(--color-surface-2)]" />
              )}
              <div>
                <p
                  className={`font-bold text-base leading-tight ${
                    match.result === "TEAM_B"
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-cream)]"
                  }`}
                >
                  {match.teamB.name}
                </p>
                <p className="text-[10px] text-[var(--color-muted)] mt-0.5">
                  {SOURCE_LABEL[match.teamBSource]}
                </p>
                {!isFinished && (
                  <p className="mt-1 text-sm font-bold text-[var(--color-accent)]">
                    ×{oddsB}
                  </p>
                )}
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
          teamB={match.teamB.name}
          teamBLogo={match.teamB.logoUrl ?? null}
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
                  ? match.teamB.name
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
    </div>
  );
}
