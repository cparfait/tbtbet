"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Rafraîchit le rendu serveur à intervalle régulier (par défaut 30 s) pour
 * faire évoluer le classement / les scores live sans rechargement manuel.
 * À monter uniquement quand il y a au moins un match en cours.
 */
export function LiveRefresher({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1_000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
