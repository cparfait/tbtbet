import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  teamId: z.string().min(1),
  jokerUsed: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { teamId, jokerUsed } = parsed.data;

  const [team, user] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamId } }),
    prisma.user.findUnique({ where: { id: session.user.id } }),
  ]);

  if (!team) return NextResponse.json({ error: "Équipe introuvable" }, { status: 404 });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  if (jokerUsed && user.jokersLeft < 1) {
    return NextResponse.json({ error: "Plus de jokers disponibles" }, { status: 400 });
  }

  const existingBet = await prisma.championBet.findUnique({ where: { userId: user.id } });

  if (existingBet) {
    return NextResponse.json(
      { error: "Tu as déjà choisi ton équipe favorite. Ce choix est définitif." },
      { status: 400 }
    );
  }

  await prisma.championBet.create({
    data: { userId: user.id, teamId, amountWizz: 0, jokerUsed: false },
  });

  return NextResponse.json({ success: true });
}
