// Service worker TBT Bet.
// Handler `fetch` minimal pour que Chrome/Android propose l'installation PWA.
// Le contenu applicatif reste en passthrough réseau (pas de données périmées).
//
// SEULE EXCEPTION : assets immuables de logos d'équipes mis en cache (cache-first).

const ASSET_CACHE = "tbtbet-assets-v1";
const ASSET_HOSTS = [];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("tbtbet-assets-") && k !== ASSET_CACHE)
            .map((k) => caches.delete(k))
        )
      ),
      self.clients.claim(),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  if (ASSET_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res && (res.ok || res.type === "opaque")) {
            cache.put(req, res.clone());
          }
          return res;
        } catch (err) {
          throw err;
        }
      })
    );
    return;
  }

  // Passthrough réseau pour tout le reste.
});

// ── Notifications push ──
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "TBT Bet", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "TBT Bet";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/dashboard" },
      vibrate: [80, 40, 80],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
