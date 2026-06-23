import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { AdminConsole } from "@/components/admin-console";
import { getAdminStats, getAdminUsers } from "@/lib/data/queries";
import { getAllTeams, getAllPools, getAllMatches } from "@/lib/data/queries";

export const metadata = { title: "Admin · TBT Bet" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [stats, users, teams, pools, matches] = await Promise.all([
    getAdminStats(),
    getAdminUsers(),
    getAllTeams(),
    getAllPools(),
    getAllMatches(),
  ]);

  const STATS = [
    { label: "Joueurs", value: stats.users, emoji: "👥" },
    { label: "Paris", value: stats.bets, emoji: "🎯" },
    { label: "Messages", value: stats.messages, emoji: "💬" },
    {
      label: "Matchs joués",
      value: `${stats.finishedMatches}/${stats.matches}`,
      emoji: "⚽",
    },
  ];

  return (
    <main className="mx-auto min-h-dvh max-w-md overflow-x-hidden px-4 py-6">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-cream)]"
      >
        <ArrowLeft className="size-4" /> Retour à l&rsquo;app
      </Link>

      <PageHeader title="Console Admin" subtitle="Gestion du tournoi TBT Bet" />

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        {STATS.map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-2xl">{s.emoji}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-accent)]">
              {s.value}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              {s.label}
            </p>
          </Card>
        ))}
      </div>

      <AdminConsole
        users={users}
        teams={teams}
        pools={pools}
        matches={matches}
        currentUserId={session.user.id}
      />
    </main>
  );
}