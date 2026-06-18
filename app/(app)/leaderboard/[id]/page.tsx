import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Radio, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Flag } from "@/components/flag";
import { getPredictionComparison, getBadges } from "@/lib/data/queries";
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

/**
 * Style d'une cellule de prono. Le vert signale UNIQUEMENT un bon résultat
 * (points > 0) — surtout pas l'identité du joueur, sinon on confond « c'est toi »
 * avec « bon prono ». Vert plein = score exact, vert simple = bon résultat,
 * pointillé = match en direct (points encore provisoires), neutre = pas de point.
 */
function cellClass(points: number | null, live: boolean, isExact: boolean) {
  if (points !== null && points > 0) {
    if (isExact)
      return live
        ? "border-2 border-dashed border-[var(--color-pitch-bright)] bg-[var(--color-pitch)]/[0.12]"
        : "border-2 border-[var(--color-pitch-bright)] bg-[var(--color-pitch)]/[0.12]";
    return live
      ? "border border-dashed border-[var(--color-pitch-bright)]/70 bg-[var(--color-pitch)]/[0.06]"
      : "border border-[var(--color-pitch-bright)]/70 bg-[var(--color-pitch)]/[0.07]";
  }
  return "border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]";
}

// Petits messages taquins quand un joueur a oublié de pronostiquer. Choisis de
// façon déterministe (par match) pour varier sans changer à chaque rechargement.
const FORGOT_PHRASES = [
  "😴 A oublié…",
  "🙈 Aux abonnés absents",
  "🤷 Zéro prono",
  "💤 Grasse mat'…",
  "🫥 Pas vu, pas pris",
  "🐔 Dégonflé !",
];

function forgotPhrase(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % FORGOT_PHRASES.length;
  return FORGOT_PHRASES[h] ?? "😴 A oublié…";
}

function ForgotMarker({ seed }: { seed: string }) {
  return (
    <span className="truncate text-xs italic text-[var(--color-muted)]">
      {forgotPhrase(seed)}
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

  const [data, badgeCatalog] = await Promise.all([
    getPredictionComparison(session.user.id, id),
    getBadges(),
  ]);
  if (!data) notFound();

  const badgeEmoji = (key: string) =>
    badgeCatalog.find((b) => b.key === key)?.emoji ?? "";
  const badgeLabel = (key: string) =>
    badgeCatalog.find((b) => b.key === key)?.label ?? key;

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

      {data.targetBadges.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {data.targetBadges.map((key) => (
            <span
              key={key}
              title={badgeLabel(key)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1 text-sm"
            >
              <span className="text-base">{badgeEmoji(key)}</span>
              <span className="text-xs font-medium">{badgeLabel(key)}</span>
            </span>
          ))}
        </div>
      )}

      {/* ── Groupes du joueur ── */}
      {data.targetGroups.length > 0 && (
        <Card className="glass mb-5 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <Users className="size-3.5" />
            {isSelf ? "Tes groupes" : `Groupes de ${data.targetName}`}
          </p>
          <div className="flex flex-wrap gap-2">
            {data.targetGroups.map((g) => (
              <span
                key={g.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] px-3 py-1 text-xs font-medium text-[var(--color-cream)]"
              >
                {g.name}
              </span>
            ))}
          </div>
        </Card>
      )}
      {data.rows.length === 0 && (
        <Card className="glass p-8 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            Aucun prono visible (les pronos n&apos;apparaissent qu&apos;après le
            coup d&apos;envoi). ⚽
          </p>
        </Card>
      )}

      {data.rows.length > 0 && (
        <p className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-[3px] border border-[var(--color-pitch-bright)]/70 bg-[var(--color-pitch)]/[0.07]" />
            Vert = prono qui a marqué des points
          </span>
          <span className="flex items-center gap-1">⭐ Score exact</span>
        </p>
      )}

      <div className="flex flex-col gap-3">
        {data.rows.map((row) => {
          const live = row.match.live;
          const score = row.match.result ?? row.match.live;
          const theirExact =
            !!row.theirs &&
            !!score &&
            row.theirs.homeScore === score.homeScore &&
            row.theirs.awayScore === score.awayScore;
          const myExact =
            !!row.mine &&
            !!score &&
            row.mine.homeScore === score.homeScore &&
            row.mine.awayScore === score.awayScore;
          return (
            <Card key={row.match.id} className="p-3">
              {/* Match + score */}
              <div className="mb-2 flex items-center justify-center gap-2 border-b border-[var(--color-border-subtle)] pb-2 text-sm">
                <Flag code={row.match.homeFlag} team={row.match.homeTeam} className="h-4 w-6" />
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
                <Flag code={row.match.awayFlag} team={row.match.awayTeam} className="h-4 w-6" />
                {live && (
                  <Radio className="size-3 shrink-0 animate-pulse text-red-400" />
                )}
              </div>

              {/* Comparaison */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {/* Eux */}
                <div
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5",
                    row.theirs
                      ? cellClass(row.theirs.points, !!live, theirExact)
                      : "border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]"
                  )}
                >
                  <span className="truncate text-xs font-medium text-[var(--color-cream)]">
                    {isSelf ? "Toi" : data.targetName}
                  </span>
                  {row.theirs ? (
                    <span className="flex items-center gap-1.5">
                      <span className="font-[family-name:var(--font-mono)] font-bold">
                        {row.theirs.homeScore}-{row.theirs.awayScore}
                      </span>
                      {theirExact && <span title="Score exact !">⭐</span>}
                      {row.theirs.joker && <span className="text-xs">🃏</span>}
                      <PointsBadge points={row.theirs.points} live={!!live} />
                    </span>
                  ) : (
                    <ForgotMarker seed={row.match.id} />
                  )}
                </div>

                {/* Moi */}
                <div
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5",
                    row.mine
                      ? cellClass(row.mine.points, !!live, myExact)
                      : "border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]"
                  )}
                >
                  <span className="truncate text-xs font-medium text-[var(--color-cream)]">
                    {isSelf ? "—" : "Toi"}
                  </span>
                  {row.mine ? (
                    <span className="flex items-center gap-1.5">
                      <span className="font-[family-name:var(--font-mono)] font-bold">
                        {row.mine.homeScore}-{row.mine.awayScore}
                      </span>
                      {myExact && <span title="Score exact !">⭐</span>}
                      {row.mine.joker && <span className="text-xs">🃏</span>}
                      <PointsBadge points={row.mine.points} live={!!live} />
                    </span>
                  ) : isSelf ? (
                    <span className="text-xs text-[var(--color-muted)]">—</span>
                  ) : (
                    <ForgotMarker seed={"me-" + row.match.id} />
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
