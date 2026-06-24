import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function adminOnly() {
  return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
}

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return adminOnly();

  await prisma.$transaction(async (tx) => {
    await tx.reaction.deleteMany();
    await tx.pushSubscription.deleteMany();
    await tx.bet.deleteMany();
    await tx.championBet.deleteMany();
    await tx.message.deleteMany();
    await tx.match.deleteMany();
    await tx.finalSeries.deleteMany();
    await tx.team.deleteMany();
    await tx.pool.deleteMany();
    await tx.user.deleteMany({ where: { role: { not: "ADMIN" } } });
    await tx.user.updateMany({
      where: { role: "ADMIN" },
      data: { wizzBalance: 100, jokersLeft: 2, hasSeenWelcome: true, previousWizzRank: null },
    });
  });

  return NextResponse.json({ success: true });
}
