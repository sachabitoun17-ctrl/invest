import { NextRequest, NextResponse } from "next/server";
import { extractFromPdf, extractFromText, extractFromUrl, ExtractedProperty } from "@/lib/extract";
import { geocode } from "@/lib/geocode";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const manualText = formData.get("text") as string | null;
    const url = formData.get("url") as string | null;

    const jsonData = formData.get("data") as string | null;
    if (jsonData) {
      const data = JSON.parse(jsonData) as ExtractedProperty & {
        address: string; city: string; surface: number; price: number; pdfName?: string;
      };
      const coords = data.address && data.city ? await geocode(data.address, data.city) : null;
      const property = await prisma.property.create({
        data: {
          address: data.address, city: data.city, postalCode: data.postalCode ?? null,
          lat: coords?.lat ?? null, lng: coords?.lng ?? null,
          surface: data.surface, rooms: data.rooms ?? null, floor: data.floor ?? null,
          type: data.type ?? null, price: data.price, notaryFees: data.notaryFees ?? null,
          renovMin: data.renovMin ?? null, renovMax: data.renovMax ?? null,
          rentMin: data.rentMin ?? null, rentMax: data.rentMax ?? null,
          description: data.description ?? null, pdfName: data.pdfName ?? null,
        },
        include: { votes: true },
      });
      return NextResponse.json(property);
    }

    let extracted: ExtractedProperty;
    let pdfName: string | undefined;

    if (file) {
      const bytes = await file.arrayBuffer();
      pdfName = file.name;
      extracted = await extractFromPdf(Buffer.from(bytes));
    } else if (url) {
      extracted = await extractFromUrl(url);
    } else if (manualText) {
      extracted = extractFromText(manualText);
    } else {
      return NextResponse.json({ error: "Aucune source fournie" }, { status: 400 });
    }

    return NextResponse.json({ extracted, pdfName });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction failed" },
      { status: 500 }
    );
  }
}
