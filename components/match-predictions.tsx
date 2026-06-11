import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MatchPrediction } from "@/lib/data/matches";

/** Liste publique des pronos de tous les joueurs sur un match (après kickoff). */
export function MatchPredictions({
  predictions,
  currentUserId,
}: {
  predictions: MatchPrediction[];
  currentUserId?: string;
}) {
  if (predictions.length === 0) {
    return (
      <Card className="glass p-6 text-center">
        <p className="text-sm text-[var(--color-muted)]">
          Personne n&apos;a pronostiqué ce match. 🤷
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {predictions.map((p, i) => {
        const isMe = p.userId === currentUserId;
        return (
          <Card
            key={p.userId}
            className={cn(
              "flex items-center gap-3 p-3",
              isMe && "border-[var(--color-pitch)]/40 bg-[var(--color-pitch)]/[0.05]"
            )}
          >
            <span className="w-5 shrink-0 text-center font-[family-name:var(--font-mono)] text-xs text-[var(--color-muted)]">
              {i + 1}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">
                  {isMe ? "Toi" : p.name}
                </span>
                {p.joker && (
                  <span
                    className="rounded bg-[var(--color-gold)]/15 px-1 py-0.5 text-[9px] font-bold text-[var(--color-gold)]"
                    title="Joker ×2"
                  >
                    ×2
                  </span>
                )}
              </div>
              {p.comment && (
                <p className="mt-0.5 truncate text-xs italic text-[var(--color-muted)]">
                  « {p.comment} »
                </p>
              )}
            </div>

            {/* Score pronostiqué */}
            <span className="shrink-0 font-[family-name:var(--font-display)] text-lg font-bold tabular-nums">
              {p.homeScore}
              <span className="mx-0.5 text-[var(--color-muted)]">-</span>
              {p.awayScore}
            </span>

            {/* Points */}
            {p.points !== null && (
              <span
                className={cn(
                  "w-12 shrink-0 rounded-full px-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider",
                  p.live
                    ? "bg-red-500/15 text-red-400"
                    : p.points > 0
                      ? "bg-[var(--color-pitch)]/15 text-[var(--color-pitch-bright)]"
                      : "bg-[var(--color-surface-2)] text-[var(--color-muted)]"
                )}
              >
                {p.points > 0 ? `+${p.points}` : "0"}
                {p.live ? " prov" : " pts"}
              </span>
            )}
          </Card>
        );
      })}
    </div>
  );
}
