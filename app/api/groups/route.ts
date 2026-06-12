import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GROUP_COOKIE, newGroupToken, getMyGroups } from "@/lib/groups";

const createSchema = z.object({ name: z.string().min(2).max(40) });

/** Liste les groupes de l'utilisateur connecté. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const groups = await getMyGroups(session.user.id);
  return NextResponse.json({ groups });
}

/** Crée un groupe et y ajoute le créateur (OWNER). Le groupe devient actif. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Nom de groupe invalide (2 à 40 caractères)." }, { status: 400 });
  }

  try {
    const group = await prisma.group.create({
      data: {
        name: parsed.data.name.trim(),
        token: newGroupToken(),
        createdBy: session.user.id,
        members: { create: { userId: session.user.id, role: "OWNER" } },
      },
    });

    const jar = await cookies();
    jar.set(GROUP_COOKIE, group.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    return NextResponse.json({ ok: true, id: group.id, token: group.token });
  } catch (err) {
    console.error("[groups] création échouée:", err);
    return NextResponse.json({ error: "Création impossible." }, { status: 500 });
  }
}
