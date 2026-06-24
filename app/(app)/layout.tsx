import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { maybeInit } from "@/lib/init";
import { BottomNav } from "@/components/bottom-nav";
import { WelcomeModal } from "@/components/welcome-modal";
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

  const showWelcome = user && !user.hasSeenWelcome;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <main className="page-enter flex-1 px-4 pb-24 pt-4">
        {children}
      </main>
      <BottomNav />
      {showWelcome && <WelcomeModal />}
    </div>
  );
}
