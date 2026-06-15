"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Sparkles, ChevronRight } from "lucide-react";

// Clé VERSIONNÉE : pour une future annonce, bumper en -v2 et réutiliser tel quel.
const DISMISS_KEY = "daronsfc-announce-odds-v1";

/**
 * Annonce au lancement (modale sur le Hub) du nouveau scoring aux cotes.
 * - « Ne plus afficher » coché + « J'ai compris » → masquée définitivement.
 * - Fermeture sans cocher (✕ / clic dehors / bouton) → revient au prochain
 *   lancement, ce qui « force » l'accusé de lecture.
 */
export function OddsAnnouncement() {
  const [show, setShow] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(DISMISS_KEY)) setShow(true);
  }, []);

  if (!show) return null;

  const close = (persist: boolean) => {
    if (persist) localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nouveauté : le scoring aux cotes"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Fond assombri (clic = fermer pour cette fois) */}
      <button
        type="button"
        aria-label="Fermer"
        onClick={() => close(false)}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />

      {/* Modale */}
      <div className="animate-scale-in relative w-full max-w-sm rounded-3xl border border-[var(--color-gold)]/40 bg-[var(--color-surface)] p-6 shadow-[0_0_30px_rgba(245,158,11,0.5),0_0_75px_rgba(245,158,11,0.25),0_20px_50px_rgba(0,0,0,0.75)]">
        <div className="mb-4 flex items-start justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-gold)]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-gold)]">
            <Sparkles className="size-3" /> Nouveau
          </span>
          <button
            type="button"
            onClick={() => close(false)}
            aria-label="Fermer"
            className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-cream)]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-1.5 text-center text-4xl">🔥</div>
        <h2 className="text-gradient-gold mb-3 text-center font-[family-name:var(--font-display)] text-2xl font-extrabold">
          Vous l&apos;avez réclamé,<br />on l&apos;a fait ! 🎉
        </h2>

        <p className="mb-3 text-center text-sm leading-relaxed text-[var(--color-muted)]">
          Place au <strong className="text-[var(--color-cream)]">scoring aux cotes</strong> !
          Désormais les points récompensent ton flair : un résultat couru
          d&apos;avance rapporte sa pitance, mais si tu déniches{" "}
          <strong className="text-[var(--color-gold)]">LA victoire pépite</strong>{" "}
          que personne n&apos;avait vue venir, tu rafles gros — jusqu&apos;à{" "}
          <strong className="text-[var(--color-cream)]">12 pts</strong> en trouvant
          le score exact (et encore ×2 avec le joker). Avoir du nez, ça paie. 👃
        </p>

        <p className="mb-4 rounded-xl border border-[var(--color-gold)]/25 bg-[var(--color-gold)]/[0.06] px-3 py-2 text-center text-xs leading-relaxed text-[var(--color-muted)]">
          ♻️ Tous les points déjà acquis ont été{" "}
          <strong className="text-[var(--color-cream)]">recalculés</strong> avec ce
          nouveau barème — la même règle pour tout le monde.
        </p>

        <Link
          href="/profile/scoring"
          onClick={() => close(false)}
          className="mb-4 flex items-center justify-center gap-1 text-sm font-semibold text-[var(--color-gold-bright)] hover:underline"
        >
          Comment ça marche ? <ChevronRight className="size-4" />
        </Link>

        <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 text-xs text-[var(--color-muted)]">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
            className="size-4 rounded accent-[var(--color-gold)]"
          />
          Ne plus afficher ce message
        </label>

        <button
          type="button"
          onClick={() => close(dontShow)}
          className="w-full rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-bright)] px-4 py-3 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wide text-[#1a1206] transition-transform hover:scale-[1.02]"
        >
          C&apos;est parti ! 🚀
        </button>
      </div>
    </div>
  );
}
