import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.siteSetting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    return NextResponse.json(map);
  } catch {
    return NextResponse.json({});
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { key, value } = body as { key?: string; value?: string };

  if (typeof key !== "string" || typeof value !== "string") {
    return NextResponse.json({ error: "key et value requis" }, { status: 400 });
  }

  await prisma.siteSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  return NextResponse.json({ ok: true });
}
