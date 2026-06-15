import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { snapshotOdds } from "@/lib/odds-sync";

/**
 * Capture immédiate de TOUTES les cotes des matchs à venir depuis The Odds API
 * (force un snapshot, ignore le throttle 6 h). Admins uniquement.
 *
 *   POST /api/admin/odds/sync
 */
export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }
  try {
    const { updated, unmatchedSoon } = await snapshotOdds();
    return NextResponse.json({ ok: true, updated, unmatchedSoon });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Échec de la synchro des cotes." },
      { status: 502 }
    );
  }
}
