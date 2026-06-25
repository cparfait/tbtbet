import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { getUserById, getUserChampionBet, getUserBets, getLeaderboard } from "@/lib/data/queries";
import { TeamLogo } from "@/components/team-logo";
import { ProfileForm } from "./profile-form";
import { Zap, Target, Trophy, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const PHASE_LABEL: Record<string, string> = {
  POOL: "Phase de poules",
  WINNER_BRACKET: "Winners",
  LOSER_BRACKET: "Losers",
  FINAL_SERIES: "Finale",
};

export const metadata = { title: "Mon profil · TBT Bet" };
export const dynamic = "force-dynamic";

function frenchOrdinal(n: number): string {
  return n === 1 ? "1er" : `${n}e`;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, championBet, bets, leaderboard] = await Promise.all([
    getUserById(session.user.id),
    getUserChampionBet(session.user.id),
    getUserBets(session.user.id),
    getLeaderboard(),
  ]);

  if (!user) redirect("/login");

  const settledBets = bets.filter((b) => b.settled);
  const wonBets = settledBets.filter((b) => b.payout && b.payout > b.amountWizz);
  const winRate = settledBets.length > 0
    ? Math.round((wonBets.length / settledBets.length) * 100)
    : null;

  const pendingBets = bets.filter((b) => !b.settled);
  const pendingTotal = pendingBets.reduce((sum, b) => sum + b.amountWizz, 0);
  const totalWizz = user.wizzBalance + pendingTotal;

  const userRankIdx = leaderboard.findIndex((u) => u.id === user.id);
  const userRank = userRankIdx >= 0 ? userRankIdx + 1 : null;
  const totalPlayers = leaderboard.length;

  const avatarSrc = user.avatarUrl ?? user.image ?? null;
  const initials = (user.name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  // Grouper les paris par date du match
  const sortedBets = [...bets].sort((a, b) => {
    const da = a.match.scheduledAt ? new Date(a.match.scheduledAt).getTime() : 0;
    const db = b.match.scheduledAt ? new Date(b.match.scheduledAt).getTime() : 0;
    return db - da;
  });

  const betGroups: { dateLabel: string; bets: typeof sortedBets }[] = [];
  const seenDates = new Set<string>();
  for (const bet of sortedBets) {
    const key = bet.match.scheduledAt
      ? new Date(bet.match.scheduledAt).toDateString()
      : "unknown";
    if (!seenDates.has(key)) {
      seenDates.add(key);
      const label = bet.match.scheduledAt
        ? formatDateLabel(new Date(bet.match.scheduledAt))
        : "Date inconnue";
      betGroups.push({ dateLabel: label, bets: [] });
    }
    betGroups[betGroups.length - 1]!.bets.push(bet);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Mon profil" />

      <div className="md:grid md:grid-cols-[280px_1fr] md:gap-6 md:items-start">
        {/* Colonne gauche : profil + stats */}
        <div className="space-y-4">
          {/* Header profil : avatar + nom inline editable + email */}
          <Card className="p-5">
            <ProfileForm
              currentName={user.name ?? ""}
              currentAvatarUrl={avatarSrc ?? ""}
              email={user.email}
              role={user.role}
              initials={initials}
            />
          </Card>

          {/* Stats ligne 1 : Crédits / Paris en cours / Total */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-3 text-center">
              <Zap className="size-4 mx-auto mb-1 text-[var(--color-accent)]" />
              <p className="text-xl font-bold text-[var(--color-accent)]">{user.wizzBalance}</p>
              <p className="text-[10px] text-[var(--color-muted)]">Crédits</p>
            </Card>
            <Card className="p-3 text-center">
              <Clock className="size-4 mx-auto mb-1 text-[var(--color-muted)]" />
              <p className="text-xl font-bold">{pendingTotal}</p>
              <p className="text-[10px] text-[var(--color-muted)]">Paris en cours</p>
            </Card>
            <Card className="p-3 text-center">
              <Zap className="size-4 mx-auto mb-1 text-[var(--color-accent)]" />
              <p className="text-xl font-bold text-[var(--color-accent)]">{totalWizz}</p>
              <p className="text-[10px] text-[var(--color-muted)]">Total (Wiz)</p>
            </Card>
          </div>

          {/* Stats ligne 2 : Bonus x2 / Victoires / Rang */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-3 text-center">
              <span className="block text-lg mb-1">🃏</span>
              <p className="text-xl font-bold">{user.jokersLeft}</p>
              <p className="text-[10px] text-[var(--color-muted)]">Bonus x2</p>
            </Card>
            <Card className="p-3 text-center">
              <Target className="size-4 mx-auto mb-1 text-[var(--color-accent)]" />
              <p className="text-xl font-bold">
                {winRate !== null ? `${winRate}%` : "—"}
              </p>
              <p className="text-[10px] text-[var(--color-muted)]">
                Victoires ({wonBets.length}/{settledBets.length})
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

          {/* Pari champion */}
          {championBet && (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] px-4 py-3">
              <Trophy className="size-4 text-[var(--color-accent)] shrink-0" />
              <p className="text-sm text-[var(--color-muted)]">
                Tes favoris sont{" "}
                <span className="font-semibold text-[var(--color-cream)]">
                  {championBet.team.name}
                </span>
                {championBet.jokerUsed && (
                  <span className="ml-1 text-[11px]">· 🃏 Bonus activé</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Colonne droite : mes paris */}
        <div className="mt-5 md:mt-0">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Mes paris ({bets.length})
        </h2>
        {bets.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-[var(--color-muted)]">Aucun pari pour l&apos;instant.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {betGroups.map((group) => (
              <div key={group.dateLabel}>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] capitalize">
                  {group.dateLabel}
                </p>
                <div className="space-y-2">
                  {group.bets.map((bet) => {
                    const won = bet.settled && bet.payout !== null && bet.payout > bet.amountWizz;
                    const lost = bet.settled && (bet.payout === null || bet.payout === 0);
                    const chosenTeam =
                      bet.choice === "TEAM_A"
                        ? bet.match.teamA
                        : bet.choice === "TEAM_B"
                        ? bet.match.teamB
                        : null;
                    const profit =
                      bet.payout !== null ? bet.payout - bet.amountWizz : null;
                    return (
                      <Card
                        key={bet.id}
                        className={cn(
                          "p-3",
                          won && "border-green-500/40 bg-green-500/[0.06]",
                          lost && "border-red-500/40 bg-red-500/[0.06]"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Logos équipes */}
                          <div className="flex items-center gap-1 shrink-0">
                            <TeamLogo url={bet.match.teamA.logoUrl} name={bet.match.teamA.name} className="size-8 rounded-md" />
                            <span className="text-[10px] text-[var(--color-muted)] font-bold">VS</span>
                            <TeamLogo url={bet.match.teamB?.logoUrl ?? null} name={bet.match.teamB?.name ?? "?"} className="size-8 rounded-md" />
                          </div>

                          {/* Infos */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-[var(--color-muted)] mb-0.5">
                              {PHASE_LABEL[bet.match.phase] ?? bet.match.phase}
                              {bet.match.label ? ` · ${bet.match.label}` : ""}
                            </p>
                            <p className="text-xs font-semibold truncate">
                              {bet.match.teamA.name} vs {bet.match.teamB?.name ?? "À déterminer"}
                            </p>
                            <p className="text-[10px] text-[var(--color-muted)] mt-0.5">
                              Misé sur{" "}
                              <span className="text-[var(--color-cream)] font-medium">
                                {chosenTeam?.name ?? "Nul"}
                              </span>
                              {" · "}
                              {bet.amountWizz} Wiz
                              {bet.jokerUsed && " · 🃏"}
                            </p>
                          </div>

                          {/* Résultat */}
                          <div className="shrink-0 text-right">
                            {!bet.settled ? (
                              <span className="flex items-center gap-1 text-[10px] text-[var(--color-muted)]">
                                <Clock className="size-3" /> En attente
                              </span>
                            ) : won ? (
                              <span className="flex items-center gap-1 text-[10px] text-green-400 font-semibold">
                                <TrendingUp className="size-3" />
                                +{profit} Wiz
                              </span>
                            ) : lost ? (
                              <span className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
                                <TrendingDown className="size-3" />
                                -{bet.amountWizz} Wiz
                              </span>
                            ) : (
                              <span className="text-[10px] text-[var(--color-muted)]">Remboursé</span>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
