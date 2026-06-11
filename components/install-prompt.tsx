"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "daronsfc-install-dismissed";

/**
 * Bandeau d'installation PWA. Apparaît quand Chrome/Android déclenche
 * `beforeinstallprompt` et que l'utilisateur n'a pas déjà refusé.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred) return null;

  const install = async () => {
    await deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDeferred(null);
  };

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 mx-auto flex max-w-md items-center gap-3 px-4">
      <div className="glass-strong flex flex-1 items-center gap-3 rounded-2xl border border-[var(--color-pitch)]/30 p-3 shadow-lg">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-pitch)]/15">
          <Download className="size-5 text-[var(--color-pitch-bright)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Installer DaronsFC</p>
          <p className="text-xs text-[var(--color-muted)]">
            Accès direct depuis ton écran d&apos;accueil.
          </p>
        </div>
        <button
          onClick={install}
          className="shrink-0 rounded-xl bg-[var(--color-pitch)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-pitch-bright)]"
        >
          Installer
        </button>
        <button
          onClick={dismiss}
          aria-label="Fermer"
          className="shrink-0 text-[var(--color-muted)] hover:text-[var(--color-cream)]"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
