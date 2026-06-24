"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "tbt-bet-install-dismissed";

/**
 * Bannière d'installation PWA adaptative :
 * - Android/Chrome : bouton direct "Ajouter à l'écran d'accueil"
 * - iOS/Safari : instructions manuelles Partager → Sur l'écran d'accueil
 * - Autres : instructions génériques via le menu navigateur
 * Disparaît si l'app est déjà installée (mode standalone) ou refusée.
 */
export function InstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ua = navigator.userAgent || "";
    setIsIOS(/iphone|ipad|ipod/i.test(ua));
    setShow(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show) return null;

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => {});
    dismiss();
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  return (
    <div className="rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-xl">
          📲
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-cream)]">
            Installe TBT Bet sur ton téléphone
          </p>

          {deferred ? (
            <>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                Accès direct depuis ton écran d&apos;accueil, comme une vraie appli.
              </p>
              <button
                onClick={install}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90"
              >
                <Download className="size-3.5" /> Ajouter à l&apos;écran d&apos;accueil
              </button>
            </>
          ) : isIOS ? (
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
              Appuie sur{" "}
              <Share className="inline size-3.5 align-text-bottom" />{" "}
              <strong className="text-[var(--color-cream)]">Partager</strong> en bas de
              Safari, puis{" "}
              <strong className="text-[var(--color-cream)]">
                « Sur l&apos;écran d&apos;accueil »
              </strong>
              .
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
              Depuis le menu de ton navigateur :{" "}
              <strong className="text-[var(--color-cream)]">
                « Installer l&apos;application »
              </strong>{" "}
              ou{" "}
              <strong className="text-[var(--color-cream)]">
                « Ajouter à l&apos;écran d&apos;accueil »
              </strong>
              .
            </p>
          )}
        </div>

        <button
          onClick={dismiss}
          aria-label="Fermer"
          className="shrink-0 text-[var(--color-muted)] hover:text-[var(--color-cream)] transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
