"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, Camera, Loader2 } from "lucide-react";

const MAX_SIZE = 512 * 1024; // miroir de la limite serveur

interface ProfileFormProps {
  currentName: string;
  currentAvatarUrl: string;
  initials: string;
}

export function ProfileForm({ currentName, currentAvatarUrl, initials }: ProfileFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(currentName);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = name !== currentName;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE) {
      setError("Image trop lourde (max 512 Ko). Compresse-la avant d'uploader.");
      e.target.value = "";
      return;
    }

    setError(null);
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur upload"); return; }
      setAvatarUrl(data.url);
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSave() {
    if (!name.trim()) { setError("Le pseudo ne peut pas être vide."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
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
    <div className="space-y-4">
      {/* Avatar cliquable */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="group relative size-20 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          aria-label="Changer l'avatar"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="avatar"
              className="size-20 rounded-full object-cover ring-2 ring-[var(--color-accent)]/40"
            />
          ) : (
            <span className="flex size-20 items-center justify-center rounded-full bg-[var(--color-accent)]/15 text-2xl font-bold text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30">
              {initials}
            </span>
          )}

          {/* Overlay */}
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {uploading
              ? <Loader2 className="size-6 text-white animate-spin" />
              : <Camera className="size-6 text-white" />
            }
          </span>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleAvatarChange}
        />
      </div>
      <p className="text-center text-[10px] text-[var(--color-muted)]">
        JPG, PNG ou WebP · max 512 Ko
      </p>

      {/* Pseudo */}
      <div>
        <label className="text-xs text-[var(--color-muted)]">Pseudo</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          className="mt-1 w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]/60 focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all"
        />
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
