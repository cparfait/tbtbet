import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";
import { getActiveGroup, getGroupMemberIds } from "@/lib/groups";

/** Agrège les réactions d'un message en { emoji, count, mine }. */
function aggregateReactions(
  reactions: { emoji: string; userId: string }[],
  meId?: string
) {
  const map = new Map<string, { emoji: string; count: number; mine: boolean }>();
  for (const r of reactions) {
    const e = map.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
    e.count++;
    if (r.userId === meId) e.mine = true;
    map.set(r.emoji, e);
  }
  return [...map.values()];
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    const meId = session?.user?.id;
    if (!meId) return NextResponse.json([]);
    const active = await getActiveGroup(meId);
    if (!active) return NextResponse.json([]);
    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");
    const messages = await prisma.message.findMany({
      where: {
        groupId: active.id,
        ...(since ? { createdAt: { gt: new Date(since) } } : {}),
      },
      include: {
        user: { select: { id: true, name: true } },
        reactions: { select: { emoji: true, userId: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return NextResponse.json(
      messages.map((m) => ({
        id: m.id,
        userId: m.userId,
        user: m.user.name ?? "Daron",
        text: m.content,
        pinned: m.pinned,
        timestamp: m.createdAt.toISOString(),
        reactions: aggregateReactions(m.reactions, meId),
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}

/** Épingle / désépingle un message (admin uniquement). */
export async function PATCH(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Réservé aux admins" }, { status: 403 });
  }
  const { id, pinned } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || typeof pinned !== "boolean") {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  await prisma.message.update({ where: { id }, data: { pinned } });
  return NextResponse.json({ ok: true });
}

/** Suppression d'un message — par son auteur ou par un admin. */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const { id } = await req.json().catch(() => ({ id: null }));
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });
  }
  const msg = await prisma.message.findUnique({ where: { id } });
  if (!msg) {
    return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
  }
  const isAdmin = session.user.role === "ADMIN";
  if (msg.userId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });
  }
  await prisma.message.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  try {
    const active = await getActiveGroup(session.user.id);
    if (!active) {
      return NextResponse.json({ error: "Aucun groupe actif" }, { status: 400 });
    }
    const { content } = await req.json();
    const text = (content ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "Message vide" }, { status: 400 });
    }
    const msg = await prisma.message.create({
      data: {
        userId: session.user.id,
        groupId: active.id,
        content: text.slice(0, 500),
      },
      include: { user: { select: { id: true, name: true } } },
    });

    // Notification push aux membres du groupe (sauf l'auteur), fire-and-forget.
    getGroupMemberIds(active.id)
      .then((ids) =>
        sendPushToUsers(
          ids.filter((id) => id !== session.user!.id),
          {
            title: `${msg.user.name ?? "Daron"} · ${active.name}`,
            body: text.slice(0, 120),
            url: "/chat",
          }
        )
      )
      .catch(() => {});

    return NextResponse.json({
      id: msg.id,
      userId: msg.userId,
      user: msg.user.name ?? "Daron",
      text: msg.content,
      pinned: msg.pinned,
      timestamp: msg.createdAt.toISOString(),
      reactions: [],
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
