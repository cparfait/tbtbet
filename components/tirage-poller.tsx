"use client";

import { useEffect, useState } from "react";
import { TirageOverlay, type TiragePayload } from "@/components/tirage-overlay";

const SEEN_KEY = "tbt_tirage_seen_v1";

function getSeenIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function markSeen(id: string) {
  const seen = getSeenIds();
  if (!seen.includes(id)) {
    seen.push(id);
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  }
}

export function TiragePoller() {
  const [active, setActive] = useState<{ id: string; payload: TiragePayload } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/tirage/latest", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          id: string;
          payload: TiragePayload;
          createdAt: string;
        } | null;
        if (!data) return;
        const seen = getSeenIds();
        if (!seen.includes(data.id) && !cancelled) {
          setActive({ id: data.id, payload: data.payload });
        }
      } catch {
        // silently ignore network errors
      }
    }

    check();
    const timer = setInterval(check, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!active) return null;

  function handleClose() {
    if (!active) return;
    markSeen(active.id);
    setActive(null);
  }

  return <TirageOverlay payload={active.payload} onClose={handleClose} />;
}
