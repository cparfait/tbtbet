import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  player1: z.string().nullable().optional(),
  player2: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  poolId: z.string().nullable().optional(),
  name: z.string().optional(),
  player1: z.string().nullable().optional(),
  player2: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  eliminated: z.boolean().optional(),
  losses: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const team = await prisma.team.create({ data: parsed.data });
  return NextResponse.json(team);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { id, ...data } = parsed.data;
  const team = await prisma.team.update({ where: { id }, data });
  return NextResponse.json(team);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  }

  await prisma.team.delete({ where: { id } });
  return NextResponse.json({ success: true });
}