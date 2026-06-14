import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChatView } from "@/components/chat-view";
import { getMyGroups, requireActiveGroup } from "@/lib/groups";

export const metadata = { title: "Tchat · DaronsFC" };
export const dynamic = "force-dynamic";

type ChatMsg = {
  id: string;
  userId: string;
  user: string;
  text: string;
  pinned: boolean;
  isSystem: boolean;
  timestamp: string;
  reactions: { emoji: string; count: number; mine: boolean }[];
};

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const currentUser = {
    id: userId,
    name: session.user.name ?? "Daron",
    isAdmin: session.user.role === "ADMIN",
  };

  const activeGroup = await requireActiveGroup(userId);
  const myGroups = await getMyGroups(userId);

  let initial: ChatMsg[] = [];
  try {
    // Les 50 DERNIERS messages (desc + reverse) — un take asc renverrait les
    // 50 plus anciens et le fil semblerait figé au-delà de 50 messages.
    const rows = (
      await prisma.message.findMany({
        where: { groupId: activeGroup.id },
        include: {
          user: { select: { id: true, name: true } },
          reactions: { select: { emoji: true, userId: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    ).reverse();
    initial = rows.map((m) => {
      const map = new Map<string, { emoji: string; count: number; mine: boolean }>();
      for (const r of m.reactions) {
        const e = map.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
        e.count++;
        if (r.userId === currentUser.id) e.mine = true;
        map.set(r.emoji, e);
      }
      return {
        id: m.id,
        userId: m.userId,
        user: m.user.name ?? "Daron",
        text: m.content,
        pinned: m.pinned,
        isSystem: m.isSystem,
        timestamp: m.createdAt.toISOString(),
        reactions: [...map.values()],
      };
    });
  } catch {}

  return (
    <ChatView
      currentUser={currentUser}
      initial={initial}
      groups={myGroups}
      activeGroupId={activeGroup.id}
      groupName={activeGroup.name}
    />
  );
}
