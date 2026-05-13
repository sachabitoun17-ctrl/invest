
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
  dpe?: string;
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
  // Strip "Ref : XXXX" patterns first so ref numbers don't bleed into price
  const tClean = t.replace(/r[eé]f(?:[eé]rence)?\s*[:\-]?\s*\d[\d\s]*/gi, "");

  const priceRaw = first(
    tClean,
    /(?:prix[^0-9]{0,20}|vendu\s+|à\s+)([\d][\d\s.]+)\s*€/i,
    /([\d][\d\s.]{4,})\s*€\s*(?:FAI|HD|HN|net|vendeur)/i,
    /(?:prix[^0-9]{0,20})([\d][\d\s.]+)\s*euros/i,
    /([\d][\d\s.]{4,})\s*euros/i,
    /([\d][\d\s.]{4,})\s*€/
  );
  const priceRaw2 = priceRaw ? parseNum(priceRaw) : undefined;
  // Sanity check: prices must be between 10k and 20M€
  const price = priceRaw2 && priceRaw2 >= 10_000 && priceRaw2 <= 20_000_000 ? priceRaw2 : undefined;

  // --- Surface ---
  // "Surface habitable36.12 m²" or "Surface17.76 m2" (no space between label and value)
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
  // "3ème étage", "2e étage", "RDC", "Etage4" (concatenated)
  let floor: number | undefined;
  if (/\b(?:rez[- ]de[- ]chaussée|RDC)\b/i.test(t)) {
    floor = 0;
  } else {
    const floorRaw = first(
      t,
      /(\d+)\s*(?:er|ème|e|eme)\s*étage/i,
      /[Éé]tage\s*[:\-]?\s*(\d+)/i,
      /[Ee]tage\s*[:\-]?\s*(\d+)/i
    );
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
  // "75011 Paris", "69003 Lyon", "Code postal75017" + "VillePARIS" (concatenated)
  let postalCode: string | undefined;
  let city = "";

  // Laforêt / concatenated-label formats
  const cpLabelMatch = t.match(/[Cc]ode\s*postal[:\s]*(\d{5})/);
  if (cpLabelMatch) postalCode = cpLabelMatch[1];
  const cityLabelMatch = t.match(/[Vv]ille[:\s]*([A-ZÀ-Ÿa-zà-ÿ][A-ZÀ-Ÿa-zà-ÿ\s\-]{1,40})/);
  if (cityLabelMatch) city = cityLabelMatch[1].trim();

  // Standard "75011 Paris" pattern (fills anything still missing)
  const locMatch = t.match(/\b(\d{5})\s+([A-ZÀ-Ÿa-zà-ÿ][A-ZÀ-Ÿa-zà-ÿ\s\-]{2,30})/);
  if (locMatch) {
    if (!postalCode) postalCode = locMatch[1];
    if (!city) city = locMatch[2].trim();
  }

  if (!city) {
    // Try known city names
    const cityMatch = t.match(
      /\b(Paris|Lyon|Marseille|Bordeaux|Toulouse|Nice|Nantes|Strasbourg|Montpellier|Lille|Rennes|Reims|Toulon|Grenoble|Dijon|Angers|Nîmes|Villeurbanne|Le\s+Mans|Aix-en-Provence|Levallois|Brest|Tours|Amiens|Limoges|Clermont-Ferrand|Rouen)\b/i
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
    // Sanity check: monthly rent should be < 10 000
    if (v < 10000) {
      rentMin = v;
      rentMax = v;
    }
  }

  // --- DPE ---
  // "Consommation énergie primaireF", "CLASSE ÉNERGIED220", "DPE : C"
  let dpe: string | undefined;
  const dpeMatch = t.match(
    /(?:classe\s+énergi[ée]\s*|consommation\s+énergie\s+\w+\s*|étiquette\s+énergi[ée][:\s]*|dpe\s*[:\-]?\s*)([A-G])(?=\d|\b)/i
  );
  if (dpeMatch) dpe = dpeMatch[1].toUpperCase();

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
    dpe,
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

  // Try JSON-LD first (SeLoger, LeBonCoin etc. embed structured data)
  let jsonText = "";
  const scripts = root.querySelectorAll('script[type="application/ld+json"]');
  for (const s of scripts) {
    try {
      const data = JSON.parse(s.text);
      jsonText += JSON.stringify(data) + " ";
    } catch { /* skip malformed */ }
  }

  // Remove scripts, styles, nav, footer for cleaner text
  for (const el of root.querySelectorAll("script,style,nav,footer,header,noscript")) {
    el.remove();
  }

  const pageText = root.structuredText
    .replace(/\s{3,}/g, "\n")
    .trim();

  return extractFromText(jsonText + "\n" + pageText);
}
