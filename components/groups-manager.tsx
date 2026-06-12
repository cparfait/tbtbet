"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Check,
  Loader2,
  Copy,
  Link2,
  Crown,
  CircleDot,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GroupBrief } from "@/lib/groups";

/** Extrait un token depuis un lien collé (…/join/TOKEN) ou un token brut. */
function extractToken(input: string): string {
  const v = input.trim();
  const m = v.match(/\/join\/([A-Za-z0-9]+)/);
  return m?.[1] ?? v;
}

export function GroupsManager({
  groups,
  activeId,
}: {
  groups: GroupBrief[];
  activeId: string | null;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const flash = (text: string, ok: boolean) => {
    setFeedback({ text, ok });
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="flex flex-col gap-5">
      {groups.length === 0 ? (
        <Card className="glass p-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-[var(--color-pitch)]/15">
            <Users className="size-6 text-[var(--color-pitch-bright)]" />
          </div>
          <p className="text-sm text-[var(--color-muted)]">
            Tu n&apos;es dans aucun groupe pour l&apos;instant. Crée le tien et
            invite tes amis, ou rejoins-en un avec un lien.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {groups.map((g) => (
            <GroupRow
              key={g.id}
              group={g}
              active={g.id === activeId}
              onSelect={() => router.refresh()}
              flash={flash}
            />
          ))}
        </div>
      )}

      <CreateGroupCard flash={flash} />
      <JoinGroupCard flash={flash} />

      {feedback && (
        <p
          className={cn(
            "text-center text-sm",
            feedback.ok ? "text-[var(--color-pitch-bright)]" : "text-red-400"
          )}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}

/* ─── Une ligne de groupe ─── */
function GroupRow({
  group,
  active,
  onSelect,
  flash,
}: {
  group: GroupBrief;
  active: boolean;
  onSelect: () => void;
  flash: (text: string, ok: boolean) => void;
}) {
  const [pending, start] = useTransition();

  const activate = () =>
    start(async () => {
      await fetch("/api/groups/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group.id }),
      });
      onSelect();
    });

  const copyLink = async () => {
    const url = `${window.location.origin}/join/${group.token}`;
    try {
      await navigator.clipboard.writeText(url);
      flash("✓ Lien d'invitation copié", true);
    } catch {
      flash(url, true);
    }
  };

  return (
    <Card
      className={cn(
        "p-3.5 transition-colors",
        active && "border-[var(--color-pitch)]/40 bg-[var(--color-pitch)]/[0.05]"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-2)]">
          <Users className="size-5 text-[var(--color-pitch-bright)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold">{group.name}</span>
            {group.isOwner && (
              <Crown className="size-3.5 shrink-0 text-[var(--color-gold)]" />
            )}
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            {group.memberCount} membre{group.memberCount > 1 ? "s" : ""}
          </p>
        </div>

        {active ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-pitch)]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-pitch-bright)]">
            <CircleDot className="size-3" />
            Actif
          </span>
        ) : (
          <button
            type="button"
            onClick={activate}
            disabled={pending}
            className="shrink-0 rounded-full border border-[var(--color-border-subtle)] px-3 py-1 text-xs font-semibold text-[var(--color-cream)] transition-colors hover:border-[var(--color-pitch)]/40 disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : "Activer"}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={copyLink}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] py-2 text-xs font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-cream)]"
      >
        <Copy className="size-3.5" />
        Copier le lien d&apos;invitation
      </button>
    </Card>
  );
}

/* ─── Créer un groupe ─── */
function CreateGroupCard({ flash }: { flash: (text: string, ok: boolean) => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  const create = () =>
    start(async () => {
      const trimmed = name.trim();
      if (trimmed.length < 2) {
        flash("Donne un nom à ton groupe (2 caractères min.).", false);
        return;
      }
      try {
        const res = await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        setName("");
        flash("✓ Groupe créé ! Partage le lien d'invitation.", true);
        router.refresh();
      } catch (e) {
        flash(e instanceof Error ? e.message : "Erreur", false);
      }
    });

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Plus className="size-4 text-[var(--color-pitch-bright)]" />
          Créer un groupe
        </h2>
        <p className="mt-1 mb-3 text-sm text-[var(--color-muted)]">
          Tu deviens l&apos;organisateur et reçois un lien unique à partager.
        </p>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            maxLength={40}
            placeholder="Ex. Les darons du quartier"
            className="h-11 flex-1 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 text-sm text-[var(--color-cream)] outline-none focus:border-[var(--color-pitch)]"
          />
          <Button variant="primary" size="md" onClick={create} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Plus />}
            Créer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Rejoindre via un lien ─── */
function JoinGroupCard({ flash }: { flash: (text: string, ok: boolean) => void }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();

  const join = () =>
    start(async () => {
      const token = extractToken(value);
      if (token.length < 8) {
        flash("Colle un lien d'invitation valide.", false);
        return;
      }
      try {
        const res = await fetch("/api/groups/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        setValue("");
        flash(`✓ Tu as rejoint « ${data.name} »`, true);
        router.refresh();
      } catch (e) {
        flash(e instanceof Error ? e.message : "Erreur", false);
      }
    });

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Link2 className="size-4 text-[var(--color-pitch-bright)]" />
          Rejoindre un groupe
        </h2>
        <p className="mt-1 mb-3 text-sm text-[var(--color-muted)]">
          Colle le lien d&apos;invitation reçu d&apos;un ami.
        </p>
        <div className="flex gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && join()}
            placeholder="https://…/join/…"
            className="h-11 flex-1 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 text-sm text-[var(--color-cream)] outline-none focus:border-[var(--color-pitch)]"
          />
          <Button variant="surface" size="md" onClick={join} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Check />}
            Rejoindre
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
