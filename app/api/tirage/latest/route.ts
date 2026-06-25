import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const event = await prisma.tirageEvent.findFirst({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(event ?? null);
}
