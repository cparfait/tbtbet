"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { BetForm } from "./[id]/bet-form";
import { ChevronRight, ChevronDown, CalendarDays, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getOddsForTeam, getOddsForDraw } from "@/lib/odds";
import type { MatchPhase, BracketSource } from "@/lib/generated/prisma";

// ── Types ──────────────────────────────────────────────────────────────────

interface MatchTeam {
  name: string;
  logoUrl: string | null;
  wins: number;
  pool?: { id: string; name: string; color: string } | null;
}

export interface MatchForList {
  id: string;
  phase: MatchPhase;
  teamASource: BracketSource;
  teamBSource: BracketSource;
  teamA: MatchTeam;
  teamB: MatchTeam;
  label: string | null;
  status: string;
  scoreA: number | null;
  scoreB: number | null;
  result: string | null;
  scheduledAt: Date | string | null;
  bettingClosesAt: Date | string | null;
}

export interface BetForMap {
  matchId: string;
  choice: "TEAM_A" | "TEAM_B" | "DRAW";
  amountWizz: number;
  jokerUsed: boolean;
  settled: boolean;
  payout: number | null;
}

interface Props {
  upcoming: MatchForList[];
  finished: MatchForList[];
  betMap: Record<string, BetForMap>;
  userWizz: number;
  jokersLeft: number;
}

// ── Constantes ─────────────────────────────────────────────────────────────

const PHASE_ORDER = ["POOL", "WINNER_BRACKET", "LOSER_BRACKET", "FINAL_SERIES"] as const;

const PHASE_LABEL: Record<string, string> = {
  POOL: "Phase de poules",
  WINNER_BRACKET: "Winner Bracket",
  LOSER_BRACKET: "Loser Bracket",
  FINAL_SERIES: "Finale (BO3)",
};

const SOURCE_LABEL: Record<string, string> = {
  POOL: "Poule",
  WINNER_BRACKET: "Winner",
  LOSER_BRACKET: "Loser",
};

// Helpers couleur de poule (hex depuis la DB)
function poolBadgeStyle(color: string) {
  return { background: color + "25", color };
}
function poolBorderStyle(color: string) {
  return { borderLeftColor: color };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: Date | string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-FR", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function groupByPhase(list: MatchForList[]) {
  const map = new Map<string, MatchForList[]>();
  for (const m of list) {
    if (!map.has(m.phase)) map.set(m.phase, []);
    map.get(m.phase)!.push(m);
  }
  return map;
}

// ── Sous-composant : logo d'équipe ─────────────────────────────────────────

function TeamLogo({ url, name, size = "sm" }: { url: string | null; name: string; size?: "sm" | "md" }) {
  const cls = size === "md" ? "size-9 rounded-lg" : "size-7 rounded-md";
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} className={cn(cls, "object-contain shrink-0")} />
    );
  }
  return (
    <div className={cn(cls, "shrink-0 bg-[var(--color-surface-2)] flex items-center justify-center")}>
      <span className="text-[8px] font-bold text-[var(--color-muted)] uppercase leading-none text-center px-0.5">
        {name.slice(0, 2)}
      </span>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────

export function MatchesClient({ upcoming, finished, betMap, userWizz, jokersLeft }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);

  // Poules uniques triées alphabétiquement (pour les filtres)
  const pools = useMemo(() => {
    const seen = new Map<string, { name: string; color: string }>();
    for (const m of [...upcoming, ...finished]) {
      const pool = m.teamA.pool;
      if (m.phase === "POOL" && pool && !seen.has(pool.id)) {
        seen.set(pool.id, { name: pool.name, color: pool.color });
      }
    }
    return Array.from(seen.entries())
      .map(([id, { name, color }]) => ({ id, name, color }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [upcoming, finished]);

  const upcomingByPhase = groupByPhase(upcoming);
  const finishedByPhase = groupByPhase(finished);

  function toggle(matchId: string) {
    setExpandedId((prev) => (prev === matchId ? null : matchId));
  }

  function filterByPool(matches: MatchForList[]) {
    if (!selectedPool) return matches;
    return matches.filter((m) => m.teamA.pool?.id === selectedPool);
  }

  // ── Filtre poules ─────────────────────────────────────────────────────────
  const PoolFilter = pools.length > 1 ? (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
      <button
        onClick={() => setSelectedPool(null)}
        className={cn(
          "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
          !selectedPool
            ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
            : "bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-cream)]"
        )}
      >
        Toutes
      </button>
      {pools.map(({ id, name, color }) => {
        const active = selectedPool === id;
        return (
          <button
            key={id}
            onClick={() => setSelectedPool(active ? null : id)}
            className="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all"
            style={active ? poolBadgeStyle(color) : undefined}
          >
            {name}
          </button>
        );
      })}
    </div>
  ) : null;

  // ── Carte match à venir ───────────────────────────────────────────────────
  function UpcomingCard({ match }: { match: MatchForList }) {
    const oddsA = getOddsForTeam(match.phase, match.teamASource, match.teamBSource, match.teamA.wins);
    const oddsB = getOddsForTeam(match.phase, match.teamBSource, match.teamASource, match.teamB.wins);
    const oddsDraw = getOddsForDraw();
    const allowDraw = match.phase === "POOL";
    const bet = betMap[match.id];
    const betChoice = bet?.choice === "TEAM_A" ? match.teamA.name
      : bet?.choice === "TEAM_B" ? match.teamB.name
      : bet?.choice === "DRAW" ? "Égalité" : null;
    const isClosed = match.bettingClosesAt != null && new Date(match.bettingClosesAt) <= new Date();
    const canBet = !isClosed;
    const isExpanded = expandedId === match.id;
    const pool = match.teamA.pool;

    return (
      <div>
        <Card
          className={cn(
            "overflow-hidden transition-colors",
            match.phase === "POOL" && pool ? "border-l-4" : "",
            canBet ? "cursor-pointer hover:border-[var(--color-accent)]/30" : "",
            isExpanded ? "border-[var(--color-accent)]/40 rounded-b-none" : ""
          )}
          style={match.phase === "POOL" && pool ? poolBorderStyle(pool.color) : undefined}
          onClick={() => canBet && toggle(match.id)}
        >
          <div className="p-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-2.5 gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {pool && (
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold"
                    style={poolBadgeStyle(pool.color)}>
                    {pool.name}
                  </span>
                )}
                <span className="text-[10px] text-[var(--color-muted)] truncate">{match.label}</span>
                {match.status === "LIVE" && (
                  <span className="flex shrink-0 items-center gap-1 text-[9px] text-red-400">
                    <span className="size-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                  </span>
                )}
              </div>
              {/* CTA / badge pari */}
              {betChoice ? (
                <span
                  className="shrink-0 flex items-center gap-1 rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-[9px] font-medium text-[var(--color-accent)]"
                  onClick={(e) => { e.stopPropagation(); if (canBet) toggle(match.id); }}
                >
                  ✓ {betChoice}
                  {canBet && <ChevronDown className={cn("size-3 transition-transform", isExpanded ? "" : "-rotate-90")} />}
                </span>
              ) : isClosed ? (
                <span className="shrink-0 text-[9px] text-[var(--color-muted)]">Fermé</span>
              ) : (
                <span className="shrink-0 flex items-center gap-0.5 text-[9px] text-[var(--color-accent)]">
                  {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                  Parier
                </span>
              )}
            </div>

            {/* Équipes avec logos — masqué quand le formulaire est ouvert (les logos y sont déjà) */}
            {!isExpanded && (
              <div className="flex items-center gap-1">
                {/* Team A */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <TeamLogo url={match.teamA.logoUrl} name={match.teamA.name} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate leading-tight">{match.teamA.name}</p>
                    <p className="text-[10px] font-bold text-[var(--color-accent)]">×{oddsA}</p>
                  </div>
                </div>

                {/* Centre VS + date */}
                <div className="shrink-0 text-center px-1 w-16">
                  <p className="text-[11px] font-black text-[var(--color-muted)]">VS</p>
                  {match.scheduledAt && (
                    <p className="text-[8px] text-[var(--color-muted)] leading-tight mt-0.5">
                      {formatDate(match.scheduledAt)}
                    </p>
                  )}
                </div>

                {/* Team B */}
                <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
                  <div className="min-w-0 text-right">
                    <p className="text-sm font-semibold truncate leading-tight">{match.teamB.name}</p>
                    <p className="text-[10px] font-bold text-[var(--color-accent)]">×{oddsB}</p>
                  </div>
                  <TeamLogo url={match.teamB.logoUrl} name={match.teamB.name} size="md" />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Formulaire inline */}
        {isExpanded && canBet && (
          <div className="rounded-b-xl border border-t-0 border-[var(--color-accent)]/40 bg-[var(--color-surface-1)] px-4 py-5">
            <BetForm
              matchId={match.id}
              teamA={match.teamA.name}
              teamALogo={match.teamA.logoUrl}
              teamB={match.teamB.name}
              teamBLogo={match.teamB.logoUrl}
              oddsA={oddsA}
              oddsB={oddsB}
              oddsDraw={oddsDraw}
              allowDraw={allowDraw}
              userWizz={userWizz}
              jokersLeft={jokersLeft}
              existingBet={bet ? { choice: bet.choice, amountWizz: bet.amountWizz, jokerUsed: bet.jokerUsed } : null}
            />
          </div>
        )}
      </div>
    );
  }

  // ── Carte résultat ────────────────────────────────────────────────────────
  function FinishedCard({ match }: { match: MatchForList }) {
    const bet = betMap[match.id];
    const betWon = bet?.settled && bet.payout != null && bet.payout > 0;
    const betLost = bet?.settled && bet.payout != null && bet.payout === 0;
    const pool = match.teamA.pool;

    return (
      <Link href={`/matches/${match.id}`}>
        <Card
          className={cn("p-3 overflow-hidden", match.phase === "POOL" && pool ? "border-l-4" : "")}
          style={match.phase === "POOL" && pool ? poolBorderStyle(pool.color) : undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              {pool && (
                <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                  style={poolBadgeStyle(pool.color)}>
                  {pool.name}
                </span>
              )}
              <span className="text-[10px] text-[var(--color-muted)]">{match.label}</span>
            </div>
            {betWon && (
              <span className="text-[9px] font-semibold text-green-400">
                +{(bet!.payout ?? 0) - bet!.amountWizz} Wizz
              </span>
            )}
            {betLost && (
              <span className="text-[9px] font-semibold text-red-400">
                -{bet!.amountWizz} Wizz
              </span>
            )}
          </div>

          {/* Score + équipes avec logos */}
          <div className="flex items-center gap-1">
            {/* Team A */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <TeamLogo url={match.teamA.logoUrl} name={match.teamA.name} />
              <span className={cn(
                "text-sm font-semibold truncate",
                match.result === "TEAM_A" ? "text-[var(--color-accent)]" : "text-[var(--color-cream)]"
              )}>
                {match.teamA.name}
              </span>
            </div>

            {/* Score */}
            <span className="shrink-0 px-2 text-base font-black tabular-nums">
              {match.scoreA}&nbsp;–&nbsp;{match.scoreB}
            </span>

            {/* Team B */}
            <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
              <span className={cn(
                "text-sm font-semibold truncate text-right",
                match.result === "TEAM_B" ? "text-[var(--color-accent)]" : "text-[var(--color-cream)]"
              )}>
                {match.teamB.name}
              </span>
              <TeamLogo url={match.teamB.logoUrl} name={match.teamB.name} />
            </div>
          </div>

          {match.result === "DRAW" && (
            <p className="text-[10px] text-[var(--color-muted)] text-center mt-1">Match nul</p>
          )}
        </Card>
      </Link>
    );
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── À VENIR ── */}
      {upcoming.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            <CalendarDays className="size-4" /> À venir
          </h2>

          {PoolFilter}

          {PHASE_ORDER.map((phase) => {
            const raw = upcomingByPhase.get(phase);
            if (!raw?.length) return null;
            const phaseMatches = phase === "POOL" ? filterByPool(raw) : raw;
            if (!phaseMatches.length) return null;

            return (
              <div key={phase}>
                <h3 className="mb-2 text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest">
                  {PHASE_LABEL[phase]}
                </h3>
                <div className="space-y-2">
                  {phaseMatches.map((match) => <UpcomingCard key={match.id} match={match} />)}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {upcoming.length === 0 && finished.length === 0 && (
        <Card className="p-8 text-center text-sm text-[var(--color-muted)]">
          Aucun match programmé.
        </Card>
      )}

      {/* ── RÉSULTATS ── */}
      {finished.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            <CheckCircle2 className="size-4" /> Résultats
          </h2>

          {pools.length > 1 && PoolFilter}

          {PHASE_ORDER.map((phase) => {
            const raw = finishedByPhase.get(phase);
            if (!raw?.length) return null;
            const phaseMatches = phase === "POOL" ? filterByPool(raw) : raw;
            if (!phaseMatches.length) return null;

            return (
              <div key={phase}>
                <h3 className="mb-2 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-widest">
                  {PHASE_LABEL[phase]}
                </h3>
                <div className="space-y-2">
                  {phaseMatches.map((match) => <FinishedCard key={match.id} match={match} />)}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
