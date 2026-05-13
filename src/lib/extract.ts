
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
  // "250 000 €", "250.000€", "Prix : 180000€", "Vendu 95 000 €"
  const priceRaw = first(
    t,
    /(?:prix[^0-9]{0,20}|vendu\s+|à\s+)([\d][\d\s.]+)\s*€/i,
    /([\d][\d\s.]{4,})\s*€\s*(?:FAI|HD|HN|net|vendeur)/i,
    /([\d][\d\s.]{4,})\s*€/
  );
  const price = priceRaw ? parseNum(priceRaw) : undefined;

  // --- Surface ---
  // "65 m²", "Surface : 65,5 m²", "65m2"
  const surfaceRaw = first(
    t,
    /surface\s*(?:habitable|loi\s*carrez|totale)?\s*[:\-]?\s*([\d]+[,.]?[\d]*)\s*m[²2]/i,
    /([\d]+[,.]?[\d]*)\s*m[²2]/i
  );
  const surface = surfaceRaw ? parseNum(surfaceRaw) : undefined;

  // --- Rooms ---
  // "3 pièces", "F3", "T3"
  const roomsRaw = first(
    t,
    /([\d]+)\s*pièces?/i,
    /\b[FT]([\d])\b/,
    /([\d]+)\s*rooms?/i
  );
  const rooms = roomsRaw ? parseInt(roomsRaw, 10) : undefined;

  // --- Floor ---
  // "3ème étage", "2e étage", "RDC"
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
  // "75011 Paris", "69003 Lyon"
  let postalCode: string | undefined;
  let city = "";
  const locMatch = t.match(/\b(\d{5})\s+([A-ZÀ-Ÿa-zà-ÿ][A-ZÀ-Ÿa-zà-ÿ\s\-]{2,30})/);
  if (locMatch) {
    postalCode = locMatch[1];
    city = locMatch[2].trim();
  } else {
    // Try known city names
    const cityMatch = t.match(
      /\b(Paris|Lyon|Marseille|Bordeaux|Toulouse|Nice|Nantes|Strasbourg|Montpellier|Lille|Rennes|Reims|Toulon|Grenoble|Dijon|Angers|Nîmes|Villeurbanne|Le\s+Mans|Aix-en-Provence|Brest|Tours|Amiens|Limoges|Clermont-Ferrand|Rouen)\b/i
    );
    if (cityMatch) city = cityMatch[1];
  }

  // --- Address ---
  // Look for "rue", "avenue", "boulevard", "allée", etc.
  let address = "";
  const addrMatch = t.match(
    /(\d+[,\s]+(?:bis|ter)?\s*(?:rue|avenue|av\.|boulevard|bd\.?|allée|impasse|chemin|place|cours|quai|route)\s+[^\n,;]{3,50})/i
  );
  if (addrMatch) {
    address = addrMatch[1].trim();
  }

  // --- Renovation ---
  // "travaux estimés à 20 000 €", "budget travaux : 15 000 - 25 000 €"
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
  // "loyer estimé : 800 €", "loyer mensuel : 750 - 900 €"
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
    // Sanity check: monthly rent should be < 10 000
    if (v < 10000) {
      rentMin = v;
      rentMax = v;
    }
  }

  // --- Description: first meaningful paragraph ---
  const lines = t
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 40 && !/^\d/.test(l));
  const description = lines[0]?.slice(0, 200) || undefined;

  return {
    address,
    city,
    postalCode,
    surface,
    rooms,
    floor,
    type,
    price,
    notaryFees: undefined,
    renovMin,
    renovMax,
    rentMin,
    rentMax,
    description,
    rawText: t.slice(0, 3000),
  };
}

export async function extractFromPdf(buffer: Buffer): Promise<ExtractedProperty> {
  // Lazy require to avoid module-init issues at build time
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
  const data = await pdfParse(buffer);
  return extractFromText(data.text);
}
