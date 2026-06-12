import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GROUP_COOKIE } from "@/lib/groups";

const joinSchema = z.object({ token: z.string().min(8) });

/** Rejoint un groupe via son token d'invitation. Idempotent. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const parsed = joinSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  }

  try {
    const group = await prisma.group.findUnique({
      where: { token: parsed.data.token },
      select: { id: true, name: true },
    });
    if (!group) {
      return NextResponse.json({ error: "Ce groupe n'existe pas (lien invalide)." }, { status: 404 });
    }

    // Adhésion idempotente.
    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
      create: { groupId: group.id, userId: session.user.id, role: "MEMBER" },
      update: {},
    });

    const jar = await cookies();
    jar.set(GROUP_COOKIE, group.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    return NextResponse.json({ ok: true, id: group.id, name: group.name });
  } catch (err) {
    console.error("[groups/join] échec:", err);
    return NextResponse.json({ error: "Impossible de rejoindre le groupe." }, { status: 500 });
  }
}
