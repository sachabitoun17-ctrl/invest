import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const properties = await prisma.property.findMany({
    include: { votes: true },
    orderBy: { createdAt: "desc" },
  });
  const res = NextResponse.json(properties);
  res.headers.set("Cache-Control", "public, s-maxage=5, stale-while-revalidate=30");
  return res;
}
