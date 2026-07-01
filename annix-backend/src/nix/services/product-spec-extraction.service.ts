import { Injectable, Logger } from "@nestjs/common";
import { AiChatService } from "../ai-providers/ai-chat.service";
import { hardenedExtractionSystemInstruction } from "../ai-providers/untrusted-content";

// Extracted from NixService (#430 Phase 4) — reads a coating/lining product
// data sheet (PDF / image) via Gemini vision and returns the quoter-friendly
// brand + description used by the QuoteSpecsEditor supplier rows.
@Injectable()
export class ProductSpecExtractionService {
  private readonly logger = new Logger(ProductSpecExtractionService.name);

  constructor(private readonly aiChatService: AiChatService) {}

  /**
   * Reads a single product data sheet (PDF / image) and returns the brand
   * and a quoter-friendly product description, formatted to match the
   * supplier-row layout in the QuoteSpecsEditor.
   *
   *  - For coatings: brand = manufacturer (e.g. 'Stoncor'), description =
   *    products + DFT µm (e.g. 'Carboguard 890 Aluminium @ 100-150μm,
   *    Carbothane 137 HS @ 50-100μm').
   *  - For linings: brand left blank (linings are single-product),
   *    description = thickness, hardness, colour, bond + cure method
   *    (e.g. '6 mm bore, 3 mm flange, hot-bonded, autoclave vulcanised, red').
   *
   * Used by the 'Upload data sheet' affordance on each custom supplier row
   * — the auto-fill saves the quoter from re-typing what the data sheet
   * already says, while still letting them edit the result before the
   * quote is sent.
   */
  async extractProductSpec(
    fileBuffer: Buffer,
    mimeType: string,
    kind: "coating" | "lining",
  ): Promise<{ brand: string | null; description: string | null }> {
    const base64 = fileBuffer.toString("base64");
    const mediaType = this.normaliseDataSheetMediaType(mimeType);
    if (!mediaType) {
      this.logger.warn(`Unsupported data sheet media type: ${mimeType}`);
      return { brand: null, description: null };
    }

    const systemPrompt = hardenedExtractionSystemInstruction(
      `You read product data sheets and emit a single JSON object: {"brand": string|null, "description": string|null}. No prose, no markdown — JSON only. Use null when the field is genuinely absent. Never invent values.`,
    );

    const userPrompt =
      kind === "coating" ? this.coatingDataSheetPrompt() : this.liningDataSheetPrompt();

    try {
      const result = await this.aiChatService.chatWithImage(
        base64,
        mediaType,
        userPrompt,
        systemPrompt,
        { temperature: 0.1, maxOutputTokens: 1024, responseFormat: "json" },
      );
      return this.parseProductSpecResponse(result.content);
    } catch (error) {
      this.logger.warn(
        `Product spec extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return { brand: null, description: null };
    }
  }

  private coatingDataSheetPrompt(): string {
    return [
      "Read this paint / coating product data sheet and produce ONE supplier entry suitable for a customer-facing quote.",
      "",
      'Return JSON shape: {"brand": string, "description": string}.',
      "",
      "- `brand` is the manufacturer / supplier (e.g. 'Stoncor', 'Carboline', 'Corrocoat', 'Hempel', 'Jotun', 'Sigma', 'International Paint', 'Sherwin-Williams'). Just the company name. Do NOT put the product name in `brand`.",
      "- `description` is the line a quoter would write next to that brand. Most product data sheets describe a SINGLE coat (the product), so usually one '<Product name> @ <DFT range>μm' entry. If the sheet describes a multi-coat system, list each coat separated by ', '.",
      "  - Use ranges like '100-150μm' when the sheet gives a recommended DFT range, otherwise the single recommended value.",
      "  - Append ', colour: <name>' or ', RAL <number>' ONLY if the sheet specifies a colour for THIS coat (skip generic 'available colours' lists).",
      "  - Skip product codes, certification numbers, marketing copy, ingredient breakdowns, and application instructions.",
      "",
      "Example outputs:",
      "  Single coat: 'Carboguard 890 Aluminium @ 100-150μm'",
      "  System: 'Carboguard 890 Aluminium @ 100-150μm, Carbothane 137 HS @ 50-100μm, colour: RAL 5012'",
      "",
      "If the document is genuinely not a paint product data sheet (e.g. it's a rubber lining, a generic spec, an invoice), return both fields as null.",
    ].join("\n");
  }

  private liningDataSheetPrompt(): string {
    return [
      'Read this rubber / polymer / elastomer lining or sheeting product data sheet. Return JSON: {"brand": null, "description": string}.',
      "",
      "`brand` stays null — linings are quoted as a single product and the brand is captured elsewhere as the spec code.",
      "",
      "`description` is a single comma-separated line of THIS PRODUCT'S properties, drawn ONLY from what the data sheet actually states. Include each field below only when the data sheet specifies it, in this order:",
      "  1. Hardness (e.g. '60 Shore A', '70 Shore A')",
      "  2. Cure method (e.g. 'steam cured', 'autoclave vulcanised', 'press cured', 'CSV cured')",
      "  3. Bonding compatibility (e.g. 'hot-bonded', 'cold-bonded', 'self-adhesive')",
      "  4. Polymer family (e.g. 'natural rubber', 'silica-reinforced natural rubber', 'NBR', 'EPDM', 'butyl', 'neoprene')",
      "  5. Specific gravity if given (e.g. 'SG 1.05')",
      "  6. Tensile strength if given (e.g. '24 MPa tensile')",
      "  7. Abrasion / wear resistance class if given",
      "  8. Colour (e.g. 'red', 'black', 'tan', 'natural')",
      "",
      "Example outputs:",
      "  '60 Shore A, steam cured, hot-bonded, natural rubber, red'",
      "  '50 Shore A, autoclave vulcanised, silica-reinforced natural rubber, red'",
      "  '70 Shore A, NBR, oil resistant, black'",
      "",
      "Important: bore thickness and flange thickness do NOT come from product data sheets — those are application-specific and entered elsewhere by the quoter. Don't try to extract them.",
      "",
      "Drop any field that isn't explicitly on the data sheet — don't invent values to pad the line. Most rubber data sheets give hardness + cure method + colour at minimum, so you should normally have at least three fields. Only return description as null if this is genuinely not a rubber/polymer product data sheet.",
    ].join("\n");
  }

  private normaliseDataSheetMediaType(
    mimeType: string,
  ): "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf" | null {
    const lower = mimeType.toLowerCase();
    if (lower === "application/pdf") return "application/pdf";
    if (lower === "image/jpeg" || lower === "image/jpg") return "image/jpeg";
    if (lower === "image/png") return "image/png";
    if (lower === "image/gif") return "image/gif";
    if (lower === "image/webp") return "image/webp";
    return null;
  }

  private parseProductSpecResponse(raw: string): {
    brand: string | null;
    description: string | null;
  } {
    const empty = { brand: null, description: null };
    if (!raw || raw.trim().length === 0) return empty;
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    try {
      const parsed = JSON.parse(cleaned) as { brand?: unknown; description?: unknown };
      const brand =
        typeof parsed.brand === "string" && parsed.brand.trim().length > 0
          ? parsed.brand.trim()
          : null;
      const description =
        typeof parsed.description === "string" && parsed.description.trim().length > 0
          ? parsed.description.trim()
          : null;
      return { brand, description };
    } catch (error) {
      this.logger.warn(
        `Failed to parse product spec response as JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return empty;
    }
  }
}
