// Service worker minimal DaronsFC.
// Présence d'un handler `fetch` requise pour que Chrome/Android proposent
// l'installation. Volontairement SANS cache : on laisse le réseau gérer pour
// ne jamais servir de contenu périmé (appli temps réel).

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Passthrough réseau par défaut (pas de respondWith) — le navigateur gère.
});
