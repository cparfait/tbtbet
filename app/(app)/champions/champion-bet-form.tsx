"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Team {
  id: string;
  name: string;
  logoUrl?: string | null;
}

interface ChampionBetFormProps {
  teams: Team[];
}

export function ChampionBetForm({ teams }: ChampionBetFormProps) {
  const router = useRouter();
  const [teamId, setTeamId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTeam = teams.find((t) => t.id === teamId);

  function handleValidate() {
    if (!teamId) { setError("Choisis une équipe d'abord."); return; }
    setError(null);
    setConfirming(true);
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/champion-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, jokerUsed: false }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Erreur lors du pari.");
      }
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirming) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-300">Ce choix est définitif</p>
              <p className="text-xs text-orange-200/70 mt-1">
                Une fois confirmé, tu ne pourras plus changer ton équipe favorite.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-2)] px-4 py-3">
          {selectedTeam?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selectedTeam.logoUrl} alt={selectedTeam.name} className="size-10 rounded-lg object-contain" />
          ) : (
            <div className="size-10 rounded-lg bg-[var(--color-surface-1)]" />
          )}
          <div>
            <p className="text-[10px] text-[var(--color-muted)]">Ton choix</p>
            <p className="text-base font-bold">{selectedTeam?.name}</p>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={() => setConfirming(false)}
            className="flex-1 rounded-xl border border-[var(--color-border-subtle)] py-3 text-sm text-[var(--color-muted)] hover:text-[var(--color-cream)]"
          >
            Annuler
          </button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 py-3 text-sm"
          >
            {submitting ? "Envoi…" : "Confirmer définitivement"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-[var(--color-muted)]">Équipe</label>
        <select
          value={teamId}
          onChange={(e) => { setTeamId(e.target.value); setError(null); }}
          className="mt-1 w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
        >
          <option value="">-- Choisir une équipe --</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button onClick={handleValidate} disabled={!teamId} className="w-full">
        Choisir cette équipe
      </Button>
    </div>
  );
}
