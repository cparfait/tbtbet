import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPlayerComparison } from "@/lib/data/queries";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TeamLogo } from "@/components/team-logo";
import { UserAvatar } from "@/components/user-avatar";


export const dynamic = "force-dynamic";


type BetChoice = "TEAM_A" | "TEAM_B" | "DRAW";

function BetBadge({
  choice,
  teamAName,
  teamBName,
  payout,
  amountWizz,
  jokerUsed,
  result,
  align = "left",
}: {
  choice: BetChoice;
  teamAName: string;
  teamBName: string;
  payout: number | null;
  amountWizz: number;
  jokerUsed: boolean;
  result: string | null;
  align?: "left" | "right";
}) {
  const label =
    choice === "TEAM_A" ? teamAName : choice === "TEAM_B" ? teamBName : "Nul";

  const won = payout != null && payout > amountWizz;
  const lost = payout != null && payout === 0;
  const gain = won ? `+${payout - amountWizz}` : lost ? `-${amountWizz}` : null;

  const correct =
    (choice === "TEAM_A" && result === "TEAM_A") ||
    (choice === "TEAM_B" && result === "TEAM_B") ||
    (choice === "DRAW" && result === "DRAW");

  return (
    <div className={cn("flex flex-col gap-0.5", align === "right" && "items-end")}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
          correct
            ? "bg-green-400/15 text-green-400"
            : "bg-red-400/15 text-red-400"
        )}
      >
        {correct ? "✓" : "✗"} {label}
        {jokerUsed && " 🃏"}
      </span>
      <span className="text-[9px] text-[var(--color-muted)]">
        {amountWizz} Wizz{gain && ` · ${gain}`}
      </span>
    </div>
  );
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (userId === session.user.id) redirect("/profile");

  const { currentUser, targetUser, matches } = await getPlayerComparison(
    session.user.id,
    userId
  );

  if (!targetUser) notFound();

  const currentAvatarSrc = currentUser?.avatarUrl ?? currentUser?.image ?? null;
  const targetAvatarSrc = targetUser.avatarUrl ?? targetUser.image ?? null;

  // Statistiques face-à-face sur les matchs joués en commun
  let meWins = 0;
  let themWins = 0;
  let draws = 0;

  const matchRows = matches.map((m) => {
    const myBet = m.bets.find((b) => b.userId === session.user.id);
    const theirBet = m.bets.find((b) => b.userId === userId);

    if (myBet && theirBet && myBet.settled && theirBet.settled) {
      const myWon = myBet.payout != null && myBet.payout > myBet.amountWizz;
      const theyWon = theirBet.payout != null && theirBet.payout > theirBet.amountWizz;
      if (myWon && !theyWon) meWins++;
      else if (!myWon && theyWon) themWins++;
      else draws++;
    }

    return { match: m, myBet, theirBet };
  });

  const commonCount = meWins + themWins + draws;

  return (
    <div className="space-y-4">
      <Link
        href="/leaderboard"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-cream)]"
      >
        <ArrowLeft className="size-4" /> Classement
      </Link>

      {/* Bandeau face-à-face */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2">
          {/* Moi */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <UserAvatar src={currentAvatarSrc} name={currentUser?.name} className="size-[52px]" />
            <p className="text-xs font-semibold text-center truncate max-w-[80px] text-[var(--color-cream)]">
              {currentUser?.name ?? "Moi"}
            </p>
            <div className="flex items-center gap-1 text-[var(--color-accent)]">
              <Zap className="size-3" />
              <span className="text-xs font-bold">{currentUser?.wizzBalance ?? 0}</span>
            </div>
          </div>

          {/* Score face-à-face */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            {commonCount > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-[var(--color-cream)]">{meWins}</span>
                  <span className="text-sm text-[var(--color-muted)]">–</span>
                  <span className="text-2xl font-black text-[var(--color-cream)]">{themWins}</span>
                </div>
                <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider">
                  {draws > 0 ? `${draws} ex æquo` : "face-à-face"}
                </p>
              </>
            ) : (
              <p className="text-xs text-[var(--color-muted)] text-center">
                Aucun pari<br />en commun
              </p>
            )}
          </div>

          {/* Eux */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <UserAvatar src={targetAvatarSrc} name={targetUser.name} className="size-[52px]" />
            <p className="text-xs font-semibold text-center truncate max-w-[80px] text-[var(--color-cream)]">
              {targetUser.name ?? "Anonyme"}
            </p>
            <div className="flex items-center gap-1 text-[var(--color-accent)]">
              <Zap className="size-3" />
              <span className="text-xs font-bold">{targetUser.wizzBalance}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Liste des matchs */}
      {matchRows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-[var(--color-muted)]">
          Aucun match terminé avec des paris comparables.
        </Card>
      ) : (
        <div className="space-y-2">
          {matchRows.map(({ match, myBet, theirBet }) => {
            const hasBoth = myBet && theirBet;
            const sameChoice = hasBoth && myBet.choice === theirBet.choice;

            return (
              <Card
                key={match.id}
                className={cn(
                  "p-3",
                  sameChoice && "border-[var(--color-border-subtle)]"
                )}
              >
                {/* Match header */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <TeamLogo url={match.teamA.logoUrl} name={match.teamA.name} className="size-4 rounded" />
                    <span
                      className={cn(
                        "text-xs font-semibold truncate",
                        match.result === "TEAM_A" ? "text-[var(--color-accent)]" : "text-[var(--color-cream)]"
                      )}
                    >
                      {match.teamA.name}
                    </span>
                  </div>

                  <span className="shrink-0 text-sm font-black tabular-nums text-[var(--color-cream)]">
                    {match.scoreA}&nbsp;–&nbsp;{match.scoreB}
                  </span>

                  <div className="flex items-center gap-1.5 min-w-0 justify-end">
                    <span
                      className={cn(
                        "text-xs font-semibold truncate text-right",
                        match.result === "TEAM_B" ? "text-[var(--color-accent)]" : "text-[var(--color-cream)]"
                      )}
                    >
                      {match.teamB.name}
                    </span>
                    <TeamLogo url={match.teamB.logoUrl} name={match.teamB.name} className="size-4 rounded" />
                  </div>
                </div>

                {/* Paris */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {myBet ? (
                      <BetBadge
                        choice={myBet.choice as BetChoice}
                        teamAName={match.teamA.name}
                        teamBName={match.teamB.name}
                        payout={myBet.payout}
                        amountWizz={myBet.amountWizz}
                        jokerUsed={myBet.jokerUsed}
                        result={match.result}
                        align="left"
                      />
                    ) : (
                      <span className="text-[10px] text-[var(--color-muted)]/50">—</span>
                    )}
                  </div>

                  {sameChoice && (
                    <span className="shrink-0 self-center text-[9px] text-[var(--color-muted)] px-1">
                      même pari
                    </span>
                  )}

                  <div className="flex-1 flex justify-end">
                    {theirBet ? (
                      <BetBadge
                        choice={theirBet.choice as BetChoice}
                        teamAName={match.teamA.name}
                        teamBName={match.teamB.name}
                        payout={theirBet.payout}
                        amountWizz={theirBet.amountWizz}
                        jokerUsed={theirBet.jokerUsed}
                        result={match.result}
                        align="right"
                      />
                    ) : (
                      <span className="text-[10px] text-[var(--color-muted)]/50">—</span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
