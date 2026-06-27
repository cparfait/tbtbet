"use client";

import { useState, useMemo } from "react";
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
  isAdmin: boolean;
  externalStep?: number; // viewer mode : step piloté depuis l'extérieur
  onStepChange?: (step: number) => void; // admin mode : appelé à chaque avancement
  onClose: () => void;
}

// Calcule les seuils de step dynamiquement depuis le payload.
// step 0  → état initial (rien de visible)
// step 1  → titre
// step 2  → header WB  (si wbPairs.length > 0, sinon header LB)
// steps 3..2+2*wbN  → WB pairs (2 steps par paire : teamA puis teamB)
// step 3+2*wbN      → header LB  (si lbPairs.length > 0)
// steps 4+2*wbN..   → LB pairs (2 steps par paire)
// MAX_STEP           → bouton fermer
function computeSteps(payload: TiragePayload) {
  const wbN = payload.wbPairs.length;
  const lbN = payload.lbPairs.length;

  const hasWB = wbN > 0;
  const hasLB = lbN > 0;

  // WB
  const WB_HEADER = hasWB ? 2 : -1;
  const WB_PAIR_BASE = hasWB ? 3 : 0; // cardStep = WB_PAIR_BASE + i*2

  // LB header vient juste après toutes les paires WB
  const LB_HEADER = hasLB ? (hasWB ? 3 + wbN * 2 : 2) : -1;

  // LB pairs commencent après le header LB (ou après WB si pas de LB header)
  const LB_PAIR_BASE = hasLB ? LB_HEADER + 1 : 0;

  // Dernier step = bouton fermer
  let MAX_STEP = 1; // au minimum le titre
  if (hasWB) MAX_STEP = WB_PAIR_BASE + wbN * 2;
  if (hasLB) MAX_STEP = LB_PAIR_BASE + lbN * 2;

  return { WB_HEADER, WB_PAIR_BASE, LB_HEADER, LB_PAIR_BASE, MAX_STEP };
}

export function TirageOverlay({ payload, isAdmin, externalStep, onStepChange, onClose }: TirageOverlayProps) {
  const steps = useMemo(() => computeSteps(payload), [payload]);
  const { WB_HEADER, WB_PAIR_BASE, LB_HEADER, LB_PAIR_BASE, MAX_STEP } = steps;

  const [localStep, setLocalStep] = useState(0);

  // En mode viewer, le step est piloté par l'admin via externalStep
  const step = isAdmin ? localStep : (externalStep ?? 0);

  const advance = () => {
    if (!isAdmin) return;
    const next = Math.min(localStep + 1, MAX_STEP);
    setLocalStep(next);
    onStepChange?.(next);
  };

  const handleOverlayClick = () => {
    if (isAdmin && localStep < MAX_STEP) advance();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md overflow-y-auto py-8 px-4"
      onClick={isAdmin ? handleOverlayClick : undefined}
      style={{ cursor: isAdmin && step < MAX_STEP ? "pointer" : "default" }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
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
        {payload.wbPairs.length > 0 && (
          <section>
            <SectionHeader label="Winner Bracket" color="#F5C400" visible={step >= WB_HEADER} />
            <div className="space-y-2.5 mt-3">
              {payload.wbPairs.map((pair, i) => {
                const cardStep = WB_PAIR_BASE + i * 2;
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
        )}

        {/* Loser Bracket */}
        {payload.lbPairs.length > 0 && (
          <section>
            <SectionHeader label="Loser Bracket" color="#F97316" visible={step >= LB_HEADER} />
            <div className="space-y-2.5 mt-3">
              {payload.lbPairs.map((pair, i) => {
                const cardStep = LB_PAIR_BASE + i * 2;
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
        )}
      </div>

      {/* Indicateur — admin : cliquer pour révéler / viewer : en attente */}
      <div
        className={cn(
          "mt-8 transition-all duration-500",
          step < MAX_STEP ? "opacity-60" : "opacity-0 pointer-events-none"
        )}
      >
        <p className="text-xs text-gray-400 uppercase tracking-widest animate-pulse">
          {isAdmin ? "Cliquez pour révéler" : "Tirage en cours…"}
        </p>
      </div>

      {/* CTA fin */}
      <div
        className={cn(
          "mt-4 transition-all duration-700",
          step >= MAX_STEP ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="bg-[var(--color-accent)] text-black font-bold px-8 py-3 rounded-full text-sm hover:opacity-90 transition-opacity"
        >
          Retour à l&apos;application →
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
        {team.seed && (
          <p
            className={cn(
              "text-[10px] font-semibold mt-0.5 transition-all duration-400",
              visible ? "opacity-100" : "opacity-0"
            )}
            style={{ color }}
          >
            {visible ? team.seed : "—"}
          </p>
        )}
      </div>
    </div>
  );
}
