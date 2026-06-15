"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Minus,
  Plus,
  Check,
  Loader2,
  Lock,
  ChevronRight,
  Radio,
  MessageSquarePlus,
} from "lucide-react";
import { CountdownTimer } from "./countdown-timer";
import { Card } from "./ui/card";
import { Flag } from "./flag";
import { cn, formatKickoffTime } from "@/lib/utils";
import { computePoints } from "@/lib/scoring";
import { outcomeResultPoints } from "@/lib/odds";
import { STAGE_LABELS, type Match } from "@/lib/data/matches";

type Props = {
  match: Match;
  prediction?: {
    homeScore: number;
    awayScore: number;
    joker: boolean;
    comment?: string;
  };
  jokersLeft: number;
  jokerBudget: number;
};

function ScoreStepper({
  flag,
  name,
  value,
  onChange,
  disabled,
}: {
  flag: string;
  name: string;
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <Flag code={flag} className="h-5 w-7 shrink-0" />
        <span className="truncate text-sm font-medium">{name}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label={`Moins ${name}`}
          disabled={disabled || value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex size-7 items-center justify-center rounded-full bg-[var(--color-surface-2)] disabled:opacity-30"
        >
          <Minus className="size-3.5" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          aria-label={`Score ${name}`}
          disabled={disabled}
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
            onChange(Number.isNaN(n) ? 0 : Math.min(20, n));
          }}
          className="w-6 bg-transparent text-center font-[family-name:var(--font-display)] text-xl font-bold tabular-nums outline-none disabled:opacity-60"
        />
        <button
          type="button"
          aria-label={`Plus ${name}`}
          disabled={disabled || value >= 20}
          onClick={() => onChange(Math.min(20, value + 1))}
          className="flex size-7 items-center justify-center rounded-full bg-[var(--color-surface-2)] disabled:opacity-30"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function MatchCardInteractive({
  match,
  prediction,
  jokersLeft,
  jokerBudget,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [home, setHome] = useState(prediction?.homeScore ?? 0);
  const [away, setAway] = useState(prediction?.awayScore ?? 0);
  const [joker, setJoker] = useState(prediction?.joker ?? false);
  const [comment, setComment] = useState(prediction?.comment ?? "");
  const [showComment, setShowComment] = useState(!!prediction?.comment);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finished = match.result?.status === "FINISHED";
  const live = match.live;
  const locked = Date.now() >= new Date(match.kickoffAt).getTime();
  const readOnly = finished || locked || !!live;
  const group = match.group ? `Groupe ${match.group}` : STAGE_LABELS[match.stage];
  const canUseJoker = jokersLeft > 0 || joker;

  // Points (réels si terminé, provisoires si en cours) du prono de l'utilisateur.
  const refScore = finished ? match.result : live;
  const userPoints =
    refScore && prediction
      ? computePoints(
          { homeScore: prediction.homeScore, awayScore: prediction.awayScore },
          { homeScore: refScore.homeScore, awayScore: refScore.awayScore },
          prediction.joker,
          match.odds
        ).points
      : null;

  const dirty =
    home !== (prediction?.homeScore ?? 0) ||
    away !== (prediction?.awayScore ?? 0) ||
    joker !== (prediction?.joker ?? false) ||
    comment.trim() !== (prediction?.comment ?? "");

  const save = () =>
    start(async () => {
      setError(null);
      try {
        const res = await fetch("/api/predictions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId: match.id,
            homeScore: home,
            awayScore: away,
            joker,
            comment: comment.trim() || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Échec");
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      }
    });

  return (
    <Card className="p-4">
      {/* En-tête : phase + compte à rebours / statut */}
      <div className="mb-3 flex items-center justify-between text-xs text-[var(--color-muted)]">
        <span className="font-[family-name:var(--font-mono)]">
          {group}
          <span className="ml-2 text-[var(--color-cream)]/70">
            {formatKickoffTime(match.kickoffAt)}
          </span>
        </span>
        {finished ? (
          <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 font-semibold uppercase tracking-wider">
            Terminé
          </span>
        ) : live ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 font-bold uppercase tracking-wider text-red-400">
            <Radio className="size-3 animate-pulse" /> En direct
          </span>
        ) : locked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 font-bold uppercase tracking-wider text-red-400">
            <Radio className="size-3 animate-pulse" /> En cours
          </span>
        ) : (
          <CountdownTimer target={match.kickoffAt} />
        )}
      </div>

      {readOnly ? (
        /* ── Lecture seule : score (final/live) + prono + points ── */
        <div className="space-y-2">
          <ReadOnlyRow
            flag={match.homeFlag}
            name={match.homeTeam}
            score={refScore?.homeScore}
            live={!!live}
          />
          <ReadOnlyRow
            flag={match.awayFlag}
            name={match.awayTeam}
            score={refScore?.awayScore}
            live={!!live}
          />
          <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-2 text-xs">
            {prediction ? (
              <span className="flex items-center gap-1.5 text-[var(--color-muted)]">
                <span>
                  Prono :{" "}
                  <span className="font-[family-name:var(--font-mono)] font-semibold text-[var(--color-gold)]">
                    {prediction.homeScore} – {prediction.awayScore}
                  </span>
                  {prediction.joker && (
                    <span className="ml-1.5 rounded bg-[var(--color-gold)]/15 px-1.5 py-0.5 font-semibold text-[var(--color-gold)]">
                      ×2
                    </span>
                  )}
                </span>
                {userPoints !== null && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 font-bold",
                      live
                        ? "bg-red-500/15 text-red-400"
                        : userPoints > 0
                          ? "bg-[var(--color-pitch)]/15 text-[var(--color-pitch-bright)]"
                          : "bg-[var(--color-surface-2)] text-[var(--color-muted)]"
                    )}
                  >
                    {live ? `${userPoints} pt prov.` : `+${userPoints} pts`}
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[var(--color-muted)]">
                <Lock className="size-3" /> Pas de prono
              </span>
            )}
            <Link
              href={`/matches/${match.id}`}
              className="flex shrink-0 items-center gap-0.5 text-[var(--color-muted)] hover:text-[var(--color-cream)]"
            >
              Détails <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        /* ── Pronostic inline ── */
        <div className="space-y-2.5">
          {match.odds && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Points en jeu
              </p>
              <div className="flex items-stretch gap-1.5">
                <OutcomePts flag={match.homeFlag} pts={outcomeResultPoints(match.odds, 1)} />
                <OutcomePts label="Nul" pts={outcomeResultPoints(match.odds, 0)} />
                <OutcomePts flag={match.awayFlag} pts={outcomeResultPoints(match.odds, -1)} />
              </div>
            </div>
          )}

          <ScoreStepper
            flag={match.homeFlag}
            name={match.homeTeam}
            value={home}
            onChange={setHome}
            disabled={pending}
          />
          <ScoreStepper
            flag={match.awayFlag}
            name={match.awayTeam}
            value={away}
            onChange={setAway}
            disabled={pending}
          />

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              disabled={!canUseJoker || pending}
              onClick={() => setJoker((j) => !j)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                joker
                  ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                  : "border-[var(--color-border-subtle)] text-[var(--color-muted)]",
                !canUseJoker && "cursor-not-allowed opacity-40"
              )}
              title={
                canUseJoker
                  ? `${jokersLeft}/${jokerBudget} jokers restants`
                  : "Budget de jokers épuisé"
              }
            >
              🃏 Joker ×2
            </button>

            <button
              type="button"
              onClick={save}
              disabled={pending || (!dirty && !!prediction)}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-pitch)] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-pitch-bright)] disabled:opacity-40"
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : saved ? (
                <Check className="size-3.5" />
              ) : null}
              {saved
                ? "Enregistré"
                : prediction
                  ? "Modifier"
                  : "Valider"}
            </button>
          </div>

          {/* Commentaire (optionnel, visible des autres après le coup d'envoi) */}
          {showComment ? (
            <textarea
              ref={commentRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={280}
              disabled={pending}
              placeholder="Un petit tacle pour tes potes ? (visible après le coup d'envoi)"
              className="h-16 w-full resize-none rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-2.5 text-xs outline-none focus:border-[var(--color-pitch)]"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowComment(true);
                // Focus seulement sur action volontaire (pas au montage si un
                // commentaire existe déjà → évite que la liste saute dessus).
                requestAnimationFrame(() => commentRef.current?.focus());
              }}
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-muted)] transition-colors hover:border-[var(--color-pitch)] hover:text-[var(--color-cream)]"
            >
              <MessageSquarePlus className="size-4 shrink-0 text-[var(--color-pitch-bright)]" />
              <span className="font-medium">Laisser un commentaire</span>
              <span className="ml-auto text-[10px] text-[var(--color-muted)]">
                visible par le groupe
              </span>
            </button>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </Card>
  );
}

/** Mini-colonne « points en jeu » pour une issue (drapeau/Nul + points dorés). */
function OutcomePts({
  flag,
  label,
  pts,
}: {
  flag?: string;
  label?: string;
  pts: number | null;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-lg bg-[var(--color-surface-2)] py-1.5">
      {flag ? (
        <Flag code={flag} className="h-4 w-6" />
      ) : (
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          {label}
        </span>
      )}
      <span className="font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-[var(--color-gold)]">
        {pts ?? "—"}
        <span className="ml-0.5 text-[9px] font-semibold text-[var(--color-muted)]">
          pts
        </span>
      </span>
    </div>
  );
}

function ReadOnlyRow({
  flag,
  name,
  score,
  live = false,
}: {
  flag: string;
  name: string;
  score?: number;
  live?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <Flag code={flag} className="h-5 w-7 shrink-0" />
        <span className="truncate text-sm font-medium">{name}</span>
      </div>
      {score !== undefined && (
        <span
          className={cn(
            "font-[family-name:var(--font-display)] text-xl font-bold tabular-nums",
            live && "text-red-400"
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}
