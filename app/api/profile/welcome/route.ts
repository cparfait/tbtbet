import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { hasSeenWelcome: true },
  });

  return NextResponse.json({ success: true });
}
