import { outcomeResultPoints, type OddsInput } from "@/lib/odds";

/**
 * Bloc « Points en jeu » compact : 3 colonnes (1 / Nul / 2) avec les points
 * dorés déduits des cotes 1X2. Sans drapeau — pensé pour les contextes qui
 * affichent déjà les drapeaux des équipes ailleurs (ex. hero du match mis en
 * avant). Rendu serveur (aucun état).
 */
export function OddsOutcomes({ odds }: { odds: OddsInput }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        Points en jeu
      </p>
      <div className="flex items-stretch gap-1.5">
        <OutcomePts label="1" pts={outcomeResultPoints(odds, 1)} />
        <OutcomePts label="Nul" pts={outcomeResultPoints(odds, 0)} />
        <OutcomePts label="2" pts={outcomeResultPoints(odds, -1)} />
      </div>
    </div>
  );
}

/** Mini-colonne « points en jeu » pour une issue (libellé 1/Nul/2 + points dorés). */
function OutcomePts({ label, pts }: { label: string; pts: number | null }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-lg bg-[var(--color-surface-2)] py-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </span>
      <span className="font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-[var(--color-gold)]">
        {pts ?? "—"}
        <span className="ml-0.5 text-[9px] font-semibold text-[var(--color-muted)]">
          pts
        </span>
      </span>
    </div>
  );
}
