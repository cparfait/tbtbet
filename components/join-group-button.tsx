"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Bouton « Rejoindre » sur la page d'invitation d'un groupe (utilisateur connecté). */
export function JoinGroupButton({
  token,
  alreadyMember,
}: {
  token: string;
  alreadyMember: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const join = () =>
    start(async () => {
      setError(null);
      try {
        const res = await fetch("/api/groups/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Échec");
        router.push("/dashboard");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      }
    });

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={join} disabled={pending} size="lg" className="w-full">
        {pending ? <Loader2 className="animate-spin" /> : <Check />}
        {alreadyMember ? "Déjà membre — y aller" : "Rejoindre le groupe"}
      </Button>
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}
