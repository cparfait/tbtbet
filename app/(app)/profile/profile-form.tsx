"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface ProfileFormProps {
  currentName: string;
  currentAvatarUrl: string;
}

export function ProfileForm({ currentName, currentAvatarUrl }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = name !== currentName || avatarUrl !== currentAvatarUrl;

  async function handleSave() {
    if (!name.trim()) { setError("Le pseudo ne peut pas être vide."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), avatarUrl: avatarUrl.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Pseudo */}
      <div>
        <label className="text-xs text-[var(--color-muted)]">Pseudo</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          className="mt-1 w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
        />
      </div>

      {/* URL Avatar */}
      <div>
        <label className="text-xs text-[var(--color-muted)]">URL avatar (optionnel)</label>
        <input
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://..."
          className="mt-1 w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
        />
        {avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="aperçu"
            className="mt-2 size-10 rounded-full object-cover ring-1 ring-[var(--color-border-subtle)]"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }}
          />
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button onClick={handleSave} disabled={saving || !dirty} className="w-full">
        {saved ? (
          <><Check className="size-4 mr-1.5" /> Sauvegardé !</>
        ) : saving ? "Sauvegarde..." : "Sauvegarder"}
      </Button>
    </div>
  );
}
