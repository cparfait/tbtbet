import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { maybeInit } from "@/lib/init";
import { BottomNav } from "@/components/bottom-nav";
import { WelcomeModal } from "@/components/welcome-modal";
import { TiragePoller } from "@/components/tirage-poller";
import { getUserById } from "@/lib/data/queries";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  maybeInit().catch(() => {});

  const user = await getUserById(session.user.id);
  // JWT valide mais user supprimé en base (ex: rechargement de scénario)
  if (!user) redirect("/api/auth/force-signout");

  const showWelcome = user && !user.hasSeenWelcome;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md md:max-w-2xl lg:max-w-4xl flex-col">
      <main className="page-enter flex-1 px-4 pb-24 pt-4">
        {children}
      </main>
      <BottomNav isAdmin={user?.role === "ADMIN"} />
      {showWelcome && <WelcomeModal initialName={user.name ?? ""} />}
      <TiragePoller isAdmin={user?.role === "ADMIN"} />
    </div>
  );
}
