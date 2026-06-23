import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import {
  getUserById,
  getScheduledMatches,
  getUserChampionBet,
  getUserBets,
} from "@/lib/data/queries";
import { getOddsForTeam } from "@/lib/odds";
import Link from "next/link";
import { Zap, Star, Target, ChevronRight, Clock } from "lucide-react";

export const metadata = { title: "Accueil · TBT Bet" };
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

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, matches, championBet, bets] = await Promise.all([
    getUserById(session.user.id),
    getScheduledMatches(),
    getUserChampionBet(session.user.id),
    getUserBets(session.user.id),
  ]);

  if (!user) redirect("/login");

  const settledBets = bets.filter((b) => b.settled);
  const wonBets = settledBets.filter(
    (b) => b.payout != null && b.payout > b.amountWizz
  );
  const winRate =
    settledBets.length > 0
      ? Math.round((wonBets.length / settledBets.length) * 100)
      : null;

  const nextMatch = matches[0] ?? null;

  return (
    <div className="space-y-5 pt-1">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <Zap className="size-4 mx-auto mb-1 text-[var(--color-accent)]" />
          <p className="text-xl font-bold text-[var(--color-accent)]">
            {user.wizzBalance}
          </p>
          <p className="text-[10px] text-[var(--color-muted)]">Wizz</p>
        </Card>
        <Card className="p-3 text-center">
          <Target className="size-4 mx-auto mb-1" />
          <p className="text-xl font-bold">
            {winRate !== null ? `${winRate}%` : "—"}
          </p>
          <p className="text-[10px] text-[var(--color-muted)]">
            {wonBets.length}/{settledBets.length} pronos
          </p>
        </Card>
        <Card className="p-3 text-center">
          <span className="block text-lg mb-1">🃏</span>
          <p className="text-xl font-bold">{user.jokersLeft}</p>
          <p className="text-[10px] text-[var(--color-muted)]">Jokers</p>
        </Card>
      </div>

      {/* Prochain match */}
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Prochain match
        </h2>
        {nextMatch ? (
          (() => {
            const oddsA = getOddsForTeam(
              nextMatch.phase,
              nextMatch.teamASource,
              nextMatch.teamBSource,
              nextMatch.teamA.wins
            );
            const oddsB = getOddsForTeam(
              nextMatch.phase,
              nextMatch.teamBSource,
              nextMatch.teamASource,
              nextMatch.teamB.wins
            );
            return (
              <Link href={`/matches/${nextMatch.id}`}>
                <Card className="p-4 hover:border-[var(--color-accent)]/40 transition-colors">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] mb-3">
                    {nextMatch.label}&nbsp;·&nbsp;
                    {PHASE_LABEL[nextMatch.phase] ?? nextMatch.phase}
                  </p>
                  <div className="flex items-center gap-2">
                    {/* Équipe A */}
                    <div className="flex-1 text-center">
                      {nextMatch.teamA.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={nextMatch.teamA.logoUrl}
                          alt={nextMatch.teamA.name}
                          className="size-10 object-contain mx-auto mb-1.5 rounded"
                        />
                      ) : (
                        <div className="size-10 rounded-lg bg-[var(--color-surface-2)] mx-auto mb-1.5" />
                      )}
                      <p className="text-sm font-bold truncate">
                        {nextMatch.teamA.name}
                      </p>
                      <p className="text-[10px] text-[var(--color-muted)]">
                        {SOURCE_LABEL[nextMatch.teamASource]}
                      </p>
                      <p className="text-xs font-semibold text-[var(--color-accent)] mt-0.5">
                        x{oddsA}
                      </p>
                    </div>

                    {/* VS + date */}
                    <div className="text-center shrink-0 w-16">
                      <p className="text-sm font-bold text-[var(--color-muted)]">
                        VS
                      </p>
                      {nextMatch.scheduledAt && (
                        <p className="text-[9px] text-[var(--color-muted)] mt-1 leading-tight">
                          {new Date(nextMatch.scheduledAt).toLocaleDateString(
                            "fr-FR",
                            {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      )}
                    </div>

                    {/* Équipe B */}
                    <div className="flex-1 text-center">
                      {nextMatch.teamB.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={nextMatch.teamB.logoUrl}
                          alt={nextMatch.teamB.name}
                          className="size-10 object-contain mx-auto mb-1.5 rounded"
                        />
                      ) : (
                        <div className="size-10 rounded-lg bg-[var(--color-surface-2)] mx-auto mb-1.5" />
                      )}
                      <p className="text-sm font-bold truncate">
                        {nextMatch.teamB.name}
                      </p>
                      <p className="text-[10px] text-[var(--color-muted)]">
                        {SOURCE_LABEL[nextMatch.teamBSource]}
                      </p>
                      <p className="text-xs font-semibold text-[var(--color-accent)] mt-0.5">
                        x{oddsB}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-1 rounded-lg bg-[var(--color-accent)]/10 py-2 text-sm font-medium text-[var(--color-accent)]">
                    Parier sur ce match
                    <ChevronRight className="size-4" />
                  </div>
                </Card>
              </Link>
            );
          })()
        ) : (
          <Card className="p-6 text-center">
            <Clock className="size-8 mx-auto mb-2 text-[var(--color-muted)]" />
            <p className="text-sm text-[var(--color-muted)]">
              Aucun match à venir.
            </p>
          </Card>
        )}
      </div>

      {/* Ton favori */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Star className="size-5 text-[var(--color-accent)] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Ton favori</p>
            <p className="text-xs text-[var(--color-muted)] truncate">
              {championBet
                ? `Tu as misé sur ${championBet.team.name}`
                : "Quelle équipe va tout écraser ?"}
            </p>
          </div>
          <Link
            href="/champions"
            className="shrink-0 rounded-lg bg-[var(--color-accent)]/10 px-3 py-1.5 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors"
          >
            {championBet ? "Modifier" : "Parier"}
          </Link>
        </div>
      </Card>

      {/* Lien tous les matchs */}
      {matches.length > 1 && (
        <Link
          href="/matches"
          className="flex items-center justify-between rounded-xl border border-[var(--color-border-subtle)] px-4 py-3 text-sm text-[var(--color-muted)] hover:border-[var(--color-accent)]/30 hover:text-[var(--color-cream)] transition-colors"
        >
          <span>
            {matches.length - 1} autre{matches.length > 2 ? "s" : ""} match
            {matches.length > 2 ? "s" : ""} à venir
          </span>
          <ChevronRight className="size-4 shrink-0" />
        </Link>
      )}
    </div>
  );
}
