import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { getLeaderboard, getAllPoolsStandings, getFinalSeries, hasBracketMatches } from "@/lib/data/queries";
import { LeaderboardClient } from "./leaderboard-client";

export const metadata = { title: "Classement · TBT Bet" };
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [leaderboard, poolStandings, finalSeries, bracketPhase] = await Promise.all([
    getLeaderboard(),
    getAllPoolsStandings(),
    getFinalSeries(),
    hasBracketMatches(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Classement" subtitle="Parieurs · Poules · Finale" />
      <LeaderboardClient
        leaderboard={leaderboard}
        poolStandings={poolStandings}
        finalSeries={finalSeries}
        currentUserId={session.user.id}
        hasBracketPhase={bracketPhase}
      />
    </div>
  );
}
