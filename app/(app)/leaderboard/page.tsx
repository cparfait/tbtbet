import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUp, ArrowDown, Minus, Radio, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { LiveRefresher } from "@/components/live-refresher";
import { GroupSwitcher } from "@/components/group-switcher";
import { cn } from "@/lib/utils";
import { getLiveLeaderboard, getBadges } from "@/lib/data/queries";
import {
  getMyGroups,
  getGroupMemberIds,
  requireActiveGroup,
} from "@/lib/groups";

export const metadata = { title: "Classement · DaronsFC" };
export const dynamic = "force-dynamic";

const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const activeGroup = await requireActiveGroup(userId);
  const [myGroups, memberIds] = await Promise.all([
    getMyGroups(userId),
    getGroupMemberIds(activeGroup.id),
  ]);

  const [{ entries, hasLive }, badges] = await Promise.all([
    getLiveLeaderboard(memberIds),
    getBadges(),
  ]);
  const top3 = entries.slice(0, 3);

  const badgeEmoji = (key: string) =>
    badges.find((b) => b.key === key)?.emoji ?? "";

  return (
    <>
      {hasLive && <LiveRefresher seconds={30} />}

      <PageHeader
        title="Classement"
        subtitle={activeGroup.name}
        action={
          hasLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400">
              <Radio className="size-3 animate-pulse" />
              Live
            </span>
          ) : undefined
        }
      />

      <div className="mb-5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
          Groupe
        </span>
        <GroupSwitcher groups={myGroups} activeId={activeGroup.id} />
      </div>

      {entries.length === 0 && (
        <Card className="glass mt-4 p-8 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            Aucun joueur classé pour l&apos;instant. Les points arrivent après
            les premiers matchs. 🏆
          </p>
        </Card>
      )}

      {/* ── Podium ── */}
      <div className="flex items-end justify-center gap-3 px-2 pt-4 pb-8">
        {top3[1] && (
          <PodiumCard rank={2} name={top3[1].name} points={top3[1].total} index={1} />
        )}
        {top3[0] && (
          <PodiumCard
            rank={1}
            name={top3[0].name}
            points={top3[0].total}
            index={0}
            champion
          />
        )}
        {top3[2] && (
          <PodiumCard rank={3} name={top3[2].name} points={top3[2].total} index={2} />
        )}
      </div>

      {/* ── Classement complet ── */}
      <div className="flex flex-col gap-2">
        {entries.map((user, i) => {
          const isTop3 = i < 3;
          const isChampion = i === 0;

          return (
            <Link key={user.email} href={`/leaderboard/${user.userId}`} className="block">
            <Card
              className={cn(
                "flex items-center gap-3 p-3 transition-colors duration-200 hover:bg-[var(--color-surface-2)]",
                isChampion &&
                  "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/[0.04]"
              )}
            >
              {/* Rang + évolution */}
              <div className="flex w-9 shrink-0 flex-col items-center">
                <span
                  className={cn(
                    "font-[family-name:var(--font-display)] text-lg font-bold leading-none",
                    isChampion && "text-[var(--color-gold)]"
                  )}
                >
                  {isTop3 ? MEDALS[i] : i + 1}
                </span>
                <Evolution value={user.evolution} />
              </div>

              {/* Nom + badges */}
              <div className="min-w-0 flex-1">
                <p className={cn("truncate font-medium", isChampion && "font-bold")}>
                  {user.name}
                </p>
                <div className="flex items-center gap-2">
                  {user.badges.length > 0 && (
                    <span className="text-xs leading-none">
                      {user.badges.map(badgeEmoji).join(" ")}
                    </span>
                  )}
                  <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-muted)]">
                    {user.exactScores} exact{user.exactScores !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Points (+ provisoires en direct) */}
              <div className="flex shrink-0 flex-col items-end">
                <span
                  className={cn(
                    "font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums",
                    isChampion
                      ? "text-[var(--color-gold-bright)]"
                      : "text-[var(--color-gold)]"
                  )}
                >
                  {user.total}
                </span>
                {user.livePoints > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400">
                    <Radio className="size-2.5 animate-pulse" />+{user.livePoints} live
                  </span>
                )}
              </div>

              <ChevronRight className="size-4 shrink-0 text-[var(--color-muted)]" />
            </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}

/* ─── Flèche d'évolution ─── */
function Evolution({ value }: { value: number | null }) {
  if (value == null) return null;
  if (value > 0) {
    return (
      <span className="inline-flex items-center text-[10px] font-bold leading-none text-[var(--color-pitch-bright)]">
        <ArrowUp className="size-3" />
        {value}
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center text-[10px] font-bold leading-none text-red-400">
        <ArrowDown className="size-3" />
        {Math.abs(value)}
      </span>
    );
  }
  return <Minus className="size-3 text-[var(--color-muted)]/50" />;
}

/* ─── Podium card ─── */
function PodiumCard({
  rank,
  name,
  points,
  index,
  champion = false,
}: {
  rank: number;
  name: string;
  points: number;
  index: number;
  champion?: boolean;
}) {
  const heights = ["h-40", "h-28", "h-24"] as const;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2",
        champion && "animate-stagger",
        !champion && `stagger-${index + 1}`
      )}
      style={{ animationDelay: champion ? "0ms" : `${(index + 1) * 150}ms` }}
    >
      {champion && (
        <span className="text-2xl drop-shadow-[0_0_8px_var(--color-gold)]">
          {"\u{1F451}"}
        </span>
      )}

      <div
        className={cn(
          "flex items-center justify-center rounded-full border-2 font-[family-name:var(--font-display)] font-bold",
          champion
            ? "h-16 w-16 border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-2xl text-[var(--color-gold-bright)] shadow-[0_0_20px_var(--color-gold)]/30"
            : "h-12 w-12 border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] text-lg text-[var(--color-cream)]"
        )}
      >
        {name[0]}
      </div>

      <p
        className={cn(
          "font-[family-name:var(--font-display)] font-semibold",
          champion ? "text-sm" : "text-xs"
        )}
      >
        {name}
      </p>
      <p
        className={cn(
          "font-[family-name:var(--font-display)] font-bold tabular-nums",
          champion
            ? "text-xl text-[var(--color-gold-bright)]"
            : "text-base text-[var(--color-gold)]"
        )}
      >
        {points} pts
      </p>

      <div
        className={cn(
          "w-full rounded-t-lg",
          heights[rank - 1],
          champion
            ? "w-24 bg-gradient-to-t from-[var(--color-gold)]/20 to-[var(--color-gold)]/5 border border-[var(--color-gold)]/20"
            : "w-20 bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]"
        )}
      />
    </div>
  );
}
