"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Toggle d'activation des notifications push. `vapidKey` vient du serveur. */
export function PushToggle({ vapidKey }: { vapidKey: string }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      !!vapidKey;
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(!!sub))
      .catch(() => {});
  }, [vapidKey]);

  if (!supported) return null;

  const enable = async () => {
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Notifications refusées.");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error("Échec de l'enregistrement.");
      setEnabled(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setEnabled(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={enabled ? disable : enable}
      disabled={busy}
      className="glass flex w-full items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] px-4 py-3 text-sm font-medium transition-all duration-200 hover:border-[var(--color-pitch)]/40 disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-[var(--color-muted)]" />
      ) : enabled ? (
        <Bell className="size-4 shrink-0 text-[var(--color-pitch-bright)]" />
      ) : (
        <BellOff className="size-4 shrink-0 text-[var(--color-muted)]" />
      )}
      <span className="flex-1 text-left">
        {enabled ? "Notifications activées" : "Activer les notifications"}
        {error && <span className="block text-xs text-red-400">{error}</span>}
      </span>
      <span
        className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
          enabled ? "bg-[var(--color-pitch)]" : "bg-[var(--color-border-subtle)]"
        }`}
      >
        <span
          className={`size-5 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-5" : ""
          }`}
        />
      </span>
    </button>
  );
}
