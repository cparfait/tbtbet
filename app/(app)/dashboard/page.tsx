import { redirect } from "next/navigation";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import {
  getUserById,
  getScheduledMatches,
  getUserChampionBet,
  getUserBets,
  getTournamentChampion,
  getLeaderboard,
} from "@/lib/data/queries";
import { TeamLogo } from "@/components/team-logo";
import { UserAvatar } from "@/components/user-avatar";
import { getOddsForTeam } from "@/lib/odds";
import Link from "next/link";
import { Zap, Star, Target, ChevronRight, Clock } from "lucide-react";
import { InstallBanner } from "@/components/install-banner";

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

  const [user, matches, championBet, bets, champion, leaderboard] = await Promise.all([
    getUserById(session.user.id),
    getScheduledMatches(),
    getUserChampionBet(session.user.id),
    getUserBets(session.user.id),
    getTournamentChampion(),
    getLeaderboard(),
  ]);

  if (!user) redirect("/login");

  const top3 = leaderboard.slice(0, 3);
  const settledBets = bets.filter((b) => b.settled);
  const wonBets = settledBets.filter(
    (b) => b.payout != null && b.payout > b.amountWizz
  );
  const winRate =
    settledBets.length > 0
      ? Math.round((wonBets.length / settledBets.length) * 100)
      : null;

  const nextMatch = matches[0] ?? null;

  const firstName = user.name?.split(" ")[0] ?? "Joueur";

  return (
    <div className="space-y-5 pt-1">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            Salut {firstName}
            <Image
              src="/logo.png"
              alt="TBT Bet"
              width={30}
              height={30}
              className="inline-block drop-shadow-[0_0_6px_var(--color-accent)]/40"
            />
          </span>
        }
        subtitle="Prêt à parier ?"
        action={
          <UserAvatarMenu
            user={{
              name: user.name,
              email: user.email,
              avatarUrl: user.avatarUrl,
              image: user.image,
              role: user.role,
              wizzBalance: user.wizzBalance,
            }}
          />
        }
      />

      <InstallBanner />

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

      {/* Champion du tournoi OU Prochain match */}
      {champion ? (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Champion du tournoi
          </h2>
          <Card className="relative overflow-hidden border-[var(--color-gold)]/50 animate-pulse-gold glow-gold">
            {/* Fond doré */}
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-gold)]/20 via-[var(--color-gold)]/5 to-transparent pointer-events-none" />
            {/* Étoiles décoratives */}
            <span className="absolute top-3 left-4 text-base animate-twinkle-1 text-[var(--color-gold-bright)]">✦</span>
            <span className="absolute top-4 right-6 text-sm animate-twinkle-2 text-[var(--color-gold-bright)]">✦</span>
            <span className="absolute bottom-5 left-8 text-xs animate-twinkle-3 text-[var(--color-gold-bright)]">✦</span>
            <span className="absolute bottom-4 right-4 text-base animate-twinkle-4 text-[var(--color-gold-bright)]">✦</span>

            <div className="relative p-6 text-center">
              {/* Trophée flottant */}
              <div className="text-5xl mb-3 animate-float inline-block drop-shadow-[0_0_16px_rgba(234,179,8,0.6)]">
                🏆
              </div>

              {/* Logo équipe */}
              <div className="flex justify-center mb-3">
                <TeamLogo
                  url={champion.logoUrl}
                  name={champion.name}
                  className="size-20 rounded-2xl ring-2 ring-[var(--color-gold)]/60 shadow-[0_0_24px_rgba(234,179,8,0.3)]"
                />
              </div>

              {/* Nom */}
              <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-gradient-gold">
                {champion.name}
              </p>
              <p className="mt-1 text-[11px] tracking-[0.15em] uppercase text-[var(--color-gold)] opacity-70">
                Champion du tournoi
              </p>
            </div>
          </Card>
        </div>
      ) : (
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
                nextMatch.teamB?.wins ?? 0
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
                        {nextMatch.teamB?.logoUrl ? (
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
                          {nextMatch.teamB?.name ?? "À déterminer"}
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
      )}

      {/* Podium des 3 meilleurs parieurs (fin de tournoi) */}
      {champion && top3.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Podium parieurs
          </h2>
          <div className="flex items-end gap-2">
            {/* 2e place */}
            {top3[1] ? (
              <div className="flex-1 flex flex-col items-center gap-1.5 animate-stagger stagger-2">
                <span className="text-xl">🥈</span>
                <UserAvatar
                  src={top3[1].avatarUrl ?? undefined}
                  name={top3[1].name ?? "?"}
                  className="size-11"
                />
                <p className="text-[11px] font-semibold truncate max-w-[80px] text-center">{top3[1].name ?? "Anonyme"}</p>
                <p className="text-[10px] font-bold text-[var(--color-muted)] tabular-nums">{top3[1].wizzBalance} Wizz</p>
                <div className="w-full h-14 rounded-t-xl bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]" />
              </div>
            ) : <div className="flex-1" />}

            {/* 1re place */}
            {top3[0] && (
              <div className="flex-1 flex flex-col items-center gap-1.5 animate-stagger">
                <span className="text-2xl drop-shadow-[0_0_8px_var(--color-gold)]">🥇</span>
                <UserAvatar
                  src={top3[0].avatarUrl ?? undefined}
                  name={top3[0].name ?? "?"}
                  className="size-14 ring-2 ring-[var(--color-gold)]/50 shadow-[0_0_16px_rgba(234,179,8,0.25)]"
                />
                <p className="text-sm font-bold truncate max-w-[90px] text-center">{top3[0].name ?? "Anonyme"}</p>
                <p className="text-xs font-bold text-[var(--color-gold-bright)] tabular-nums">{top3[0].wizzBalance} Wizz</p>
                <div className="w-full h-20 rounded-t-xl bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30" />
              </div>
            )}

            {/* 3e place */}
            {top3[2] ? (
              <div className="flex-1 flex flex-col items-center gap-1.5 animate-stagger stagger-3">
                <span className="text-xl">🥉</span>
                <UserAvatar
                  src={top3[2].avatarUrl ?? undefined}
                  name={top3[2].name ?? "?"}
                  className="size-11"
                />
                <p className="text-[11px] font-semibold truncate max-w-[80px] text-center">{top3[2].name ?? "Anonyme"}</p>
                <p className="text-[10px] font-bold text-[var(--color-muted)] tabular-nums">{top3[2].wizzBalance} Wizz</p>
                <div className="w-full h-9 rounded-t-xl bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]" />
              </div>
            ) : <div className="flex-1" />}
          </div>
        </div>
      )}

      {/* Ton favori */}
      <Card className={`p-4 ${!championBet ? "animate-pulse-gold border border-[var(--color-accent)]/30" : ""}`}>
        <div className="flex items-center gap-3">
          <Star className={`size-5 text-[var(--color-accent)] shrink-0 ${!championBet ? "animate-float" : ""}`} />
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
