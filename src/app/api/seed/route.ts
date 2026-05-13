import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const existing = await prisma.property.count();
  if (existing > 0) {
    return NextResponse.json({ seeded: false, message: "already has data" });
  }

  await prisma.property.createMany({
    data: [
      {
        address: "23 rue de la Roquette",
        city: "Paris",
        postalCode: "75011",
        lat: 48.8534,
        lng: 2.3752,
        surface: 28,
        rooms: 1,
        price: 195000,
        rentMin: 850,
        rentMax: 950,
        renovMin: 5000,
        renovMax: 10000,
        strategy: "B",
        dpe: "D",
        type: "Studio",
        description: "Studio bien placé Bastille, fort potentiel locatif.",
      },
      {
        address: "12 avenue Gambetta",
        city: "Montreuil",
        postalCode: "93100",
        lat: 48.8637,
        lng: 2.4427,
        surface: 62,
        rooms: 3,
        price: 320000,
        rentMin: 1400,
        rentMax: 1600,
        renovMin: 15000,
        renovMax: 30000,
        strategy: "B",
        dpe: "C",
        marketPriceM2: 5800,
        type: "Appartement",
        description: "T3 lumineux proche Paris, belle décote par rapport au marché.",
      },
      {
        address: "8 rue Custine",
        city: "Paris",
        postalCode: "75018",
        lat: 48.8892,
        lng: 2.3489,
        surface: 45,
        rooms: 2,
        price: 298000,
        renovMin: 40000,
        renovMax: 70000,
        strategy: "A",
        dpe: "F",
        marketPriceM2: 9200,
        type: "Appartement",
        description: "T2 Montmartre à rénover, fort potentiel de plus-value revente.",
      },
      {
        address: "34 rue Gabriel Péri",
        city: "Saint-Denis",
        postalCode: "93200",
        lat: 48.9362,
        lng: 2.3573,
        surface: 78,
        rooms: 4,
        price: 265000,
        rentMin: 1600,
        rentMax: 1900,
        renovMin: 20000,
        renovMax: 40000,
        strategy: "B",
        dpe: "D",
        type: "Appartement",
        description: "Grand T4 Saint-Denis, rendement locatif attractif secteur en mutation.",
      },
      {
        address: "5 rue de Fontenay",
        city: "Vincennes",
        postalCode: "94300",
        lat: 48.8478,
        lng: 2.4392,
        surface: 42,
        rooms: 2,
        price: 375000,
        rentMin: 1300,
        rentMax: 1500,
        renovMin: 8000,
        renovMax: 15000,
        strategy: "B",
        dpe: "B",
        marketPriceM2: 9800,
        type: "Appartement",
        description: "T2 Vincennes calme et lumineux, DPE exceptionnel, secteur très demandé.",
      },
    ],
  });

  const properties = await prisma.property.findMany({ include: { votes: true } });
  return NextResponse.json({ seeded: true, properties });
}
