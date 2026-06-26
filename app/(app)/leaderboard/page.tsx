import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { getLeaderboard, getAllPoolsStandings, getFinalSeries, hasBracketMatches } from "@/lib/data/queries";
import { prisma } from "@/lib/prisma";
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

  const bracketMatches = bracketPhase
    ? await prisma.match.findMany({
        where: { phase: { in: ["WINNER_BRACKET", "LOSER_BRACKET"] } },
        include: { teamA: true, teamB: true },
        orderBy: [{ round: "asc" }, { scheduledAt: "asc" }],
      })
    : [];

  return (
    <div className="space-y-5">
      <PageHeader title="Classement" subtitle="Parieurs · Poules · Finale" />
      <LeaderboardClient
        leaderboard={leaderboard}
        poolStandings={poolStandings}
        finalSeries={finalSeries}
        currentUserId={session.user.id}
        hasBracketPhase={bracketPhase}
        bracketMatches={bracketMatches}
      />
    </div>
  );
}
