import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Radio } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Flag } from "@/components/flag";
import { getPredictionComparison } from "@/lib/data/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function PointsBadge({ points, live }: { points: number | null; live: boolean }) {
  if (points === null) return <span className="text-[var(--color-muted)]">—</span>;
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
        live
          ? "bg-red-500/15 text-red-400"
          : points > 0
            ? "bg-[var(--color-pitch)]/15 text-[var(--color-pitch-bright)]"
            : "bg-[var(--color-surface-2)] text-[var(--color-muted)]"
      )}
    >
      {points > 0 ? `+${points}` : "0"}
    </span>
  );
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const data = await getPredictionComparison(session.user.id, id);
  if (!data) notFound();

  const isSelf = id === session.user.id;

  return (
    <>
      <Link
        href="/leaderboard"
        className="mb-5 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-cream)]"
      >
        <ArrowLeft className="size-4" />
        <span>Classement</span>
      </Link>

      <PageHeader
        title={isSelf ? "Tes pronos" : `Pronos de ${data.targetName}`}
        subtitle={isSelf ? undefined : "Comparé aux tiens"}
      />

      {data.rows.length === 0 && (
        <Card className="glass p-8 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            Aucun prono visible (les pronos n&apos;apparaissent qu&apos;après le
            coup d&apos;envoi). ⚽
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {data.rows.map((row) => {
          const live = row.match.live;
          const score = row.match.result ?? row.match.live;
          return (
            <Card key={row.match.id} className="p-3">
              {/* Match + score */}
              <div className="mb-2 flex items-center justify-center gap-2 border-b border-[var(--color-border-subtle)] pb-2 text-sm">
                <Flag code={row.match.homeFlag} className="h-4 w-6" />
                <span className="truncate font-medium">{row.match.homeTeam}</span>
                <span
                  className={cn(
                    "px-1 font-[family-name:var(--font-display)] font-bold",
                    live ? "text-red-400" : "text-[var(--color-gold)]"
                  )}
                >
                  {score ? `${score.homeScore} - ${score.awayScore}` : "vs"}
                </span>
                <span className="truncate font-medium">{row.match.awayTeam}</span>
                <Flag code={row.match.awayFlag} className="h-4 w-6" />
                {live && (
                  <Radio className="size-3 shrink-0 animate-pulse text-red-400" />
                )}
              </div>

              {/* Comparaison */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {/* Eux */}
                <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--color-surface-2)] px-2.5 py-1.5">
                  <span className="truncate text-xs text-[var(--color-muted)]">
                    {isSelf ? "Toi" : data.targetName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-[family-name:var(--font-mono)] font-bold">
                      {row.theirs.homeScore}-{row.theirs.awayScore}
                    </span>
                    {row.theirs.joker && <span className="text-xs">🃏</span>}
                    <PointsBadge points={row.theirs.points} live={!!live} />
                  </span>
                </div>

                {/* Moi */}
                <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-pitch)]/20 bg-[var(--color-pitch)]/[0.05] px-2.5 py-1.5">
                  <span className="truncate text-xs text-[var(--color-pitch-bright)]">
                    {isSelf ? "—" : "Toi"}
                  </span>
                  {row.mine ? (
                    <span className="flex items-center gap-1.5">
                      <span className="font-[family-name:var(--font-mono)] font-bold">
                        {row.mine.homeScore}-{row.mine.awayScore}
                      </span>
                      {row.mine.joker && <span className="text-xs">🃏</span>}
                      <PointsBadge points={row.mine.points} live={!!live} />
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--color-muted)]">
                      pas de prono
                    </span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
