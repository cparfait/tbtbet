import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { getAllMatchesWithPool, getUserBets, getUserById } from "@/lib/data/queries";
import { MatchesClient } from "./matches-client";

export const metadata = { title: "Matchs · TBT Bet" };
export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [matches, bets, user] = await Promise.all([
    getAllMatchesWithPool(),
    getUserBets(session.user.id),
    getUserById(session.user.id),
  ]);

  const betMap = Object.fromEntries(bets.map((b) => [b.matchId, b]));

  const upcoming = matches.filter(
    (m) => m.status === "SCHEDULED" || m.status === "LIVE"
  );
  const finished = matches.filter((m) => m.status === "FINISHED");

  return (
    <div className="space-y-6">
      <PageHeader title="Matchs" subtitle="Calendrier &amp; résultats" />
      <MatchesClient
        upcoming={upcoming}
        finished={finished}
        betMap={betMap}
        userWizz={user?.wizzBalance ?? 0}
        jokersLeft={user?.jokersLeft ?? 0}
      />
    </div>
  );
}
