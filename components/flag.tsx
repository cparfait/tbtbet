"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Drapeau d'une nation, rendu en image servie en local (public/flags) avec
 * repli flagcdn.com — compatible PC, iOS et Android (contrairement aux emojis
 * drapeaux, non rendus sous Windows). Pré-télécharger via `npm run flags`.
 *
 * `code` est un code flagcdn (ex. "fr", "gb-eng"). Vide → drapeau neutre.
 * La taille se contrôle via `className` (ex. "h-6 w-8").
 *
 * Robustesse iOS/PWA : si le CDN échoue (réseau mobile capricieux), on
 * re-tente automatiquement la requête au lieu de laisser un drapeau vide qui
 * ne revenait qu'en changeant de menu. On évite aussi `loading="lazy"`, peu
 * fiable sous Safari iOS dans les conteneurs qui défilent.
 */
export function Flag({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const base = "inline-block shrink-0 rounded-[3px] object-cover";
  const [attempt, setAttempt] = useState(0);

  if (!code) {
    return (
      <span
        className={cn(base, "bg-[var(--color-surface-2)]", className)}
        aria-hidden
      />
    );
  }

  // Local d'abord (public/flags) pour éviter toute requête réseau ; repli sur
  // flagcdn.com si le fichier local manque (pré-téléchargement non lancé ou
  // code non couvert), avec cache-bust au 2e échec.
  const src =
    attempt === 0
      ? `/flags/${code}.svg`
      : `https://flagcdn.com/${code}.svg${attempt > 1 ? `?retry=${attempt}` : ""}`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={attempt}
      src={src}
      alt=""
      decoding="async"
      onError={() => {
        if (attempt < 2) setAttempt((a) => a + 1);
      }}
      className={cn(base, className)}
    />
  );
}
