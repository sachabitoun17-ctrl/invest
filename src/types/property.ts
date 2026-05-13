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
  strategy: string | null;       // "A" | "B" | "AB"
  marketPriceM2: number | null;  // prix marché €/m² référence
  dpe: string | null;
  transport: string | null;
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
  totalMid: number;
  pricePerM2: number;
  // Strategy B — rental yield
  grossYield: number | null;   // % based on mid rent + mid total
  yieldMin: number | null;
  yieldMax: number | null;
  cashflowEst: number | null;  // rough annual estimate (needs financing assumptions)
  // Strategy A — resale margin
  discount: number | null;     // % discount vs marketPriceM2
  // Budget check
  budgetOk: boolean;
  // Score 0-100
  score: number;
  scoreLabel: string;
}

const BUDGET_MIN = 100_000;
const BUDGET_MAX = 800_000;

export function computeMetrics(p: PropertyWithVotes): PropertyMetrics {
  const notary = p.notaryFees ?? p.price * 0.08;
  const renovMid = p.renovMin != null
    ? ((p.renovMin + (p.renovMax ?? p.renovMin)) / 2)
    : 0;
  const totalMin = p.price + notary + (p.renovMin ?? 0);
  const totalMax = p.price + notary + (p.renovMax ?? p.renovMin ?? 0);
  const totalMid = p.price + notary + renovMid;
  const pricePerM2 = p.price / p.surface;

  // Gross yield (Strategy B)
  const avgRent = p.rentMin != null
    ? ((p.rentMin + (p.rentMax ?? p.rentMin)) / 2)
    : null;
  const grossYield = avgRent && totalMid > 0
    ? (avgRent * 12 / totalMid) * 100
    : null;
  const yieldMin = avgRent && totalMax > 0
    ? (avgRent * 12 / totalMax) * 100 : null;
  const yieldMax = avgRent && totalMin > 0
    ? (avgRent * 12 / totalMin) * 100 : null;

  // Rough cash-flow (assumes ~70% financing at 4%, 20 years)
  const loanAmount = totalMid * 0.7;
  const monthlyRate = 0.04 / 12;
  const months = 240;
  const monthlyPayment = loanAmount *
    (monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);
  const cashflowEst = avgRent
    ? Math.round((avgRent - monthlyPayment) * 12)
    : null;

  // Price discount vs market (Strategy A)
  const discount = p.marketPriceM2
    ? Math.round((1 - pricePerM2 / p.marketPriceM2) * 100)
    : null;

  // Budget check
  const budgetOk = totalMid >= BUDGET_MIN && totalMid <= BUDGET_MAX;

  // ── Score 0-100 ──────────────────────────────────────────────
  // Based on cahier des charges: primary = yield (Strat B) + discount (Strat A)
  let yieldScore = 0;
  if (grossYield !== null) {
    if (grossYield >= 9)      yieldScore = 100;
    else if (grossYield >= 8) yieldScore = 90;
    else if (grossYield >= 7) yieldScore = 75;
    else if (grossYield >= 6) yieldScore = 55;
    else if (grossYield >= 5) yieldScore = 35;
    else                      yieldScore = 10;
  }

  let discountScore = 0;
  if (discount !== null) {
    if (discount >= 20)      discountScore = 100;
    else if (discount >= 15) discountScore = 85;
    else if (discount >= 10) discountScore = 60;
    else if (discount >= 5)  discountScore = 35;
    else if (discount >= 0)  discountScore = 10;
    else                     discountScore = 0; // above market
  } else {
    // No market reference: use raw price/m² as rough proxy
    if (pricePerM2 < 4000)       discountScore = 60;
    else if (pricePerM2 < 6000)  discountScore = 40;
    else if (pricePerM2 < 8000)  discountScore = 25;
    else if (pricePerM2 < 10000) discountScore = 15;
    else                         discountScore = 5;
  }

  // Weight depends on available data and strategy
  let score: number;
  if (grossYield !== null && discount !== null) {
    score = Math.round(yieldScore * 0.5 + discountScore * 0.5);
  } else if (grossYield !== null) {
    score = Math.round(yieldScore * 0.7 + discountScore * 0.3);
  } else {
    score = Math.round(discountScore);
  }

  // Penalty: budget out of range
  if (!budgetOk) score = Math.max(0, score - 15);

  const scoreLabel =
    score >= 80 ? "Excellent" :
    score >= 65 ? "Très bon" :
    score >= 50 ? "Bon" :
    score >= 35 ? "Moyen" : "Faible";

  return {
    totalMin, totalMax, totalMid, pricePerM2,
    grossYield, yieldMin, yieldMax, cashflowEst,
    discount, budgetOk, score, scoreLabel,
  };
}

export const USERS = ["sacha", "ilanna", "benjamin"] as const;
export type User = (typeof USERS)[number];
