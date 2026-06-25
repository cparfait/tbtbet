"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { TeamLogo } from "@/components/team-logo";
import { X } from "lucide-react";

export interface TirageTeamData {
  id: string;
  name: string;
  logoUrl: string | null;
  seed: string;
}

export interface TiragePairData {
  label: string;
  teamA: TirageTeamData;
  teamB: TirageTeamData;
}

export interface TiragePayload {
  wbPairs: TiragePairData[];
  lbPairs: TiragePairData[];
}

interface TirageOverlayProps {
  payload: TiragePayload;
  onClose: () => void;
}

// Timings (ms) pour chaque step
//  1 → titre
//  2 → header WB
//  3 → WB paire 1
//  4 → WB paire 2
//  5 → WB paire 3
//  6 → header LB
//  7 → LB paire 1
//  8 → LB paire 2
//  9 → bouton fermer
const TIMINGS = [400, 1000, 1900, 2800, 3700, 4500, 5300, 6200, 7400];

export function TirageOverlay({ payload, onClose }: TirageOverlayProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = TIMINGS.map((t, i) => setTimeout(() => setStep(i + 1), t));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md overflow-y-auto py-8 px-4">
      {/* Fermeture anticipée */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        aria-label="Fermer"
      >
        <X className="size-5" />
      </button>

      {/* Titre */}
      <div
        className={cn(
          "text-center mb-8 transition-all duration-700",
          step >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        )}
      >
        <p className="text-5xl mb-3 animate-bounce">🎲</p>
        <h1 className="text-3xl font-black text-white tracking-tight">Tirage au sort</h1>
        <p className="text-xs text-gray-500 mt-1.5 uppercase tracking-widest">TBT · Bracket du tournoi</p>
      </div>

      <div className="w-full max-w-sm space-y-6">
        {/* Winner Bracket */}
        <section>
          <SectionHeader label="Winner Bracket" color="#F5C400" visible={step >= 2} />
          <div className="space-y-2.5 mt-3">
            {payload.wbPairs.map((pair, i) => (
              <PairCard key={pair.label} pair={pair} color="#F5C400" visible={step >= i + 3} index={i} />
            ))}
          </div>
        </section>

        {/* Loser Bracket */}
        <section>
          <SectionHeader label="Loser Bracket" color="#F97316" visible={step >= 6} />
          <div className="space-y-2.5 mt-3">
            {payload.lbPairs.map((pair, i) => (
              <PairCard key={pair.label} pair={pair} color="#F97316" visible={step >= i + 7} index={i} />
            ))}
          </div>
        </section>
      </div>

      {/* CTA */}
      <div
        className={cn(
          "mt-10 transition-all duration-700",
          step >= 9 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <button
          onClick={onClose}
          className="bg-[var(--color-accent)] text-black font-bold px-8 py-3 rounded-full text-sm hover:opacity-90 transition-opacity"
        >
          Voir le bracket →
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ label, color, visible }: { label: string; color: string; visible: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 transition-all duration-500",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="h-px flex-1" style={{ background: `${color}50` }} />
      <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: `${color}50` }} />
    </div>
  );
}

function PairCard({
  pair,
  color,
  visible,
  index,
}: {
  pair: TiragePairData;
  color: string;
  visible: boolean;
  index: number;
}) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 border border-white/10 bg-white/5 transition-all",
        visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-95"
      )}
      style={{ transitionDuration: "600ms", transitionDelay: visible ? `${index * 60}ms` : "0ms" }}
    >
      <p className="text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color }}>
        {pair.label}
      </p>
      <div className="flex items-center gap-3">
        <TeamSlot team={pair.teamA} color={color} />
        <span className="shrink-0 text-gray-600 font-black text-xs">VS</span>
        <TeamSlot team={pair.teamB} color={color} align="right" />
      </div>
    </div>
  );
}

function TeamSlot({
  team,
  color,
  align = "left",
}: {
  team: TirageTeamData;
  color: string;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("flex-1 flex items-center gap-2", align === "right" && "flex-row-reverse")}>
      <TeamLogo url={team.logoUrl} name={team.name} className="size-10 rounded-lg shrink-0" />
      <div className={cn(align === "right" && "text-right")}>
        <p className="text-sm font-bold text-white leading-tight">{team.name}</p>
        <p className="text-[10px] font-semibold mt-0.5" style={{ color }}>
          {team.seed}
        </p>
      </div>
    </div>
  );
}
