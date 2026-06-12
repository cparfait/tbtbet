import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CountdownTimer } from "./countdown-timer";
import { Card } from "./ui/card";
import { Flag } from "./flag";
import { cn, formatKickoffTime } from "@/lib/utils";
import { STAGE_LABELS, type Match } from "@/lib/data/matches";

type Props = {
  match: Match;
  /** Pronostic de l'utilisateur courant, si déjà soumis. */
  prediction?: { homeScore: number; awayScore: number; joker?: boolean };
};

function TeamRow({
  flag,
  name,
  score,
  align = "left",
}: {
  flag: string;
  name: string;
  score?: number;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex flex-1 items-center gap-2",
        align === "right" && "flex-row-reverse text-right"
      )}
    >
      <Flag code={flag} className="h-5 w-7" />
      <span className="truncate font-medium">{name}</span>
      {score !== undefined && (
        <span className="ml-auto font-[family-name:var(--font-display)] text-xl font-bold tabular-nums">
          {score}
        </span>
      )}
    </div>
  );
}

export function MatchCard({ match, prediction }: Props) {
  const finished = match.result?.status === "FINISHED";
  const group = match.group ? `Groupe ${match.group}` : STAGE_LABELS[match.stage];

  return (
    <Link href={`/matches/${match.id}`} className="block">
      <Card className="p-4 transition-colors hover:border-[var(--color-pitch)]/40">
        <div className="mb-3 flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span className="font-[family-name:var(--font-mono)]">
            {group}
            <span className="ml-2 text-[var(--color-cream)]/70">
              {formatKickoffTime(match.kickoffAt)}
            </span>
          </span>
          {finished ? (
            <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Terminé
            </span>
          ) : (
            <CountdownTimer target={match.kickoffAt} />
          )}
        </div>

        <div className="flex items-center gap-3">
          <TeamRow
            flag={match.homeFlag}
            name={match.homeTeam}
            score={finished ? match.result?.homeScore : undefined}
          />
          <span className="font-[family-name:var(--font-display)] text-sm font-bold text-[var(--color-muted)]">
            {finished ? "" : "VS"}
          </span>
          <TeamRow
            flag={match.awayFlag}
            name={match.awayTeam}
            score={finished ? match.result?.awayScore : undefined}
            align="right"
          />
          <ChevronRight className="size-4 shrink-0 text-[var(--color-muted)]" />
        </div>

        {prediction && (
          <div className="mt-3 flex items-center gap-2 border-t border-[var(--color-border-subtle)] pt-2 text-xs">
            <span className="text-[var(--color-muted)]">Ton prono</span>
            <span className="font-[family-name:var(--font-mono)] font-semibold text-[var(--color-gold)]">
              {prediction.homeScore} – {prediction.awayScore}
            </span>
            {prediction.joker && (
              <span className="rounded bg-[var(--color-gold)]/15 px-1.5 py-0.5 font-semibold text-[var(--color-gold)]">
                JOKER ×2
              </span>
            )}
          </div>
        )}
      </Card>
    </Link>
  );
}
