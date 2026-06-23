import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { ChatView } from "@/components/chat-view";

export const metadata = { title: "Chat · TBT Bet" };
export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-4">
      <PageHeader title="Chat" subtitle="Toute l&apos;entreprise réunie" />
      <ChatView
        currentUserId={session.user.id}
        isAdmin={session.user.role === "ADMIN"}
      />
    </div>
  );
}