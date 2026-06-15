import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ChevronRight, TrendingUp, Target, Trophy, Radio } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { MatchCard } from "@/components/match-card";
import { OddsOutcomes } from "@/components/odds-outcomes";
import { Flag } from "@/components/flag";
import { Card } from "@/components/ui/card";
import { LiveRefresher } from "@/components/live-refresher";
import { HomeOnboarding } from "@/components/home-onboarding";
import { OddsAnnouncement } from "@/components/odds-announcement";
import { GroupSwitcher } from "@/components/group-switcher";
import {
  getLiveLeaderboard,
  getMatches,
  getMyPrediction,
  getUserStats,
  getChampionPick,
  getChampionableTeams,
  isChampionPickOpen,
} from "@/lib/data/queries";
import { ChampionPickCard } from "@/components/champion-pick-card";
import {
  getMyGroups,
  getGroupMemberIds,
  requireActiveGroup,
} from "@/lib/groups";
import { cn, formatKickoffTime } from "@/lib/utils";

export const metadata = { title: "Hub \u00b7 DaronsFC" };
export const dynamic = "force-dynamic";

const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const firstName = session.user.name?.split(" ")[0] ?? "Daron";
  const now = Date.now();

  // Groupe actif (redirige vers /groups si l'utilisateur n'en a aucun).
  const activeGroup = await requireActiveGroup(userId);
  const [myGroups, memberIds] = await Promise.all([
    getMyGroups(userId),
    getGroupMemberIds(activeGroup.id),
  ]);

  const [matches, { entries: leaderboard, hasLive }] = await Promise.all([
    getMatches(),
    getLiveLeaderboard(memberIds),
  ]);

  const stats = await getUserStats(userId);
  const [championPick, championTeams, championOpen] = await Promise.all([
    getChampionPick(userId),
    getChampionableTeams(),
    isChampionPickOpen(),
  ]);

  const TOP_3 = leaderboard.slice(0, 3).map((u, i) => ({
    name: u.name,
    points: u.total,
    medal: MEDALS[i],
  }));

  const myRank = leaderboard.find((u) => u.email === session.user?.email)?.rank;

  // Match « à la une » : priorité au direct, sinon prochain match, sinon dernier joué.
  const liveMatch = matches.find((m) => m.live);
  const upcoming = matches
    .filter((m) => new Date(m.kickoffAt).getTime() > now)
    .sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt));
  const lastPlayed = matches
    .filter((m) => m.result)
    .sort((a, b) => +new Date(b.kickoffAt) - +new Date(a.kickoffAt))[0];
  const featuredMatch = liveMatch ?? upcoming[0] ?? lastPlayed;
  const featuredStarted =
    !!featuredMatch &&
    (!!featuredMatch.live ||
      !!featuredMatch.result ||
      new Date(featuredMatch.kickoffAt).getTime() <= now);
  const featuredLabel = featuredMatch?.live
    ? "En direct"
    : featuredStarted
      ? "Dernier match"
      : "Prochain match";

  const upcomingMatches = upcoming.slice(0, 3);

  // Mon prono sur le match à la une (s'il existe).
  const featuredPrediction = featuredMatch
    ? await getMyPrediction(userId, featuredMatch.id)
    : null;

  const avatar = session?.user?.image;

  return (
    <>
      {hasLive && <LiveRefresher seconds={30} />}

      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            Salut {firstName}
            <Image
              src="/world-cup.png"
              alt="Coupe du Monde"
              width={30}
              height={30}
              className="inline-block drop-shadow-[0_0_6px_var(--color-gold)]/40"
            />
          </span>
        }
        subtitle={"Pr\u00eat \u00e0 pronostiquer ?"}
        action={
          <Link href="/profile" aria-label="Mon profil" className="block transition-transform hover:scale-105">
            {avatar ? (
              <Image
                src={avatar}
                alt={firstName}
                width={44}
                height={44}
                className="size-11 rounded-full object-cover ring-2 ring-[var(--color-pitch)]/30"
              />
            ) : (
              <div className="flex size-11 items-center justify-center rounded-full bg-[var(--color-pitch)] text-lg font-bold ring-2 ring-[var(--color-pitch-bright)]/30">
                {firstName.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
        }
      />

      <div className="mb-5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
          Groupe
        </span>
        <GroupSwitcher groups={myGroups} activeId={activeGroup.id} />
      </div>

      <HomeOnboarding />
      <OddsAnnouncement />

      <ChampionPickCard
        pick={championPick}
        teams={championTeams}
        open={championOpen}
      />

      <div className="mb-6 grid grid-cols-3 gap-3 animate-stagger stagger-1">
        <Link href="/profile/scoring">
          <Card className="glass card-hover flex flex-col items-center justify-center py-5 px-3 text-center">
            <Trophy className="mb-1 size-5 text-[var(--color-gold)]" />
            <span className="text-gradient-gold font-[family-name:var(--font-display)] text-2xl font-bold leading-tight">
              {stats?.points ?? 0}
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
              Points
            </span>
          </Card>
        </Link>

        <Link href="/leaderboard">
          <Card className="glass card-hover flex flex-col items-center justify-center py-5 px-3 text-center">
            <Target className="mb-1 size-5 text-[var(--color-pitch-bright)]" />
            <span className="text-gradient-pitch font-[family-name:var(--font-display)] text-2xl font-bold leading-tight">
              {stats?.exactScores ?? 0}
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
              Scores exacts
            </span>
          </Card>
        </Link>

        <Link href="/leaderboard">
          <Card className="glass card-hover flex flex-col items-center justify-center py-5 px-3 text-center">
            <TrendingUp className="mb-1 size-5 text-[var(--color-gold)]" />
            <span className="text-gradient-gold font-[family-name:var(--font-display)] text-2xl font-bold leading-tight">
              {myRank ? `${myRank}${myRank === 1 ? "er" : "e"}` : "—"}
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
              Rang
            </span>
          </Card>
        </Link>
      </div>

      {featuredMatch && (
        <div className="mb-6 animate-stagger stagger-2">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            {featuredLabel}
          </h2>
          <Link href={"/matches/" + featuredMatch.id} className="block">
            <Card className="glass-strong glow-pitch relative overflow-hidden p-0 transition-all duration-300 hover:scale-[1.01]">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--color-pitch)]/10 via-transparent to-[var(--color-gold)]/5" />

              <div className="relative p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-muted)]">
                    {featuredMatch.group
                      ? "Groupe " + featuredMatch.group
                      : featuredMatch.stage}
                    {!featuredStarted && (
                      <span className="ml-2 text-[var(--color-cream)]/70">
                        {formatKickoffTime(featuredMatch.kickoffAt)}
                      </span>
                    )}
                  </span>
                  {featuredMatch.live ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-400">
                      <Radio className="size-3 animate-pulse" />
                      En direct
                    </span>
                  ) : featuredMatch.result ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] px-3 py-1 text-xs font-semibold text-[var(--color-muted)]">
                      Terminé
                    </span>
                  ) : new Date(featuredMatch.kickoffAt) <= new Date() ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-400">
                      <Radio className="size-3 animate-pulse" />
                      En cours
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-pitch)]/15 px-3 py-1 text-xs font-semibold text-[var(--color-pitch-bright)]">
                      <span className="size-2 animate-pulse rounded-full bg-[var(--color-pitch-bright)]" />
                      {"Bient\u00f4t"}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
                    <Flag code={featuredMatch.homeFlag} className="h-11 w-16 drop-shadow-lg" />
                    <span className="font-[family-name:var(--font-display)] text-base font-bold">
                      {featuredMatch.homeTeam}
                    </span>
                  </div>

                  {featuredMatch.live || featuredMatch.result ? (
                    <span
                      className={cn(
                        "font-[family-name:var(--font-display)] text-3xl font-extrabold tabular-nums",
                        featuredMatch.live
                          ? "text-red-400"
                          : "text-gradient-gold"
                      )}
                    >
                      {(featuredMatch.live ?? featuredMatch.result)!.homeScore}
                      <span className="mx-1 text-[var(--color-muted)]">-</span>
                      {(featuredMatch.live ?? featuredMatch.result)!.awayScore}
                    </span>
                  ) : (
                    <span className="font-[family-name:var(--font-display)] text-xl font-black text-[var(--color-muted)]/60">
                      VS
                    </span>
                  )}

                  <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
                    <Flag code={featuredMatch.awayFlag} className="h-11 w-16 drop-shadow-lg" />
                    <span className="font-[family-name:var(--font-display)] text-base font-bold">
                      {featuredMatch.awayTeam}
                    </span>
                  </div>
                </div>

                {!featuredStarted && featuredMatch.odds && (
                  <div className="mt-5">
                    <OddsOutcomes odds={featuredMatch.odds} />
                  </div>
                )}

                {featuredPrediction && (
                  <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[var(--color-gold)]/20 bg-[var(--color-gold)]/[0.06] py-2 text-sm">
                    <span className="text-[var(--color-muted)]">Ton prono</span>
                    <span className="font-[family-name:var(--font-mono)] font-bold text-[var(--color-gold)]">
                      {featuredPrediction.homeScore} – {featuredPrediction.awayScore}
                    </span>
                    {featuredPrediction.joker && (
                      <span className="rounded bg-[var(--color-gold)]/15 px-1.5 py-0.5 text-xs font-bold text-[var(--color-gold)]">
                        JOKER ×2
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-5 flex justify-center">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-pitch)] to-[var(--color-pitch-bright)] px-6 py-2.5 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-[var(--color-pitch)]/25 transition-transform hover:scale-105">
                    {featuredStarted
                      ? "Voir les pronos"
                      : featuredPrediction
                        ? "Modifier mon prono"
                        : "Pronostiquer"}
                    <ChevronRight className="size-4" />
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      )}

      <div className="mb-6 animate-stagger stagger-3">
        <Card className="glass overflow-hidden">
          <Link
            href="/leaderboard"
            className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-4 py-3 transition-colors hover:bg-white/[0.02]"
          >
            <span className="font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              Classement
            </span>
            <ChevronRight className="size-4 text-[var(--color-muted)]" />
          </Link>
          <ul>
            {TOP_3.map((r, i) => (
              <li
                key={r.name}
                className={
                  "flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/[0.02]" +
                  (i < TOP_3.length - 1
                    ? " border-b border-[var(--color-border-subtle)]"
                    : "")
                }
              >
                <span className="text-lg leading-none">{r.medal}</span>
                <span
                  className={
                    "flex-1 font-medium" +
                    (i === 0
                      ? " text-gradient-gold font-[family-name:var(--font-display)] font-bold"
                      : "")
                  }
                >
                  {r.name}
                </span>
                <span
                  className={
                    "font-[family-name:var(--font-mono)] text-sm font-semibold" +
                    (i === 0
                      ? " text-[var(--color-gold)]"
                      : " text-[var(--color-muted)]")
                  }
                >
                  {r.points} pts
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mb-6 animate-stagger stagger-3">
        <Link href="/standings" className="block">
          <Card className="glass card-hover flex items-center gap-3 px-4 py-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-pitch)]/15 text-lg">
              🏟️
            </span>
            <div className="flex-1">
              <p className="font-[family-name:var(--font-display)] text-sm font-bold text-[var(--color-cream)]">
                Classements des poules
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                Le tableau des groupes de la Coupe du Monde
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-[var(--color-muted)]" />
          </Card>
        </Link>
      </div>

      {upcomingMatches.length > 0 && (
        <div className="animate-stagger stagger-4">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold">
            Prochains matchs
          </h2>
          <div className="flex flex-col gap-2.5">
            {upcomingMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      )}

      {!featuredMatch && upcomingMatches.length === 0 && (
        <Card className="glass p-8 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            {"Aucun match \u00e0 venir. Repose tes pronos \u{1F634}"}
          </p>
        </Card>
      )}
    </>
  );
}
