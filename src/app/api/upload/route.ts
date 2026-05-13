import { NextRequest, NextResponse } from "next/server";
import { extractFromPdf, extractFromText } from "@/lib/extract";
import { geocode } from "@/lib/geocode";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const manualText = formData.get("text") as string | null;

    if (!file && !manualText) {
      return NextResponse.json({ error: "No file or text provided" }, { status: 400 });
    }

    let extracted;
    let pdfName: string | undefined;

    if (file) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      pdfName = file.name;
      extracted = await extractFromPdf(base64);
    } else {
      extracted = await extractFromText(manualText!);
    }

    const coords = await geocode(extracted.address, extracted.city);

    const property = await prisma.property.create({
      data: {
        address: extracted.address,
        city: extracted.city,
        postalCode: extracted.postalCode ?? null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        surface: extracted.surface,
        rooms: extracted.rooms ?? null,
        floor: extracted.floor ?? null,
        type: extracted.type ?? null,
        price: extracted.price,
        notaryFees: extracted.notaryFees ?? null,
        renovMin: extracted.renovMin ?? null,
        renovMax: extracted.renovMax ?? null,
        rentMin: extracted.rentMin ?? null,
        rentMax: extracted.rentMax ?? null,
        description: extracted.description ?? null,
        pdfName: pdfName ?? null,
      },
      include: { votes: true },
    });

    return NextResponse.json(property);
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction failed" },
      { status: 500 }
    );
  }
}
