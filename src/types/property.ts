export interface PropertyWithVotes {
  id: string;
  createdAt: string;
  address: string;
  city: string;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
  surface: number;
  rooms: number | null;
  floor: number | null;
  type: string | null;
  price: number;
  notaryFees: number | null;
  renovMin: number | null;
  renovMax: number | null;
  rentMin: number | null;
  rentMax: number | null;
  description: string | null;
  pdfName: string | null;
  votes: Vote[];
}

export interface Vote {
  id: string;
  user: string;
  value: string;
  comment: string | null;
  createdAt: string;
}

export interface PropertyMetrics {
  totalMin: number;
  totalMax: number;
  yieldMin: number | null;
  yieldMax: number | null;
  pricePerM2: number;
  score: number;
}

export function computeMetrics(p: PropertyWithVotes): PropertyMetrics {
  const notary = p.notaryFees ?? p.price * 0.08;
  const renovMin = p.renovMin ?? 0;
  const renovMax = p.renovMax ?? renovMin;
  const totalMin = p.price + notary + renovMin;
  const totalMax = p.price + notary + renovMax;

  const yieldMin =
    p.rentMax && totalMax > 0
      ? ((p.rentMax * 12) / totalMax) * 100
      : null;
  const yieldMax =
    p.rentMin && totalMin > 0
      ? ((p.rentMin * 12) / totalMin) * 100
      : null;

  const pricePerM2 = p.price / p.surface;

  // Score 0-100: weighted average of yield and price/m²
  // yield target: 8%+ = 100, 4% = 50, <3% = 10
  const yieldScore = yieldMin
    ? Math.min(100, Math.max(0, (yieldMin / 8) * 100))
    : 0;
  // price/m²: <2000 = 100, 4000 = 50, >6000 = 10
  const pm2Score = Math.min(100, Math.max(0, 100 - (pricePerM2 / 6000) * 90));
  const score = Math.round(yieldScore * 0.7 + pm2Score * 0.3);

  return { totalMin, totalMax, yieldMin, yieldMax, pricePerM2, score };
}

export const USERS = ["sacha", "ilanna", "benjamin"] as const;
export type User = (typeof USERS)[number];
