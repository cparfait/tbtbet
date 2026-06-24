"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trophy, Zap, Dices, Shield, User } from "lucide-react";

export function WelcomeModal({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFinish() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Entre un pseudo pour continuer."); return; }
    setSubmitting(true);
    setError(null);
    await fetch("/api/profile/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl glass-strong overflow-y-auto max-h-[90dvh] p-6 pb-10 sm:pb-6 shadow-2xl shadow-black/60">
        <div className="mb-6 text-center">
          <p className="text-3xl mb-2">⚽</p>
          <h2 className="text-xl font-bold text-[var(--color-cream)] font-[family-name:var(--font-display)]">
            Bienvenue sur TBT Bet !
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Le tournoi de babyfoot Withings — parie, grimpe, gagne.
          </p>
        </div>

        {/* Pseudo */}
        <div className="mb-5">
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted)]">
            <User className="size-3.5" />
            Ton pseudo
          </label>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null); }}
            maxLength={50}
            placeholder="Ex : Rockets FC"
            className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-4 py-2.5 text-sm text-[var(--color-cream)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-accent)]/60 focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all"
          />
          {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
          <p className="mt-1.5 text-[10px] text-[var(--color-muted)]">
            Tu pourras le changer depuis ton profil.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex gap-3 items-start rounded-xl bg-[var(--color-surface-2)] p-3">
            <Zap className="size-5 text-[var(--color-accent)] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">100 Wizz de départ</p>
              <p className="text-xs text-[var(--color-muted)]">
                Ta monnaie pour parier. Tu commences avec 100 Wizz et 2 Jokers ×2.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start rounded-xl bg-[var(--color-surface-2)] p-3">
            <Dices className="size-5 text-[var(--color-accent)] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Parie sur chaque match</p>
              <p className="text-xs text-[var(--color-muted)]">
                Choisis le vainqueur avant le match. Si tu as raison, tu gagnes (×2 en poules,
                ×3 si tu mises sur l&apos;équipe du Loser Bracket contre une du Winner).
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start rounded-xl bg-[var(--color-surface-2)] p-3">
            <Shield className="size-5 text-[var(--color-accent)] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Format du tournoi</p>
              <p className="text-xs text-[var(--color-muted)]">
                3 poules → Phase éliminatoire en double élimination (Winner + Loser Bracket) → Finale Best of 3.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start rounded-xl bg-[var(--color-surface-2)] p-3">
            <Trophy className="size-5 text-[var(--color-accent)] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Ton favori (gratuit)</p>
              <p className="text-xs text-[var(--color-muted)]">
                Pronostique l&apos;équipe victorieuse du tournoi — sans mise Wizz,
                juste pour la gloire !
              </p>
            </div>
          </div>
        </div>

        <Button onClick={handleFinish} disabled={submitting} className="w-full">
          {submitting ? "..." : "C'est parti ! 🚀"}
        </Button>
      </div>
    </div>
  );
}
