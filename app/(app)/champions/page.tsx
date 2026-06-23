import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { getAllTeams, getUserChampionBet } from "@/lib/data/queries";
import { ChampionBetForm } from "./champion-bet-form";
import { Star, Lock } from "lucide-react";

export const metadata = { title: "Ton favori · TBT Bet" };
export const dynamic = "force-dynamic";

export default async function ChampionBetPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [teams, existingBet] = await Promise.all([
    getAllTeams(),
    getUserChampionBet(session.user.id),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ton favori"
        subtitle="Quelle équipe va remporter le tournoi ?"
      />

      {existingBet ? (
        /* ── Choix verrouillé ── */
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="size-4 text-[var(--color-muted)]" />
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-semibold">
              Choix définitif · verrouillé
            </p>
          </div>

          <div className="flex items-center gap-4">
            {existingBet.team.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={existingBet.team.logoUrl}
                alt={existingBet.team.name}
                className="size-16 rounded-xl object-contain"
              />
            ) : (
              <div className="size-16 rounded-xl bg-[var(--color-surface-2)] flex items-center justify-center">
                <Star className="size-6 text-[var(--color-accent)]" />
              </div>
            )}
            <div>
              <p className="text-[10px] text-[var(--color-muted)]">Ton équipe favorite</p>
              <p className="text-2xl font-black">{existingBet.team.name}</p>
            </div>
          </div>
        </Card>
      ) : (
        /* ── Formulaire de choix ── */
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Star className="size-5 text-[var(--color-accent)]" />
            <div>
              <p className="text-sm font-semibold">Pronostic gratuit</p>
              <p className="text-xs text-[var(--color-muted)]">
                Résolu à la fin du tournoi. Attention, ce choix est définitif.
              </p>
            </div>
          </div>

          <ChampionBetForm
            teams={teams.map((t) => ({ id: t.id, name: t.name, logoUrl: t.logoUrl }))}
          />
        </Card>
      )}
    </div>
  );
}
