import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, value, comment } = await req.json();

  if (!["sacha", "ilanna", "benjamin"].includes(user)) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }
  if (!["yes", "no", "maybe"].includes(value)) {
    return NextResponse.json({ error: "Invalid vote value" }, { status: 400 });
  }

  const vote = await prisma.vote.upsert({
    where: { user_propertyId: { user, propertyId: id } },
    update: { value, comment: comment ?? null },
    create: { user, value, comment: comment ?? null, propertyId: id },
  });

  return NextResponse.json(vote);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user } = await req.json();

  await prisma.vote.deleteMany({
    where: { propertyId: id, user },
  });

  return NextResponse.json({ ok: true });
}
