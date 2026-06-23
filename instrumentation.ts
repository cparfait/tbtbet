/**
 * Hook de démarrage Next.js (exécuté une fois au lancement du serveur).
 * TBT Bet : pas de sync API externe, juste le bootstrap admin.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { maybeInit } = await import("./lib/init");

  setTimeout(() => {
    maybeInit().catch(() => {});
  }, 8_000);

  console.log("[instrumentation] TBT Bet — bootstrap admin");
}