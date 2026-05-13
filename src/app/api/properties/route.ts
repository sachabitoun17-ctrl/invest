import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const properties = await prisma.property.findMany({
    include: { votes: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(properties);
}
