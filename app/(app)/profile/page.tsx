import Image from "next/image";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { SignOutButton } from "@/components/sign-out-button";
import { EditableName } from "@/components/editable-name";
import { PushToggle } from "@/components/push-toggle";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { Flag } from "@/components/flag";
import {
  getBadges,
  getUserStats,
  getUserPredictions,
  getJokerUsage,
} from "@/lib/data/queries";
import type {
  BadgeDef,
  UserStats,
  UserPrediction,
  JokerUsage,
} from "@/lib/data/matches";
import { computePoints } from "@/lib/scoring";
import {
  Trophy,
  Target,
  CheckCircle,
  Lock,
  Shield,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Profil · DaronsFC" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";
  // Clé VAPID publique lue au runtime (NEXT_PUBLIC_* est figé au build, on la
  // passe donc en prop depuis le serveur pour qu'elle marche via Portainer).
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  let badges: BadgeDef[] = [];
  let stats: UserStats | null = null;
  let predictions: UserPrediction[] = [];
  let jokers: JokerUsage | null = null;
  if (user?.id) {
    [badges, stats, predictions, jokers] = await Promise.all([
      getBadges(),
      getUserStats(user.id),
      getUserPredictions(user.id),
      getJokerUsage(user.id),
    ]);
  }

  const userBadges = stats?.badges ?? [];

  const STATS = [
    { icon: Trophy, label: "Scores exacts", value: stats?.exactScores ?? 0, emoji: "🎯" },
    { icon: CheckCircle, label: "Bons résultats", value: stats?.correctResults ?? 0, emoji: "✅" },
    { icon: Target, label: "Jokers utilisés", value: stats?.jokersUsed ?? 0, emoji: "🃏" },
  ] as const;

  /** Points d'un pronostic terminé, ou null si match non joué. */
  function pointsFor(pred: (typeof predictions)[number]): number | null {
    if (!pred.match.result) return null;
    return computePoints(
      { homeScore: pred.homeScore, awayScore: pred.awayScore },
      pred.match.result,
      pred.joker,
      pred.match.odds
    ).points;
  }

  return (
    <>
      <PageHeader title="Profil" />

      {/* Profile hero card */}
      <Card className="glass mb-6 p-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            {user?.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "Avatar"}
                width={72}
                height={72}
                className="rounded-full ring-2 ring-[var(--color-pitch)]/30"
              />
            ) : (
              <div className="flex size-[72px] items-center justify-center rounded-full bg-[var(--color-pitch)] text-3xl font-bold ring-2 ring-[var(--color-pitch-bright)]/30">
                {(user?.name ?? "D").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-[var(--color-pitch)] text-[10px]">
              <TrendingUp className="size-3 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <EditableName initialName={user?.name ?? "Daron anonyme"} />
            <p className="mt-0.5 truncate text-sm text-[var(--color-muted)]">
              {user?.email}
            </p>
            {isAdmin && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-gold)]/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-gold)]">
                <Shield className="size-3" />
                Admin
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        {/* Carte Points cliquable → page barème */}
        <Link href="/profile/scoring">
          <Card className="glass relative cursor-pointer p-4 text-center transition-all duration-200 hover:border-[var(--color-gold)]/40">
            <ChevronRight className="absolute right-2 top-2 size-4 text-[var(--color-muted)]" />
            <p className="text-2xl">🏆</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-gold)]">
              {stats?.points ?? 0}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              Points
            </p>
          </Card>
        </Link>

        {STATS.map((stat) => (
          <Card
            key={stat.label}
            className="glass p-4 text-center transition-all duration-200 hover:border-[var(--color-pitch)]/20"
          >
            <p className="text-2xl">{stat.emoji}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-gold)]">
              {stat.value}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              {stat.label}
            </p>
          </Card>
        ))}
      </div>

      {/* Lien vers le Wrapped / stats perso */}
      <Link href="/profile/stats" className="mb-6 block">
        <Card className="glass card-hover flex items-center gap-3 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-gold)]/15 text-lg">
            🎬
          </span>
          <div className="flex-1">
            <p className="font-[family-name:var(--font-display)] text-sm font-bold text-[var(--color-cream)]">
              Ton Wrapped CdM
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              Taux de réussite, équipe fétiche, meilleur prono…
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-[var(--color-muted)]" />
        </Card>
      </Link>

      {/* Jokers par phase */}
      {jokers && (
        <Card className="glass mb-6 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg">🃏</span>
            <h3 className="font-[family-name:var(--font-display)] text-base font-bold tracking-wide">
              Mes jokers
            </h3>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              points ×2
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {([
              { label: "Phase de poules", data: jokers.group },
              { label: "Phase finale", data: jokers.knockout },
            ] as const).map(({ label, data }) => {
              const left = Math.max(0, data.budget - data.used);
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-sm text-[var(--color-cream)]">
                    {label}
                  </span>
                  <div className="flex flex-1 items-center gap-1.5">
                    {Array.from({ length: data.budget }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-2 flex-1 rounded-full ${
                          i < data.used
                            ? "bg-[var(--color-gold)]"
                            : "bg-[var(--color-surface-3)]"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="w-14 shrink-0 text-right font-[family-name:var(--font-mono)] text-xs font-semibold text-[var(--color-muted)]">
                    {left}/{data.budget}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Badges section */}
      <div className="mb-6">
        <h3 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold tracking-wide">
          Mes badges
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {badges.length === 0 && (
            <p className="text-sm text-[var(--color-muted)]">
              Aucun badge pour l&apos;instant.
            </p>
          )}
          {badges.map((badge) => {
            const unlocked = userBadges.includes(badge.key);
            return (
              <Card
                key={badge.key}
                className={`glass flex min-w-[140px] flex-shrink-0 flex-col items-center gap-1.5 p-4 text-center transition-all duration-200 ${
                  unlocked
                    ? "border-[var(--color-gold)]/20 hover:border-[var(--color-gold)]/40"
                    : "border-[var(--color-border-subtle)] opacity-50 grayscale"
                }`}
              >
                <span className={`text-3xl ${unlocked ? "" : "grayscale"}`}>
                  {badge.emoji}
                </span>
                <span className="text-xs font-semibold text-[var(--color-cream)]">
                  {badge.label}
                </span>
                <span className="text-[10px] leading-tight text-[var(--color-muted)]">
                  {badge.description}
                </span>
                {!unlocked && (
                  <Lock className="mt-1 size-3 text-[var(--color-muted)]" />
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent predictions */}
      <div className="mb-6">
        <h3 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold tracking-wide">
          Derniers pronostics
        </h3>
        <div className="flex flex-col gap-2">
          {predictions.length === 0 && (
            <Card className="glass p-6 text-center">
              <p className="text-sm text-[var(--color-muted)]">
                Aucun pronostic pour l&apos;instant. Va en placer un sur un
                match ! ⚽
              </p>
            </Card>
          )}
          {predictions.map((pred) => {
            const match = pred.match;
            const points = pointsFor(pred);
            const isExact =
              match.result &&
              pred.homeScore === match.result.homeScore &&
              pred.awayScore === match.result.awayScore;

            return (
              <Card
                key={pred.matchId}
                className="glass flex items-center gap-3 p-3 transition-all duration-200 hover:border-[var(--color-pitch)]/20"
              >
                {/* Match teams + flags */}
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <Flag code={match.homeFlag} className="h-4 w-6" />
                  <span className="truncate text-sm font-medium">
                    {match.homeTeam}
                  </span>
                  <span className="text-xs text-[var(--color-muted)]">vs</span>
                  <span className="truncate text-sm font-medium">
                    {match.awayTeam}
                  </span>
                  <Flag code={match.awayFlag} className="h-4 w-6" />
                </div>

                {/* Predicted score */}
                <div className="flex shrink-0 items-center gap-1">
                  <span
                    className={`font-[family-name:var(--font-display)] text-lg font-bold ${
                      isExact
                        ? "text-[var(--color-pitch-bright)]"
                        : "text-[var(--color-cream)]"
                    }`}
                  >
                    {pred.homeScore}-{pred.awayScore}
                  </span>
                  {pred.joker && (
                    <span className="text-sm" title="Joker activé">
                      🃏
                    </span>
                  )}
                </div>

                {/* Points badge */}
                {points !== null && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      points > 0
                        ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)]"
                        : "bg-[var(--color-surface-2)] text-[var(--color-muted)]"
                    }`}
                  >
                    {points > 0 ? `+${points} pts` : "0 pt"}
                  </span>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Notifications push */}
      <div className="mb-3">
        <PushToggle vapidKey={vapidKey} />
      </div>

      {/* Admin link */}
      {isAdmin && (
        <a
          href="/admin"
          className="glass mb-3 flex items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] px-4 py-3 text-sm font-medium transition-all duration-200 hover:border-[var(--color-gold)]/40 hover:bg-[var(--color-gold)]/5"
        >
          <Shield className="size-4 text-[var(--color-gold)]" />
          Console d&apos;administration
        </a>
      )}

      <SignOutButton />

      <div className="mt-2">
        <DeleteAccountButton />
      </div>
    </>
  );
}
