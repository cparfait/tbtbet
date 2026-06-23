import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");

    let messages = await prisma.message.findMany({
      where: {
        ...(since ? { createdAt: { gt: new Date(since) } } : {}),
      },
      include: {
        user: { select: { id: true, name: true } },
        reactions: { select: { emoji: true, userId: true } },
      },
      orderBy: { createdAt: since ? "asc" : "desc" },
      take: 100,
    });

    if (!since) messages = messages.reverse();

    return NextResponse.json(
      messages.map((m) => ({
        id: m.id,
        userId: m.userId,
        user: m.user.name ?? "Anonyme",
        text: m.content,
        pinned: m.pinned,
        isSystem: m.isSystem,
        systemKind: m.systemKind,
        timestamp: m.createdAt.toISOString(),
        reactions: aggregateReactions(m.reactions, meId),
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}

/** Réaction ou épinglage. */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { messageId, emoji, pinned } = body;

  if (typeof messageId !== "string") {
    return NextResponse.json({ error: "messageId requis" }, { status: 400 });
  }

  // Épinglage (admin seulement)
  if (typeof pinned === "boolean") {
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Réservé aux admins" }, { status: 403 });
    }
    await prisma.message.update({ where: { id: messageId }, data: { pinned } });
    return NextResponse.json({ ok: true });
  }

  // Réaction (toggle)
  if (typeof emoji === "string") {
    const existing = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: session.user.id,
          emoji,
        },
      },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.reaction.create({
        data: { messageId, userId: session.user.id, emoji },
      });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
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
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { banned: true },
    });
    if (!me || me.banned) {
      return NextResponse.json({ error: "Compte suspendu." }, { status: 403 });
    }

    const { content } = await req.json();
    const text = (content ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "Message vide" }, { status: 400 });
    }

    const msg = await prisma.message.create({
      data: {
        userId: session.user.id,
        content: text.slice(0, 500),
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      id: msg.id,
      userId: msg.userId,
      user: msg.user.name ?? "Anonyme",
      text: msg.content,
      pinned: msg.pinned,
      isSystem: msg.isSystem,
      systemKind: msg.systemKind,
      timestamp: msg.createdAt.toISOString(),
      reactions: [],
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}