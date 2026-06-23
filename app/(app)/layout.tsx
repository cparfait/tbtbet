import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { maybeInit } from "@/lib/init";
import { BottomNav } from "@/components/bottom-nav";
import { AppHeader } from "@/components/app-header";
import { WelcomeModal } from "@/components/welcome-modal";
import { getUserById, getAllTeams } from "@/lib/data/queries";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  maybeInit().catch(() => {});

  const [user, teams] = await Promise.all([
    getUserById(session.user.id),
    getAllTeams(),
  ]);

  const showWelcome = user && !user.hasSeenWelcome;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <AppHeader
        user={{
          name: user?.name ?? null,
          email: user?.email ?? session.user.email ?? "",
          avatarUrl: user?.avatarUrl ?? null,
          image: user?.image ?? null,
          role: user?.role ?? "USER",
          wizzBalance: user?.wizzBalance ?? 0,
        }}
      />
      <main className="page-enter flex-1 px-4 pb-24 pt-4">
        {children}
      </main>
      <BottomNav />
      {showWelcome && (
        <WelcomeModal
          teams={teams.map((t) => ({ id: t.id, name: t.name, logoUrl: t.logoUrl }))}
        />
      )}
    </div>
  );
}
