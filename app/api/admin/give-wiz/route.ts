import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ amount: z.number().int().min(1).max(10000) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const caller = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Montant invalide (1–10000)" }, { status: 400 });
  }

  const { amount } = parsed.data;
  const { count } = await prisma.user.updateMany({
    where: { banned: false },
    data: { wizzBalance: { increment: amount } },
  });

  return NextResponse.json({ success: true, usersUpdated: count, amount });
}
