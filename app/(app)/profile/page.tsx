import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { getUserById, getUserChampionBet, getUserBets } from "@/lib/data/queries";
import { TeamLogo } from "@/components/team-logo";
import { ProfileForm } from "./profile-form";
import { Zap, Target, Trophy, TrendingUp, TrendingDown, Clock } from "lucide-react";

const PHASE_LABEL: Record<string, string> = {
  POOL: "Phase de poules",
  WINNER_BRACKET: "Winners",
  LOSER_BRACKET: "Losers",
  FINAL_SERIES: "Finale",
};

export const metadata = { title: "Mon profil · TBT Bet" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, championBet, bets] = await Promise.all([
    getUserById(session.user.id),
    getUserChampionBet(session.user.id),
    getUserBets(session.user.id),
  ]);

  if (!user) redirect("/login");

  const settledBets = bets.filter((b) => b.settled);
  const wonBets = settledBets.filter((b) => b.payout && b.payout > b.amountWizz);
  const winRate = settledBets.length > 0
    ? Math.round((wonBets.length / settledBets.length) * 100)
    : null;

  const avatarSrc = user.avatarUrl ?? user.image ?? null;
  const initials = (user.name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-5">
      <PageHeader title="Mon profil" />

      {/* Avatar + nom */}
      <Card className="p-5">
        <div className="mb-1">
          <p className="text-lg font-bold truncate text-[var(--color-cream)]">
            {user.name || "Anonyme"}
          </p>
          <p className="text-xs text-[var(--color-muted)] truncate">{user.email}</p>
          {user.role === "ADMIN" && (
            <span className="mt-1 inline-block rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent)]">
              ADMIN
            </span>
          )}
        </div>

        <ProfileForm
          currentName={user.name ?? ""}
          currentAvatarUrl={avatarSrc ?? ""}
          initials={initials}
        />
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <Zap className="size-4 mx-auto mb-1 text-[var(--color-accent)]" />
          <p className="text-xl font-bold text-[var(--color-accent)]">{user.wizzBalance}</p>
          <p className="text-[10px] text-[var(--color-muted)]">Wizz</p>
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
          <span className="block text-lg mb-1">🃏</span>
          <p className="text-xl font-bold">{user.jokersLeft}</p>
          <p className="text-[10px] text-[var(--color-muted)]">Jokers</p>
        </Card>
      </div>

      {/* Pari champion */}
      {championBet && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Trophy className="size-5 text-[var(--color-accent)]" />
            <div>
              <p className="text-sm font-semibold">Pari Champion</p>
              <p className="text-xs text-[var(--color-muted)]">
                {championBet.team.name}
                {championBet.jokerUsed && " · Joker activé"}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Mes paris */}
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Mes paris ({bets.length})
        </h2>
        {bets.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-[var(--color-muted)]">Aucun pari pour l&apos;instant.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {bets.map((bet) => {
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
                <Card key={bet.id} className="p-3">
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
                        {bet.amountWizz} Wizz
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
                          +{profit} Wizz
                        </span>
                      ) : lost ? (
                        <span className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
                          <TrendingDown className="size-3" />
                          -{bet.amountWizz} Wizz
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
        )}
      </div>

    </div>
  );
}
