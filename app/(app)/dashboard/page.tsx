import { redirect } from "next/navigation";
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
  getAllTeams,
} from "@/lib/data/queries";
import { ChampionPickModal } from "@/components/champion-pick-modal";
import { TeamLogo } from "@/components/team-logo";
import { UserAvatar } from "@/components/user-avatar";
import { getOddsForTeam, DEFAULT_ELO } from "@/lib/odds";
import Link from "next/link";
import { Zap, Star, Target, ChevronRight, Clock, TrendingUp } from "lucide-react";
import { InstallBanner } from "@/components/install-banner";

export const metadata = { title: "Accueil · TBT Bet" };
export const dynamic = "force-dynamic";

const PHASE_LABEL: Record<string, string> = {
  POOL: "Phase de poules",
  WINNER_BRACKET: "Winner Bracket",
  LOSER_BRACKET: "Loser Bracket",
  FINAL_SERIES: "Finale (BO3)",
};

function frenchOrdinal(n: number): string {
  return n === 1 ? "1er" : `${n}e`;
}

function teamPlayers(team: { player1?: string | null; player2?: string | null }): string | null {
  if (team.player1 && team.player2) return `${team.player1} & ${team.player2}`;
  if (team.player1) return team.player1;
  return null;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, matches, championBet, bets, champion, leaderboard, teams] = await Promise.all([
    getUserById(session.user.id),
    getScheduledMatches(),
    getUserChampionBet(session.user.id),
    getUserBets(session.user.id),
    getTournamentChampion(),
    getLeaderboard(),
    getAllTeams(),
  ]);

  if (!user) redirect("/api/auth/force-signout");

  const top3 = leaderboard.slice(0, 3);
  const settledBets = bets.filter((b) => b.settled);
  const wonBets = settledBets.filter(
    (b) => b.payout != null && b.payout > b.amountWizz
  );
  const winRate =
    settledBets.length > 0
      ? Math.round((wonBets.length / settledBets.length) * 100)
      : null;

  const userRankIdx = leaderboard.findIndex((u) => u.id === user.id);
  const userRank = userRankIdx >= 0 ? userRankIdx + 1 : null;
  const totalPlayers = leaderboard.length;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const datedMatches = matches.filter((m) => !!m.scheduledAt);
  const undatedMatches = matches.filter((m) => !m.scheduledAt);

  const todayMatches = datedMatches.filter((m) => {
    const d = new Date(m.scheduledAt!);
    return d >= todayStart && d <= todayEnd;
  });

  const futureMatches = datedMatches.filter((m) => new Date(m.scheduledAt!) > todayEnd);

  // Si aucun match aujourd'hui, on affiche le prochain jour non grisé
  const upcomingDatedMatches = (() => {
    if (todayMatches.length > 0 || futureMatches.length === 0) return [];
    const firstDate = new Date(futureMatches[0]!.scheduledAt!);
    const dayStart = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());
    const dayEnd = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate(), 23, 59, 59);
    return futureMatches.filter((m) => {
      const d = new Date(m.scheduledAt!);
      return d >= dayStart && d <= dayEnd;
    });
  })();

  // Matchs mis en avant (non grisés)
  const hasPrimary = todayMatches.length > 0 || upcomingDatedMatches.length > 0;
  const upcomingMatches = hasPrimary
    ? (todayMatches.length > 0 ? todayMatches : upcomingDatedMatches)
    : undatedMatches.slice(0, 1); // premier match sans date si rien d'autre

  // Matchs grisés
  const grayedMatches = [
    ...(todayMatches.length > 0 ? futureMatches : futureMatches.slice(upcomingDatedMatches.length)),
    ...(hasPrimary ? undatedMatches : undatedMatches.slice(1)),
  ];

  const firstName = user.name?.split(" ")[0] ?? "Joueur";

  return (
    <div className="space-y-5 pt-1">
      <PageHeader
        title={`Salut ${firstName}`}
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

      {!champion && !championBet && <ChampionPickModal teams={teams} />}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <Zap className="size-4 mx-auto mb-1 text-[var(--color-accent)]" />
          <p className="text-xl font-bold text-[var(--color-accent)]">
            {user.wizzBalance}
          </p>
          <p className="text-[10px] text-[var(--color-muted)]">Wiz</p>
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
          <TrendingUp className="size-4 mx-auto mb-1 text-[var(--color-accent)]" />
          <p className="text-xl font-bold text-[var(--color-accent)]">
            {userRank ? frenchOrdinal(userRank) : "—"}
          </p>
          <p className="text-[10px] text-[var(--color-muted)]">/{totalPlayers}</p>
        </Card>
      </div>

      {/* Favori */}
      {!champion && championBet && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] px-4 py-3">
          <Star className="size-4 text-[var(--color-accent)] shrink-0" />
          <p className="text-sm text-[var(--color-muted)]">
            Tes favoris sont{" "}
            <span className="font-semibold text-[var(--color-cream)]">
              {championBet.team.name}
            </span>
          </p>
        </div>
      )}

      {/* Champion du tournoi OU Matchs du jour / Prochain match */}
      {champion ? (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Champion du tournoi
          </h2>
          <Card className="relative overflow-hidden border-[var(--color-gold)]/50 animate-pulse-gold glow-gold">
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-gold)]/20 via-[var(--color-gold)]/5 to-transparent pointer-events-none" />
            <span className="absolute top-3 left-4 text-base animate-twinkle-1 text-[var(--color-gold-bright)]">✦</span>
            <span className="absolute top-4 right-6 text-sm animate-twinkle-2 text-[var(--color-gold-bright)]">✦</span>
            <span className="absolute bottom-5 left-8 text-xs animate-twinkle-3 text-[var(--color-gold-bright)]">✦</span>
            <span className="absolute bottom-4 right-4 text-base animate-twinkle-4 text-[var(--color-gold-bright)]">✦</span>
            <div className="relative p-6 text-center">
              <div className="text-5xl mb-3 animate-float inline-block drop-shadow-[0_0_16px_rgba(234,179,8,0.6)]">
                🏆
              </div>
              <div className="flex justify-center mb-3">
                <TeamLogo
                  url={champion.logoUrl}
                  name={champion.name}
                  className="size-20 rounded-2xl ring-2 ring-[var(--color-gold)]/60 shadow-[0_0_24px_rgba(234,179,8,0.3)]"
                />
              </div>
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
        <>
          {/* Matchs du jour */}
          {upcomingMatches.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                {todayMatches.length > 0
                  ? `Matchs du jour (${todayMatches.length})`
                  : upcomingMatches.length > 1
                    ? `Prochains matchs (${upcomingMatches.length})`
                    : "Prochain match"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {upcomingMatches.map((match) => {
                  const oddsA = getOddsForTeam(match.teamA.elo, match.teamB?.elo ?? DEFAULT_ELO);
                  const oddsB = getOddsForTeam(match.teamB?.elo ?? DEFAULT_ELO, match.teamA.elo);
                  const playersA = teamPlayers(match.teamA);
                  const playersB = match.teamB ? teamPlayers(match.teamB) : null;
                  const isLiveMatch = match.status === "LIVE";
                  return (
                    <Link key={match.id} href={`/matches/${match.id}`} className="block">
                      <Card className="p-4 hover:border-[var(--color-accent)]/40 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                            {match.label}&nbsp;·&nbsp;
                            {PHASE_LABEL[match.phase] ?? match.phase}
                          </p>
                          {isLiveMatch && (
                            <span className="flex items-center gap-1 text-[9px] font-semibold text-red-400">
                              <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 text-center">
                            <TeamLogo url={match.teamA.logoUrl} name={match.teamA.name} className="size-10 mx-auto mb-1.5 rounded-lg" />
                            <p className="text-sm font-bold truncate">{match.teamA.name}</p>
                            {playersA && <p className="text-[10px] text-[var(--color-muted)] truncate px-1">{playersA}</p>}
                            <p className="text-xs font-semibold text-[var(--color-accent)] mt-0.5">x{oddsA}</p>
                          </div>
                          <div className="text-center shrink-0 w-16">
                            <p className="text-sm font-bold text-[var(--color-muted)]">VS</p>
                            {match.scheduledAt && (
                              <p className="text-[9px] text-[var(--color-muted)] mt-1 leading-tight">
                                {new Date(match.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            )}
                          </div>
                          <div className="flex-1 text-center">
                            <TeamLogo url={match.teamB?.logoUrl ?? null} name={match.teamB?.name ?? "?"} className="size-10 mx-auto mb-1.5 rounded-lg" />
                            <p className="text-sm font-bold truncate">{match.teamB?.name ?? "À déterminer"}</p>
                            {playersB && <p className="text-[10px] text-[var(--color-muted)] truncate px-1">{playersB}</p>}
                            <p className="text-xs font-semibold text-[var(--color-accent)] mt-0.5">x{oddsB}</p>
                          </div>
                        </div>
                        {isLiveMatch ? (
                          <div className="mt-4 flex items-center justify-center gap-1 rounded-lg bg-red-500/10 py-2 text-sm font-medium text-red-400">
                            <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                            Match en cours
                          </div>
                        ) : (
                          <div className="mt-4 flex items-center justify-center gap-1 rounded-lg bg-[var(--color-accent)]/10 py-2 text-sm font-medium text-[var(--color-accent)]">
                            Parier sur ce match
                            <ChevronRight className="size-4" />
                          </div>
                        )}
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Aucun match */}
          {upcomingMatches.length === 0 && grayedMatches.length === 0 && (
            <Card className="p-6 text-center">
              <Clock className="size-8 mx-auto mb-2 text-[var(--color-muted)]" />
              <p className="text-sm text-[var(--color-muted)]">Aucun match à venir.</p>
            </Card>
          )}

          {/* Prochains matchs — grisés */}
          {grayedMatches.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Prochains matchs ({grayedMatches.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 opacity-40 pointer-events-none select-none">
                {grayedMatches.map((match) => {
                  const oddsA = getOddsForTeam(match.teamA.elo, match.teamB?.elo ?? DEFAULT_ELO);
                  const oddsB = getOddsForTeam(match.teamB?.elo ?? DEFAULT_ELO, match.teamA.elo);
                  const playersA = teamPlayers(match.teamA);
                  const playersB = match.teamB ? teamPlayers(match.teamB) : null;
                  return (
                    <Card key={match.id} className="p-4">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] mb-3">
                        {match.label}&nbsp;·&nbsp;
                        {PHASE_LABEL[match.phase] ?? match.phase}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 text-center">
                          <TeamLogo url={match.teamA.logoUrl} name={match.teamA.name} className="size-10 mx-auto mb-1.5 rounded-lg" />
                          <p className="text-sm font-bold truncate">{match.teamA.name}</p>
                          {playersA && <p className="text-[10px] text-[var(--color-muted)] truncate px-1">{playersA}</p>}
                          <p className="text-xs font-semibold text-[var(--color-accent)] mt-0.5">x{oddsA}</p>
                        </div>
                        <div className="text-center shrink-0 w-16">
                          <p className="text-sm font-bold text-[var(--color-muted)]">VS</p>
                          {match.scheduledAt ? (
                            <p className="text-[9px] text-[var(--color-muted)] mt-1 leading-tight">
                              {new Date(match.scheduledAt).toLocaleDateString("fr-FR", {
                                weekday: "short", day: "numeric", month: "short",
                              })}
                              <br />
                              {new Date(match.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          ) : (
                            <p className="text-[9px] text-[var(--color-muted)] mt-1 leading-tight">Date à<br />confirmer</p>
                          )}
                        </div>
                        <div className="flex-1 text-center">
                          <TeamLogo url={match.teamB?.logoUrl ?? null} name={match.teamB?.name ?? "?"} className="size-10 mx-auto mb-1.5 rounded-lg" />
                          <p className="text-sm font-bold truncate">{match.teamB?.name ?? "À déterminer"}</p>
                          {playersB && <p className="text-[10px] text-[var(--color-muted)] truncate px-1">{playersB}</p>}
                          <p className="text-xs font-semibold text-[var(--color-accent)] mt-0.5">x{oddsB}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-center gap-1 rounded-lg bg-[var(--color-surface-2)] py-2 text-sm font-medium text-[var(--color-muted)]">
                        Parier sur ce match
                        <ChevronRight className="size-4" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Podium des 3 meilleurs parieurs (fin de tournoi) */}
      {champion && top3.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Podium parieurs
          </h2>
          <div className="flex items-end gap-2">
            {top3[1] ? (
              <div className="flex-1 flex flex-col items-center gap-1.5 animate-stagger stagger-2">
                <span className="text-xl">🥈</span>
                <UserAvatar src={top3[1].avatarUrl ?? undefined} name={top3[1].name ?? "?"} className="size-11" />
                <p className="text-[11px] font-semibold truncate max-w-[80px] text-center">{top3[1].name ?? "Anonyme"}</p>
                <p className="text-[10px] font-bold text-[var(--color-muted)] tabular-nums">{top3[1].wizzBalance} Wiz</p>
                <div className="w-full h-14 rounded-t-xl bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]" />
              </div>
            ) : <div className="flex-1" />}
            {top3[0] && (
              <div className="flex-1 flex flex-col items-center gap-1.5 animate-stagger">
                <span className="text-2xl drop-shadow-[0_0_8px_var(--color-gold)]">🥇</span>
                <UserAvatar src={top3[0].avatarUrl ?? undefined} name={top3[0].name ?? "?"} className="size-14 ring-2 ring-[var(--color-gold)]/50 shadow-[0_0_16px_rgba(234,179,8,0.25)]" />
                <p className="text-sm font-bold truncate max-w-[90px] text-center">{top3[0].name ?? "Anonyme"}</p>
                <p className="text-xs font-bold text-[var(--color-gold-bright)] tabular-nums">{top3[0].wizzBalance} Wiz</p>
                <div className="w-full h-20 rounded-t-xl bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30" />
              </div>
            )}
            {top3[2] ? (
              <div className="flex-1 flex flex-col items-center gap-1.5 animate-stagger stagger-3">
                <span className="text-xl">🥉</span>
                <UserAvatar src={top3[2].avatarUrl ?? undefined} name={top3[2].name ?? "?"} className="size-11" />
                <p className="text-[11px] font-semibold truncate max-w-[80px] text-center">{top3[2].name ?? "Anonyme"}</p>
                <p className="text-[10px] font-bold text-[var(--color-muted)] tabular-nums">{top3[2].wizzBalance} Wiz</p>
                <div className="w-full h-9 rounded-t-xl bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]" />
              </div>
            ) : <div className="flex-1" />}
          </div>
        </div>
      )}
    </div>
  );
}
