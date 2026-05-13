
export interface ExtractedProperty {
  address: string;
  city: string;
  postalCode?: string;
  surface?: number;
  rooms?: number;
  floor?: number;
  type?: string;
  price?: number;
  notaryFees?: number;
  renovMin?: number;
  renovMax?: number;
  rentMin?: number;
  rentMax?: number;
  description?: string;
  rawText?: string;
}

// Parse a French number like "250 000" or "250.000" or "250000"
function parseNum(s: string): number {
  return parseFloat(s.replace(/[\s.]/g, "").replace(",", "."));
}

function first(text: string, ...patterns: RegExp[]): string | undefined {
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1];
  }
}

export function extractFromText(text: string): ExtractedProperty {
  const t = text;

  // --- Price ---
  const priceRaw = first(
    t,
    /(?:prix[^0-9]{0,20}|vendu\s+|à\s+)([\d][\d\s.]+)\s*€/i,
    /([\d][\d\s.]{4,})\s*€\s*(?:FAI|HD|HN|net|vendeur)/i,
    /([\d][\d\s.]{4,})\s*€/
  );
  const price = priceRaw ? parseNum(priceRaw) : undefined;

  // --- Surface ---
  const surfaceRaw = first(
    t,
    /surface\s*(?:habitable|loi\s*carrez|totale)?\s*[:\-]?\s*([\d]+[,.]?[\d]*)\s*m[²2]/i,
    /([\d]+[,.]?[\d]*)\s*m[²2]/i
  );
  const surface = surfaceRaw ? parseNum(surfaceRaw) : undefined;

  // --- Rooms ---
  const roomsRaw = first(
    t,
    /([\d]+)\s*pièces?/i,
    /\b[FT]([\d])\b/,
    /([\d]+)\s*rooms?/i
  );
  const rooms = roomsRaw ? parseInt(roomsRaw, 10) : undefined;

  // --- Floor ---
  let floor: number | undefined;
  if (/\b(?:rez[- ]de[- ]chaussée|RDC)\b/i.test(t)) {
    floor = 0;
  } else {
    const floorRaw = first(t, /(\d+)\s*(?:er|ème|e|eme)\s*étage/i);
    if (floorRaw) floor = parseInt(floorRaw, 10);
  }

  // --- Type ---
  let type: string | undefined;
  if (/\bstudio\b/i.test(t)) type = "studio";
  else if (/\bduplex\b/i.test(t)) type = "duplex";
  else if (/\bloft\b/i.test(t)) type = "loft";
  else if (/\bappartement\b/i.test(t)) type = "appartement";
  else if (/\bmaison\b/i.test(t)) type = "maison";
  else if (/\bvilla\b/i.test(t)) type = "villa";

  // --- Postal code + city ---
  let postalCode: string | undefined;
  let city = "";
  const locMatch = t.match(/\b(\d{5})\s+([A-ZÀ-Ÿa-zà-ÿ][A-ZÀ-Ÿa-zà-ÿ\s\-]{2,30})/);
  if (locMatch) {
    postalCode = locMatch[1];
    city = locMatch[2].trim();
  } else {
    const cityMatch = t.match(
      /\b(Paris|Lyon|Marseille|Bordeaux|Toulouse|Nice|Nantes|Strasbourg|Montpellier|Lille|Rennes|Reims|Toulon|Grenoble|Dijon|Angers|Nîmes|Villeurbanne|Le\s+Mans|Aix-en-Provence|Brest|Tours|Amiens|Limoges|Clermont-Ferrand|Rouen)\b/i
    );
    if (cityMatch) city = cityMatch[1];
  }

  // --- Address ---
  let address = "";
  const addrMatch = t.match(
    /(\d+[,\s]+(?:bis|ter)?\s*(?:rue|avenue|av\.|boulevard|bd\.?|allée|impasse|chemin|place|cours|quai|route)\s+[^\n,;]{3,50})/i
  );
  if (addrMatch) {
    address = addrMatch[1].trim();
  }

  // --- Renovation ---
  const renovMatch = t.match(
    /(?:travaux|rénovation)[^€\n]{0,50}?([\d][\d\s.]+)\s*(?:à|[-–])\s*([\d][\d\s.]+)\s*€/i
  );
  const renovSingleMatch = t.match(
    /(?:travaux|rénovation)[^€\n]{0,50}?([\d][\d\s.]+)\s*€/i
  );
  let renovMin: number | undefined;
  let renovMax: number | undefined;
  if (renovMatch) {
    renovMin = parseNum(renovMatch[1]);
    renovMax = parseNum(renovMatch[2]);
  } else if (renovSingleMatch) {
    renovMin = parseNum(renovSingleMatch[1]);
    renovMax = renovMin;
  }

  // --- Rent ---
  const rentRangeMatch = t.match(
    /loyer[^€\n]{0,30}?([\d][\d\s.]+)\s*(?:à|[-–])\s*([\d][\d\s.]+)\s*€/i
  );
  const rentSingleMatch = t.match(/loyer[^€\n]{0,30}?([\d][\d\s]+)\s*€/i);
  let rentMin: number | undefined;
  let rentMax: number | undefined;
  if (rentRangeMatch) {
    rentMin = parseNum(rentRangeMatch[1]);
    rentMax = parseNum(rentRangeMatch[2]);
  } else if (rentSingleMatch) {
    const v = parseNum(rentSingleMatch[1]);
    if (v < 10000) { rentMin = v; rentMax = v; }
  }

  // --- Description ---
  const lines = t.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 40 && !/^\d/.test(l));
  const description = lines[0]?.slice(0, 200) || undefined;

  return {
    address, city, postalCode, surface, rooms, floor, type, price,
    notaryFees: undefined, renovMin, renovMax, rentMin, rentMax, description,
    rawText: t.slice(0, 3000),
  };
}

export async function extractFromPdf(buffer: Buffer): Promise<ExtractedProperty> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
  const data = await pdfParse(buffer);
  return extractFromText(data.text);
}

export async function extractFromUrl(url: string): Promise<ExtractedProperty> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BISInvest/1.0)",
      "Accept-Language": "fr-FR,fr;q=0.9",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Impossible de charger la page (${res.status})`);

  const html = await res.text();
  const { parse } = await import("node-html-parser");
  const root = parse(html);

  // Try JSON-LD first
  let jsonText = "";
  const scripts = root.querySelectorAll('script[type="application/ld+json"]');
  for (const s of scripts) {
    try { const data = JSON.parse(s.text); jsonText += JSON.stringify(data) + " "; }
    catch { /* skip */ }
  }

  for (const el of root.querySelectorAll("script,style,nav,footer,header,noscript")) {
    el.remove();
  }

  const pageText = root.structuredText.replace(/\s{3,}/g, "\n").trim();
  return extractFromText(jsonText + "\n" + pageText);
}
