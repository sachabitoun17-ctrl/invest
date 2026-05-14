import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    include: { votes: true },
  });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(property);
}

const PATCHABLE_FIELDS = new Set([
  "address", "city", "postalCode", "lat", "lng", "surface", "rooms", "floor",
  "type", "price", "notaryFees", "renovMin", "renovMax", "rentMin", "rentMax",
  "strategy", "marketPriceM2", "dpe", "transport", "description",
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const raw = await req.json();
  const data = Object.fromEntries(
    Object.entries(raw).filter(([k]) => PATCHABLE_FIELDS.has(k))
  );
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }
  const property = await prisma.property.update({
    where: { id },
    data,
    include: { votes: true },
  });
  return NextResponse.json(property);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.property.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
