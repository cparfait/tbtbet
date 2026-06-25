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

// Chaque step révèle UNE équipe ou un header
// step 1  → titre
// step 2  → header WB
// step 3  → WB M1 teamA   (la carte WB M1 apparaît avec teamB = ???)
// step 4  → WB M1 teamB
// step 5  → WB M2 teamA
// step 6  → WB M2 teamB
// step 7  → WB M3 teamA
// step 8  → WB M3 teamB
// step 9  → header LB
// step 10 → LB M1 teamA
// step 11 → LB M1 teamB
// step 12 → LB M2 teamA
// step 13 → LB M2 teamB
// step 14 → bouton fermer
const TIMINGS = [
  400,   // 1 titre
  900,   // 2 WB header
  1600,  // 3 WB M1 teamA
  2500,  // 4 WB M1 teamB
  3300,  // 5 WB M2 teamA
  4200,  // 6 WB M2 teamB
  5000,  // 7 WB M3 teamA
  5900,  // 8 WB M3 teamB
  6700,  // 9 LB header
  7400,  // 10 LB M1 teamA
  8300,  // 11 LB M1 teamB
  9100,  // 12 LB M2 teamA
  10000, // 13 LB M2 teamB
  11200, // 14 bouton fermer
];

export function TirageOverlay({ payload, onClose }: TirageOverlayProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = TIMINGS.map((t, i) => setTimeout(() => setStep(i + 1), t));
    return () => timers.forEach(clearTimeout);
  }, []);

  // WB pair i : carte visible quand step >= 3 + i*2, teamA quand idem, teamB quand step >= 4 + i*2
  // LB pair i : carte visible quand step >= 10 + i*2, teamB quand step >= 11 + i*2
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md overflow-y-auto py-8 px-4">
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
        <p className="text-5xl mb-3">🎲</p>
        <h1 className="text-3xl font-black text-white tracking-tight">Tirage au sort</h1>
        <p className="text-xs text-gray-500 mt-1.5 uppercase tracking-widest">TBT · Bracket du tournoi</p>
      </div>

      <div className="w-full max-w-sm space-y-6">
        {/* Winner Bracket */}
        <section>
          <SectionHeader label="Winner Bracket" color="#F5C400" visible={step >= 2} />
          <div className="space-y-2.5 mt-3">
            {payload.wbPairs.map((pair, i) => {
              const cardStep = 3 + i * 2;
              return (
                <PairCard
                  key={pair.label}
                  pair={pair}
                  color="#F5C400"
                  cardVisible={step >= cardStep}
                  teamAVisible={step >= cardStep}
                  teamBVisible={step >= cardStep + 1}
                />
              );
            })}
          </div>
        </section>

        {/* Loser Bracket */}
        <section>
          <SectionHeader label="Loser Bracket" color="#F97316" visible={step >= 9} />
          <div className="space-y-2.5 mt-3">
            {payload.lbPairs.map((pair, i) => {
              const cardStep = 10 + i * 2;
              return (
                <PairCard
                  key={pair.label}
                  pair={pair}
                  color="#F97316"
                  cardVisible={step >= cardStep}
                  teamAVisible={step >= cardStep}
                  teamBVisible={step >= cardStep + 1}
                />
              );
            })}
          </div>
        </section>
      </div>

      {/* CTA */}
      <div
        className={cn(
          "mt-10 transition-all duration-700",
          step >= 14 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
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
  cardVisible,
  teamAVisible,
  teamBVisible,
}: {
  pair: TiragePairData;
  color: string;
  cardVisible: boolean;
  teamAVisible: boolean;
  teamBVisible: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 border border-white/10 bg-white/5 transition-all duration-600",
        cardVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      )}
    >
      <p className="text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color }}>
        {pair.label}
      </p>
      <div className="flex items-center gap-3">
        <TeamSlot team={pair.teamA} visible={teamAVisible} color={color} />
        <span className="shrink-0 text-gray-600 font-black text-xs">VS</span>
        <TeamSlot team={pair.teamB} visible={teamBVisible} color={color} align="right" />
      </div>
    </div>
  );
}

function TeamSlot({
  team,
  visible,
  color,
  align = "left",
}: {
  team: TirageTeamData;
  visible: boolean;
  color: string;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("flex-1 flex items-center gap-2", align === "right" && "flex-row-reverse")}>
      {/* Logo */}
      <div
        className={cn(
          "size-10 rounded-lg shrink-0 overflow-hidden transition-all duration-500 flex items-center justify-center",
          visible ? "bg-transparent" : "bg-white/10 animate-pulse"
        )}
      >
        {visible ? (
          <TeamLogo url={team.logoUrl} name={team.name} className="size-full" />
        ) : (
          <span className="text-base">🎲</span>
        )}
      </div>

      {/* Nom */}
      <div className={cn("transition-all duration-400", align === "right" && "text-right")}>
        <p
          className={cn(
            "text-sm font-bold leading-tight transition-all duration-400",
            visible ? "text-white" : "text-white/25"
          )}
        >
          {visible ? team.name : "???"}
        </p>
        <p
          className={cn(
            "text-[10px] font-semibold mt-0.5 transition-all duration-400",
            visible ? "opacity-100" : "opacity-0"
          )}
          style={{ color }}
        >
          {visible ? team.seed : "—"}
        </p>
      </div>
    </div>
  );
}
