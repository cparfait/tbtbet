"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TeamLogo } from "@/components/team-logo";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  logoUrl: string | null;
}

export function ChampionPickModal({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (dismissed) return null;

  async function handleConfirm() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/champion-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: selected }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Erreur");
      }
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDismissed(true)} />

      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl glass-strong overflow-y-auto max-h-[90dvh] p-6 pb-10 sm:pb-6 shadow-2xl shadow-black/60">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-4 right-4 text-[var(--color-muted)] hover:text-[var(--color-cream)] transition-colors"
        >
          <X className="size-5" />
        </button>

        <div className="mb-5 text-center">
          <p className="text-3xl mb-2">🏆</p>
          <h2 className="text-xl font-bold text-[var(--color-cream)] font-[family-name:var(--font-display)]">
            Choisis ton champion !
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Pronostique le vainqueur du tournoi — ce choix est définitif et gratuit.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => setSelected(team.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 text-center transition-all",
                selected === team.id
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                  : "border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] hover:border-[var(--color-accent)]/40"
              )}
            >
              <TeamLogo url={team.logoUrl} name={team.name} className="size-10 rounded-lg" />
              <p className={cn(
                "text-[10px] font-semibold leading-tight",
                selected === team.id ? "text-[var(--color-accent)]" : ""
              )}>
                {team.name}
              </p>
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
        )}

        <Button
          onClick={handleConfirm}
          disabled={!selected || submitting}
          variant="gold"
          className="w-full"
        >
          {submitting ? "Enregistrement…" : selected ? "Confirmer mon choix" : "Sélectionne une équipe"}
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="mt-3 w-full text-center text-xs text-[var(--color-muted)] hover:text-[var(--color-cream)] transition-colors"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
