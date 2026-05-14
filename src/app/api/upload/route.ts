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

    // Pre-validated JSON from review form → save directly
    const jsonData = formData.get("data") as string | null;
    if (jsonData) {
      const data = JSON.parse(jsonData) as ExtractedProperty & {
        address: string;
        city: string;
        surface: number;
        price: number;
        pdfName?: string;
        strategy?: string;
        marketPriceM2?: number;
        transport?: string;
      };
      const coords = data.address && data.city
        ? await geocode(data.address, data.city)
        : null;

      const property = await prisma.property.create({
        data: {
          address: data.address,
          city: data.city,
          postalCode: data.postalCode ?? null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          surface: data.surface,
          rooms: data.rooms ?? null,
          floor: data.floor ?? null,
          type: data.type ?? null,
          price: data.price,
          notaryFees: data.notaryFees ?? null,
          renovMin: data.renovMin ?? null,
          renovMax: data.renovMax ?? null,
          rentMin: data.rentMin ?? null,
          rentMax: data.rentMax ?? null,
          strategy: data.strategy ?? null,
          marketPriceM2: data.marketPriceM2 ?? null,
          dpe: data.dpe ?? null,
          transport: data.transport ?? null,
          description: data.description ?? null,
          pdfName: data.pdfName ?? null,
        },
        include: { votes: true },
      });

      return NextResponse.json(property);
    }

    // Extract from source
    let extracted: ExtractedProperty;
    let pdfName: string | undefined;

    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        return NextResponse.json({ error: "PDF trop volumineux (max 15 Mo)" }, { status: 400 });
      }
      const bytes = await file.arrayBuffer();
      pdfName = file.name;
      extracted = await extractFromPdf(Buffer.from(bytes));
    } else if (url) {
      let parsed: URL;
      try { parsed = new URL(url); } catch {
        return NextResponse.json({ error: "URL invalide" }, { status: 400 });
      }
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return NextResponse.json({ error: "Protocole non autorisé" }, { status: 400 });
      }
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
