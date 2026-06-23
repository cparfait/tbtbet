import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { getUserById, getUserChampionBet, getUserBets } from "@/lib/data/queries";
import { ProfileForm } from "./profile-form";
import { Zap, Target, Trophy } from "lucide-react";

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
  const initials = (user.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-5">
      <PageHeader title="Mon profil" />

      {/* Avatar + nom */}
      <Card className="p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="relative shrink-0">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt={user.name ?? "avatar"}
                className="size-16 rounded-full object-cover ring-2 ring-[var(--color-accent)]/40"
              />
            ) : (
              <span className="flex size-16 items-center justify-center rounded-full bg-[var(--color-accent)]/15 text-2xl font-bold text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30">
                {initials}
              </span>
            )}
          </div>
          <div className="min-w-0">
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
        </div>

        <ProfileForm
          currentName={user.name ?? ""}
          currentAvatarUrl={user.avatarUrl ?? ""}
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

    </div>
  );
}
