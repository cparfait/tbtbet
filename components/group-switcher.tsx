"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, ChevronDown, Check, Settings2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Group = { id: string; name: string };

/** Sélecteur de groupe actif, affiché dans l'en-tête des pages scopées. */
export function GroupSwitcher({
  groups,
  activeId,
}: {
  groups: Group[];
  activeId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const active = groups.find((g) => g.id === activeId);

  const select = (groupId: string) => {
    if (groupId === activeId) {
      setOpen(false);
      return;
    }
    start(async () => {
      await fetch("/api/groups/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex max-w-[55vw] items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--color-cream)] transition-colors hover:border-[var(--color-pitch)]/40"
      >
        {pending ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-[var(--color-pitch-bright)]" />
        ) : (
          <Users className="size-3.5 shrink-0 text-[var(--color-pitch-bright)]" />
        )}
        <span className="truncate">{active?.name ?? "Groupe"}</span>
        <ChevronDown className="size-3.5 shrink-0 text-[var(--color-muted)]" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fermer"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-2xl shadow-black/40">
            <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              Mes groupes
            </p>
            <ul className="max-h-64 overflow-y-auto scrollbar-thin">
              {groups.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => select(g.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-surface-2)]"
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center",
                        g.id === activeId
                          ? "text-[var(--color-pitch-bright)]"
                          : "text-transparent"
                      )}
                    >
                      <Check className="size-4" />
                    </span>
                    <span className="truncate">{g.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            <Link
              href="/groups"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 border-t border-[var(--color-border-subtle)] px-3 py-2.5 text-sm font-medium text-[var(--color-pitch-bright)] transition-colors hover:bg-[var(--color-surface-2)]"
            >
              <Settings2 className="size-4" />
              Gérer les groupes
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
