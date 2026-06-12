"use client";

import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";

/** Détecte les navigateurs intégrés (Messenger, Instagram, Facebook…). */
function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|MicroMessenger|Twitter|WhatsApp|Snapchat|TikTok/i.test(
    ua
  );
}

/**
 * Bandeau affiché quand l'utilisateur ouvre l'app dans un navigateur intégré
 * (où la connexion Google est bloquée par Google → erreur 403).
 */
export function InAppBrowserNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(isInAppBrowser()), []);
  if (!show) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 p-3.5">
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[var(--color-gold)]" />
      <div className="text-sm">
        <p className="font-semibold text-[var(--color-cream)]">
          Ne fais pas comme Manu… 🙈
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
          La connexion Google ne marche pas dans le navigateur de Messenger /
          Instagram. Ouvre la page dans <strong>Safari</strong> ou{" "}
          <strong>Chrome</strong> (bouton <strong>···</strong> →{" "}
          «&nbsp;Ouvrir dans le navigateur&nbsp;»), ou connecte-toi par{" "}
          <strong>email</strong> juste en dessous. 😉
        </p>
      </div>
    </div>
  );
}
