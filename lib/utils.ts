import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Fusionne des classes Tailwind sans conflit (helper shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Fuseau de référence : tous les horaires sont affichés en heure française. */
const TZ = "Europe/Paris";

/** Formate une date de coup d'envoi en français (ex. "lun. 12 juin, 18:00"). */
export function formatKickoff(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(d);
}

/** Heure seule du coup d'envoi en heure française (ex. "18:00"). */
export function formatKickoffTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(d);
}

/** Clé de jour (YYYY-MM-DD) en heure française, pour grouper les matchs par date. */
export function dayKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  // en-CA donne le format ISO (YYYY-MM-DD), calé sur le fuseau de Paris.
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TZ,
  }).format(d);
}

/** Retourne le label de destination WB/LB selon le rang dans la poule.
 *  Renvoie null si aucun match n'a encore été joué (anyPlayed=false). */
export function poolRankLabel(rank: number, anyPlayed: boolean): { label: string; color: string } | null {
  if (!anyPlayed) return null;
  if (rank <= 1) return { label: "→ WB", color: "text-green-400" };
  return { label: "→ LB", color: "text-orange-400" };
}

/** Traduit un label de match stocké en DB vers un libellé lisible.
 *  "WB R1 — Équipe A vs Équipe B" → "Winners Bracket · Round 1"
 *  Supprime la partie équipes (après " — "). */
export function formatMatchLabel(label: string | null | undefined): string {
  if (!label) return "";
  const phase = label.split(" — ")[0] ?? label;
  return phase
    .replace(/^WB\s+R(\d+)$/i, (_, n) => `Winners Bracket · Round ${n}`)
    .replace(/^LB\s+R(\d+)$/i, (_, n) => `Loser Bracket · Round ${n}`);
}

/** Libellé lisible d'un jour (ex. "Aujourd'hui", "Demain", "ven. 14 juin"). */
export function dayLabel(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = dayKey(new Date());
  const tomorrow = dayKey(new Date(Date.now() + 86_400_000));
  const key = dayKey(d);
  if (key === today) return "Aujourd'hui";
  if (key === tomorrow) return "Demain";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TZ,
  }).format(d);
}
