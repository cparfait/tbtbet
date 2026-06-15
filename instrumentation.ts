/**
 * Hook de démarrage Next.js (exécuté une fois au lancement du serveur).
 *
 * Synchronisation AUTOMATIQUE et ADAPTATIVE des matchs/scores depuis
 * football-data.org, indépendamment de la navigation des utilisateurs.
 *
 *   • Fenêtre de match active (kickoff imminent ou match en cours)
 *       → sync rapide (SYNC_LIVE_SECONDS, défaut 90 s)
 *   • Aucun match en vue
 *       → sync lente (SYNC_IDLE_MINUTES, défaut 30 min)
 *
 * Rythme volontairement sous la limite de 10 req/min de football-data.org,
 * sans plafond journalier → couvre des matchs étalés sur toute la journée.
 */
export async function register() {
  // Ne s'exécute que côté serveur Node (pas en edge runtime).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const liveSeconds = Math.max(30, Number(process.env.SYNC_LIVE_SECONDS ?? 90));
  const idleMinutes = Math.max(1, Number(process.env.SYNC_IDLE_MINUTES ?? 30));

  const [{ syncMatches, hasActiveMatchWindow }, { maybeInit }, { maybeSnapshotOdds }] =
    await Promise.all([
      import("./lib/football-data"),
      import("./lib/init"),
      import("./lib/odds-sync"),
    ]);

  const port = process.env.PORT ?? "3000";
  const notifyUrl = `http://127.0.0.1:${port}/api/internal/notify-results`;

  const runSync = async () => {
    try {
      const r = await syncMatches();
      if (r.results > 0) {
        console.log(`[auto-sync] ✓ ${r.matches} matchs, ${r.results} résultats`);
      }
      // Snapshot des cotes (auto-throttlé à 6 h, no-op sans match à venir).
      await maybeSnapshotOdds().catch(() => {});
      // Notifs « résultat tombé » via la route node dédiée (fetch, pas
      // d'import → web-push reste hors du bundle edge de l'instrumentation).
      if (process.env.AUTH_SECRET) {
        fetch(notifyUrl, {
          method: "POST",
          headers: { "x-internal-secret": process.env.AUTH_SECRET },
        }).catch(() => {});
      }
    } catch (err) {
      console.error("[auto-sync] ✗", err instanceof Error ? err.message : err);
    }
  };

  const loop = async () => {
    await runSync();
    let fast = false;
    try {
      fast = await hasActiveMatchWindow();
    } catch {}
    const delay = fast ? liveSeconds * 1_000 : idleMinutes * 60_000;
    setTimeout(loop, delay);
  };

  // Démarrage : seed badges + compte admin, puis lance la boucle adaptative
  // après un court délai (laisse la base et la migration se stabiliser).
  setTimeout(() => {
    maybeInit()
      .catch(() => {})
      .finally(loop);
  }, 8_000);

  console.log(
    `[instrumentation] auto-sync adaptatif — live ${liveSeconds}s / idle ${idleMinutes}min`
  );
}
