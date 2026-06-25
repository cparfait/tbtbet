"use client";

import { useEffect, useRef, useState } from "react";
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

interface Props {
  isAdmin: boolean;
}

export function TiragePoller({ isAdmin }: Props) {
  const [active, setActive] = useState<{ id: string; payload: TiragePayload } | null>(null);
  const [remoteStep, setRemoteStep] = useState(0);
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/tirage/latest", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          id: string;
          payload: TiragePayload;
          currentStep: number;
          createdAt: string;
        } | null;
        if (!data || cancelled) return;

        const seen = getSeenIds();
        if (!seen.includes(data.id)) {
          // Nouvel événement non vu
          if (activeIdRef.current !== data.id) {
            activeIdRef.current = data.id;
            setActive({ id: data.id, payload: data.payload });
            setRemoteStep(data.currentStep ?? 0);
          } else {
            // Même événement déjà affiché — mettre à jour le step pour les viewers
            setRemoteStep(data.currentStep ?? 0);
          }
        }
      } catch {
        // silently ignore network errors
      }
    }

    check();
    // Admin poll lent (3s), viewers poll rapide (1s) pour suivre les clics admin
    const interval = setInterval(check, isAdmin ? 3000 : 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAdmin]);

  async function handleStepChange(step: number) {
    if (!active) return;
    await fetch("/api/admin/tirage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: active.id, step }),
    }).catch(() => {});
  }

  function handleClose() {
    if (!active) return;
    markSeen(active.id);
    activeIdRef.current = null;
    setActive(null);
    setRemoteStep(0);
  }

  if (!active) return null;

  return (
    <TirageOverlay
      payload={active.payload}
      isAdmin={isAdmin}
      externalStep={isAdmin ? undefined : remoteStep}
      onStepChange={isAdmin ? handleStepChange : undefined}
      onClose={handleClose}
    />
  );
}
