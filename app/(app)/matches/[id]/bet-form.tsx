"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

type BetChoice = "TEAM_A" | "TEAM_B" | "DRAW";

interface ExistingBet {
  choice: BetChoice;
  amountWizz: number;
  jokerUsed: boolean;
}

interface BetFormProps {
  matchId: string;
  teamA: string;
  teamALogo?: string | null;
  teamB: string;
  teamBLogo?: string | null;
  oddsA: number;
  oddsB: number;
  oddsDraw: number;
  allowDraw: boolean;
  userWizz: number;
  jokersLeft: number;
  existingBet: ExistingBet | null;
}

export function BetForm({
  matchId,
  teamA,
  teamALogo,
  teamB,
  teamBLogo,
  oddsA,
  oddsB,
  oddsDraw,
  allowDraw,
  userWizz,
  jokersLeft,
  existingBet,
}: BetFormProps) {
  const router = useRouter();
  const [choice, setChoice] = useState<BetChoice>(existingBet?.choice ?? "TEAM_A");
  const [amount, setAmount] = useState(existingBet?.amountWizz ?? Math.min(10, userWizz));
  const [jokerUsed, setJokerUsed] = useState(existingBet?.jokerUsed ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const oddsMap: Record<BetChoice, number> = { TEAM_A: oddsA, TEAM_B: oddsB, DRAW: oddsDraw };
  const selectedOdds = oddsMap[choice];
  const effectiveOdds = selectedOdds * (jokerUsed ? 2 : 1);
  const potentialPayout = Math.round(amount * effectiveOdds);
  const potentialGain = potentialPayout - amount;

  async function handleSubmit() {
    if (amount < 1 || amount > userWizz) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, choice, amountWizz: amount, jokerUsed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Erreur lors du pari.");
      }
      setSuccess(true);
      setTimeout(() => router.refresh(), 600);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  const choices: BetChoice[] = allowDraw ? ["TEAM_A", "DRAW", "TEAM_B"] : ["TEAM_A", "TEAM_B"];

  return (
    <div className="space-y-5">
      {/* Solde */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          {existingBet ? "Modifier mon pari" : "Placer un pari"}
        </p>
        <p className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
          <Zap className="size-3.5 text-[var(--color-accent)]" />
          {userWizz} Wizz
        </p>
      </div>

      {/* Choix */}
      <div className={cn("grid gap-2", allowDraw ? "grid-cols-3" : "grid-cols-2")}>
        {choices.map((c) => {
          const label = c === "TEAM_A" ? teamA : c === "TEAM_B" ? teamB : "Nul";
          const logo = c === "TEAM_A" ? teamALogo : c === "TEAM_B" ? teamBLogo : null;
          const active = choice === c;
          return (
            <button
              key={c}
              onClick={() => setChoice(c)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border-2 py-4 text-center transition-all",
                active
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                  : "border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] hover:border-[var(--color-accent)]/40"
              )}
            >
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={label} className="size-10 object-contain rounded-lg" />
              ) : (
                <div className={cn("size-10 rounded-xl", active ? "bg-[var(--color-accent)]/20" : "bg-[var(--color-surface-1)]")} />
              )}
              <div>
                <p className={cn("text-xs font-bold px-1 leading-tight", active ? "text-[var(--color-accent)]" : "")}>
                  {label}
                </p>
                <p className={cn("text-sm font-black mt-0.5", active ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]")}>
                  ×{oddsMap[c]}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mise — slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-[var(--color-muted)]">Mise</label>
          <span className="text-base font-black text-[var(--color-cream)]">{amount} Wizz</span>
        </div>
        <input
          type="range"
          min={1}
          max={userWizz}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full accent-[var(--color-accent)] h-2 cursor-pointer"
        />
        <div className="flex justify-between mt-1 text-[10px] text-[var(--color-muted)]">
          <span>1</span>
          <span>{userWizz} max</span>
        </div>
      </div>

      {/* Joker */}
      {jokersLeft > 0 && (
        <button
          onClick={() => setJokerUsed(!jokerUsed)}
          className={cn(
            "w-full flex items-center justify-between rounded-xl border-2 px-4 py-3 text-sm transition-all",
            jokerUsed
              ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
              : "border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]"
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🃏</span>
            <div className="text-left">
              <p className={cn("text-sm font-semibold", jokerUsed ? "text-[var(--color-accent)]" : "")}>
                Joker ×2
              </p>
              <p className="text-[10px] text-[var(--color-muted)]">
                {jokersLeft} restant{jokersLeft > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className={cn("h-5 w-9 rounded-full relative shrink-0 transition-colors", jokerUsed ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-subtle)]")}>
            <div className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform", jokerUsed ? "translate-x-4" : "translate-x-0.5")} />
          </div>
        </button>
      )}

      {/* Gain potentiel */}
      <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface-2)] px-4 py-3">
        <div>
          <p className="text-xs text-[var(--color-muted)]">Gain potentiel</p>
          <p className="text-2xl font-black text-[var(--color-accent)]">+{potentialGain} Wizz</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[var(--color-muted)]">cote ×{effectiveOdds}</p>
          <p className="text-sm font-semibold">{potentialPayout} récupérés</p>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || success || amount < 1 || amount > userWizz}
        className={cn(
          "w-full rounded-2xl py-4 text-base font-black transition-all",
          success
            ? "bg-green-500 text-white"
            : "bg-[var(--color-accent)] text-black hover:brightness-110 disabled:opacity-40"
        )}
      >
        {success ? "✓ Pari enregistré !" : submitting ? "Envoi…" : existingBet ? "Modifier le pari" : `Parier ${amount} Wizz`}
      </button>
    </div>
  );
}
