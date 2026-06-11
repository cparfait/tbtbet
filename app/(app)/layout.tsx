import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { maybeSyncMatches } from "@/lib/football-data";
import { maybeInit } from "@/lib/init";
import { BottomNav } from "@/components/bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  maybeInit().catch(() => {});
  maybeSyncMatches().catch(() => {});

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <main className="page-enter flex-1 px-4 pb-24 pt-4">{children}</main>
      <InstallPrompt />
      <BottomNav />
    </div>
  );
}
