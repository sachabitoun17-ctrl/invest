import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ExtractedProperty {
  address: string;
  city: string;
  postalCode?: string;
  surface: number;
  rooms?: number;
  floor?: number;
  type?: string;
  price: number;
  notaryFees?: number;
  renovMin?: number;
  renovMax?: number;
  rentMin?: number;
  rentMax?: number;
  description?: string;
}

const SYSTEM = `Tu es un assistant spécialisé dans l'immobilier français.
Extrais les informations clés d'une annonce immobilière et retourne un JSON strict.
Utilise uniquement les informations présentes dans le texte — ne devine pas.
Pour les loyers, si non mentionnés, laisse null.
Tous les montants en euros (nombre sans symbole).`;

const PROMPT = `Extrais les données de cette annonce immobilière et retourne UNIQUEMENT un objet JSON valide avec ces champs :
{
  "address": "adresse complète (rue + numéro)",
  "city": "ville",
  "postalCode": "code postal ou null",
  "surface": nombre en m²,
  "rooms": nombre de pièces ou null,
  "floor": étage ou null,
  "type": "appartement" | "maison" | "studio" | "duplex" | autre ou null,
  "price": prix de vente en euros (nombre entier),
  "notaryFees": frais de notaire en euros ou null,
  "renovMin": estimation basse des travaux en euros ou null,
  "renovMax": estimation haute des travaux en euros ou null,
  "rentMin": loyer mensuel minimum estimé en euros ou null,
  "rentMax": loyer mensuel maximum estimé en euros ou null,
  "description": résumé en 1-2 phrases ou null
}

Ne retourne que le JSON, sans markdown ni explication.`;

export async function extractFromPdf(
  pdfBase64: string
): Promise<ExtractedProperty> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned) as ExtractedProperty;
}

export async function extractFromText(
  text: string
): Promise<ExtractedProperty> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `${PROMPT}\n\nTexte de l'annonce :\n${text}`,
      },
    ],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned) as ExtractedProperty;
}
