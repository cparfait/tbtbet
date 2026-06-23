import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { getPoolStandings } from "@/lib/data/queries";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PoolStandingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const data = await getPoolStandings(id);
  if (!data) notFound();

  const { pool, standings } = data;

  // Tous les matchs de cette poule (à venir + terminés)
  const matches = await prisma.match.findMany({
    where: {
      phase: "POOL",
      OR: [
        { teamA: { poolId: id } },
        { teamB: { poolId: id } },
      ],
    },
    include: { teamA: true, teamB: true },
    orderBy: { scheduledAt: "asc" },
  });

  const rankLabel = (i: number) => {
    if (i === 0) return { label: "→ WB", color: "text-green-400" };
    if (i === 1) return { label: "→ WB", color: "text-green-400" };
    return { label: "→ LB", color: "text-orange-400" };
  };

  return (
    <div className="space-y-5">
      <Link
        href="/leaderboard"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-cream)]"
      >
        <ArrowLeft className="size-4" /> Classement
      </Link>

      <PageHeader
        title={pool.name}
        subtitle={`${standings.length} équipe${standings.length > 1 ? "s" : ""}`}
      />

      {/* Table classement */}
      <div>
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 gap-y-0 items-center mb-2 px-2">
          <span className="text-[10px] text-[var(--color-muted)]">#</span>
          <span className="text-[10px] text-[var(--color-muted)]">Équipe</span>
          <span className="text-[10px] text-[var(--color-muted)] text-center">J</span>
          <span className="text-[10px] text-[var(--color-muted)] text-center">V</span>
          <span className="text-[10px] text-[var(--color-muted)] text-center">DB</span>
          <span className="text-[10px] text-[var(--color-muted)] text-center">Pts</span>
        </div>
        <div className="space-y-1">
          {standings.map((s, i) => {
            const rank = rankLabel(i);
            return (
              <Card
                key={s.team.id}
                className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 items-center p-3"
              >
                <span className="text-sm font-bold w-5 text-center">{i + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {s.team.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.team.logoUrl} alt={s.team.name} className="size-5 object-contain rounded" />
                    )}
                    <p className="text-sm font-medium truncate">{s.team.name}</p>
                  </div>
                  <p className={`text-[10px] font-medium ${rank.color}`}>{rank.label}</p>
                </div>
                <span className="text-xs text-center text-[var(--color-muted)]">{s.played}</span>
                <span className="text-xs text-center">{s.wins}</span>
                <span className={`text-xs text-center ${s.gd > 0 ? "text-green-400" : s.gd < 0 ? "text-red-400" : "text-[var(--color-muted)]"}`}>
                  {s.gd > 0 ? "+" : ""}{s.gd}
                </span>
                <span className="text-sm font-bold text-center text-[var(--color-accent)]">{s.points}</span>
              </Card>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-[var(--color-muted)] px-2">
          J = joués · V = victoires · DB = diff. buts · Pts (V=3, N=1)
        </p>
      </div>

      {/* Matchs de cette poule */}
      {matches.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Matchs
          </h2>
          <div className="space-y-2">
            {matches.map((m) => (
              <Link key={m.id} href={`/matches/${m.id}`}>
                <Card className="p-3 hover:border-[var(--color-accent)]/20 transition-colors">
                  {m.status === "FINISHED" ? (
                    /* Résultat */
                    <div className="flex items-center justify-between gap-2">
                      <span className={`flex-1 text-sm font-semibold truncate ${m.result === "TEAM_A" ? "text-[var(--color-accent)]" : ""}`}>
                        {m.teamA.name}
                      </span>
                      <span className="shrink-0 text-base font-bold">
                        {m.scoreA}&nbsp;–&nbsp;{m.scoreB}
                      </span>
                      <span className={`flex-1 text-sm font-semibold text-right truncate ${m.result === "TEAM_B" ? "text-[var(--color-accent)]" : ""}`}>
                        {m.teamB.name}
                      </span>
                    </div>
                  ) : (
                    /* À venir */
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex-1 text-sm font-medium truncate">{m.teamA.name}</span>
                      <div className="shrink-0 text-center">
                        <span className="text-xs text-[var(--color-muted)]">VS</span>
                        {m.scheduledAt && (
                          <p className="text-[9px] text-[var(--color-muted)] mt-0.5">
                            {new Date(m.scheduledAt).toLocaleDateString("fr-FR", {
                              weekday: "short", day: "numeric", month: "short",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>
                      <span className="flex-1 text-sm font-medium text-right truncate">{m.teamB.name}</span>
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
