import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(50).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);

  const data: Record<string, unknown> = { hasSeenWelcome: true };
  if (parsed.success && parsed.data.name) data.name = parsed.data.name;

  await prisma.user.update({ where: { id: session.user.id }, data });
  return NextResponse.json({ success: true });
}
