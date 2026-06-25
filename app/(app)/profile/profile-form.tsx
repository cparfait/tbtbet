"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_SIZE = 512 * 1024;

interface ProfileFormProps {
  currentName: string;
  currentAvatarUrl: string;
  email: string;
  role: string;
  initials: string;
}

export function ProfileForm({ currentName, currentAvatarUrl, email, role, initials }: ProfileFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [name, setName] = useState(currentName);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentName);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSaveName() {
    if (!editValue.trim()) { setError("Le pseudo ne peut pas être vide."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editValue.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }
      setName(editValue.trim());
      setEditing(false);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        {/* Nom + email + role */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") { setEditing(false); setEditValue(name); }
                }}
                maxLength={50}
                className="text-lg font-bold bg-[var(--color-surface-2)] border border-[var(--color-accent)]/60 rounded-lg px-2 py-0.5 w-full outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
              />
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="shrink-0 text-[var(--color-accent)] hover:text-[var(--color-accent-bright)] transition-colors"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              </button>
              <button
                onClick={() => { setEditing(false); setEditValue(name); }}
                className="shrink-0 text-[var(--color-muted)] hover:text-[var(--color-cream)] transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className={cn("text-lg font-bold truncate text-[var(--color-cream)]")}>
                {name || "Anonyme"}
              </p>
              <button
                onClick={() => { setEditValue(name); setEditing(true); }}
                className="shrink-0 text-[var(--color-muted)] hover:text-[var(--color-cream)] transition-colors"
                aria-label="Modifier le pseudo"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
          )}
          <p className="text-xs text-[var(--color-muted)] truncate mt-0.5">{email}</p>
          {role === "ADMIN" && (
            <span className="mt-1 inline-block rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent)]">
              ADMIN
            </span>
          )}
        </div>

        {/* Avatar cliquable */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="group relative size-16 shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          aria-label="Changer l'avatar"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="avatar"
              className="size-16 rounded-full object-cover ring-2 ring-[var(--color-accent)]/40"
            />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-full bg-[var(--color-accent)]/15 text-xl font-bold text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30">
              {initials}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {uploading
              ? <Loader2 className="size-5 text-white animate-spin" />
              : <Camera className="size-5 text-white" />
            }
          </span>
        </button>
      </div>

      <p className="text-[10px] text-[var(--color-muted)]">JPG, PNG ou WebP · max 512 Ko</p>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleAvatarChange}
      />
    </div>
  );
}
