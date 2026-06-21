import {
  defaultRubberSgByType,
  lookupRubberBondingCoverage,
  lookupRubberSgByCode,
  pricePerKgFromRoll,
  STANDARD_RUBBER_ROLL,
} from "@annix/product-data/rubber";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import * as XLSX from "xlsx";
import { AiUsageService } from "../../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../../ai-usage/entities/ai-usage-log.entity";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf";

type RubberCureType = "steam" | "chemical" | "precured";

interface ExtractedRubberProduct {
  productCode?: string;
  productName?: string | null;
  supplier?: string | null;
  family?: string | null;
  cureType?: RubberCureType | null;
  compoundType?: string | null;
  bondingType?: string | null;
  colour?: string | null;
  shoreHardness?: number | null;
  specificGravity?: number | null;
  pricePerKg?: number | null;
  costPerKg?: number | null;
  rollPrice?: number | null;
  rollThicknessMm?: number | null;
  rollWidthMm?: number | null;
  rollLengthM?: number | null;
}

interface ExtractedRubberPriceList {
  supplier?: string;
  products?: ExtractedRubberProduct[];
}

interface ExtractedBondingAgent {
  name?: string;
  packSizeLitres?: number | null;
  pricePerTin?: number | null;
  pricePerLitre?: number | null;
  areaCoverPerLitre?: number | null;
  gramsPerM2?: number | null;
}

interface ExtractedBondingAgentList {
  supplier?: string | null;
  agents?: ExtractedBondingAgent[];
}

export type RubberSgSource = "extracted" | "datasheet" | "default";
export type RubberCostSource = "extracted" | "derived-from-roll" | "missing";

export interface RubberPriceListRowPreview {
  supplier: string;
  productCode: string;
  productName: string | null;
  cureType: RubberCureType | null;
  bondingType: string | null;
  colour: string | null;
  shoreHardness: number | null;
  specificGravity: number | null;
  costPerKg: number | null;
  sgSource: RubberSgSource;
  costSource: RubberCostSource;
}

export interface RubberPriceListImportPreview {
  supplier: string;
  rows: RubberPriceListRowPreview[];
}

export interface RubberBondingAgentRowPreview {
  name: string;
  packSizeLitres: number | null;
  pricePerTin: number | null;
  pricePerLitre: number | null;
  areaCoverPerLitre: number | null;
  coverageBasis: "litre" | "gram" | "none";
  gramsPerM2: number | null;
}

export interface RubberBondingAgentImportPreview {
  supplier: string | null;
  rows: RubberBondingAgentRowPreview[];
}

const PRICE_LIST_JSON_SHAPE = `Return ONLY a JSON object, no prose:
{
  "supplier": string,
  "products": [{
    "productCode": string,
    "productName": string | null,
    "cureType": "steam" | "chemical" | "precured" | null,
    "compoundType": string | null,
    "colour": string | null,
    "shoreHardness": number | null,
    "specificGravity": number | null,
    "pricePerKg": number | null,
    "rollPrice": number | null,
    "rollThicknessMm": number | null,
    "rollWidthMm": number | null,
    "rollLengthM": number | null
  }]
}`;

const PRICE_LIST_RULES = `These price lists arrive in THREE supplier layouts. Recognise which one you are reading and map every row to the schema:

LAYOUT A — full columnar (e.g. "AU-Polymer Price List"): one row per compound+cure with explicit columns for compound code (e.g. "SG-A38P", "SC-C60CB", "AU-C50-NBRBSC"), steam-cured/precured, compound colour, shore hardness (±5), compound type (Natural Rubber, Chlorobutyl, Bromobutyl, Nitrile, Neoprene, EPDM), grade, tensile, elongation, S.G., Price per Kg, then four "Price per roll Ex VAT" columns for 6mm/8mm/10mm/12mm x 1200mm x 12m. Has BOTH specificGravity AND pricePerKg AND roll prices — use the 6mm roll column for rollPrice.

LAYOUT B — sectioned-by-cure (e.g. "Rema Tip Top Rubber Sheeting"): sections headed "Steam Cure", "Chemical Cure", "Pre-Cured". Columns: product code (SC1078 = steam, CC/CO/numeric = chemical, CR1078 = pre-cured), thickness (always 6), price for 6mm x 1200mm x 12m, hardness (Shore A, sometimes a range like "60-80 SH D" — take the LOWER bound), and a colour cell that COMBINES colour + compound type (e.g. "Black Natural", "Black Chloro Butyl", "Black Nitrile", "Black Ebonite", or just "Black" in the Chemical section). NO specificGravity, NO pricePerKg — only the 6mm rollPrice. Split the combined cell into colour + compoundType.

LAYOUT C — sectioned with side table (e.g. "Impilo Price List Category A"): sections "Steam cure", "Chemical Cure", "Cured Sheet" (= pre-cured). The product label combines code+type+gauge+cross-ref, e.g. "SC40A NR 6.0 (572)", "CR60A Nitrile 6.0 (1084)". A side table gives Colour, SG, Tensile, ZAR/ROLL (6mm 1200x12m), "KG per Standard" and "R Price per Kg". Has specificGravity AND pricePerKg AND rollPrice.

Field rules:
- supplier: the rubber MANUFACTURER/brand read from the document header (e.g. "AU", "Rema", "Impilo", "Weir", "Truco"), never the customer the list is addressed to. Use null if not stated.
- productCode: the supplier's product code verbatim (e.g. "SG-A38P", "SC1078", "SC40A", "1084").
- productName: the descriptive label/name if any (e.g. "40 Shore Black Steam Cured"); null if none.
- cureType: "steam" | "chemical" | "precured", inferred from the section header OR the code prefix (SC -> steam, CC/CO -> chemical, CR -> precured); null if genuinely unknown.
- compoundType: the rubber chemistry split OUT of any combined colour+type cell — one of "Natural", "Premium Natural", "Chlorobutyl", "Bromobutyl", "Butyl", "Nitrile", "Neoprene", "EPDM", "Ebonite"; null if unclear. Chlorobutyl/Bromobutyl are BUTYL-family compounds, not a separate "Chemical" chemistry.
- colour: the rubber colour only (e.g. "Black", "Red", "Pink", "Yellow", "Green"); null if absent.
- shoreHardness: the Shore A hardness as a number; for a range take the LOWER bound; null if absent.
- specificGravity: the specific gravity / S.G. / density as a number; null if the layout does not show it (Layout B never does).
- pricePerKg: the buyer's NET cost PER KILOGRAM as a number ("R114,60" -> 114.6); null when no per-kg column exists (Layout B never has one).
- rollPrice: the price of ONE 6mm x 1200mm x 12m roll as a number; for Layout A use the 6mm column. null if absent.
- rollThicknessMm / rollWidthMm / rollLengthM: the roll dimensions for rollPrice; default 6 / 1200 / 12 when the standard roll is implied.
- Skip bonding agents, primers, solvents and consumables — those are a separate list.
- NEVER invent a number; use null when a value is genuinely absent.`;

const PRICE_LIST_VISION_SYSTEM_PROMPT = `You are a rubber-lining supplier price-list parser. Read EVERY page of the document and extract all rubber sheet/pipe lining products.

${PRICE_LIST_JSON_SHAPE}

${PRICE_LIST_RULES}`;

const PRICE_LIST_SPREADSHEET_SYSTEM_PROMPT = `You are a rubber-lining supplier price-list parser. The document is a SPREADSHEET (rows given as tab-separated text). Column meaning varies between suppliers — infer it.

${PRICE_LIST_JSON_SHAPE}

${PRICE_LIST_RULES}`;

const BONDING_AGENT_JSON_SHAPE = `Return ONLY a JSON object, no prose:
{
  "supplier": string | null,
  "agents": [{
    "name": string,
    "packSizeLitres": number | null,
    "pricePerTin": number | null,
    "pricePerLitre": number | null,
    "areaCoverPerLitre": number | null,
    "gramsPerM2": number | null
  }]
}`;

const BONDING_AGENT_RULES = `These adhesive / bonding-agent price lists arrive in a few supplier layouts. Recognise the layout and map every row.

LAYOUT — Impilo adhesives (e.g. "Impilo Industries"): columns Description, Unit (e.g. "1 litre" / "5 litre" / "25 litre" / "1 kg" / "25 kg"), Price/Litre, Price/Unit, Spreadrate. Products are grouped under headings (Metal primer, Pre-cured adhesives, Uncured Adhesives, Contact Adhesive, Solvents). There is usually one row PER pack size — keep each as its own agent with the size in the name. The Spreadrate column gives coverage, often "12,0 m²/litre", "5 m²/Litre per coat", "10 - 11 m2"; sometimes a grammage like "±700 g/m²" or "±500 g/m²" — see areaCoverPerLitre rule.

LAYOUT — Rema adhesives (e.g. "Rema Tip Top ... Adhesive Price List"): columns ITEM CODE, DESCRIPTION, PRICE EX VAT. The pack size is embedded IN the description ("... 1 KG", "... 25 LT", "... 65 G", "... 0.7 KG"). There is no per-litre column and no coverage — give pricePerTin only and derive nothing you cannot see.

Field rules:
- supplier: the adhesive MANUFACTURER/brand from the document header (e.g. "Impilo", "Rema", "AU", "Truco", "Megum"), NOT the customer it is addressed to. null if not stated.
- name: the product name verbatim INCLUDING its pack size when sizes repeat (e.g. "HeroPrime 105 25 litre", "HeroBond 200 kit 25 kg", "REMABOND 33 BLACK 25 LT", "Toluene 25 L").
- packSizeLitres: the pack size as a number in litres when the unit is litres ("25 litre" -> 25); for kg/g packs use the numeric size too (e.g. "25 kg" -> 25, "65 G" -> 0.065) — it is the pack quantity.
- pricePerTin: the price for the full tin/pack/unit ("R4 686,50" -> 4686.5); null for POA.
- pricePerLitre: the per-litre (or per-unit) price when a column shows it ("187,46" -> 187.46); null when only a pack price is shown (the app derives it from pricePerTin / packSizeLitres).
- areaCoverPerLitre: the coverage in SQUARE METRES PER LITRE only. Parse "12,0 m²/litre" -> 12, "5 m²/Litre per coat" -> 5; for a range like "10 - 11 m2" use the midpoint (10.5). Use null if the coverage is a grammage (g/m²) or is absent/POA.
- gramsPerM2: the coverage when it is a GRAMMAGE (grams of adhesive per m²), as a number in grams. Parse "±500 g/m²" -> 500, "±700 g/m²" -> 700, "onto metal ±500 g/m², onto rubber ±650 g/m²" -> use the higher value 650. Use null when the coverage is an m²/litre figure or absent. Set EITHER areaCoverPerLitre OR gramsPerM2 for a row, never both.
- Skip rubber SHEET / lining products — those are a separate list. Keep primers, cover coats, tie coats, cements, hardeners, contact adhesives and solvents.
- NEVER invent a number; use null when a value is genuinely absent.`;

const BONDING_AGENT_VISION_SYSTEM_PROMPT = `You are a rubber bonding-agent price-list parser. Read EVERY page and extract all bonding agents, primers and solutions.

${BONDING_AGENT_JSON_SHAPE}

${BONDING_AGENT_RULES}`;

const BONDING_AGENT_SPREADSHEET_SYSTEM_PROMPT = `You are a rubber bonding-agent price-list parser. The document is a SPREADSHEET (rows given as tab-separated text). Infer the column meaning.

${BONDING_AGENT_JSON_SHAPE}

${BONDING_AGENT_RULES}`;

const round2 = (value: number): number => Math.round(value * 100) / 100;

const BONDING_TYPE_BY_COMPOUND: Record<string, string> = {
  natural: "Natural",
  "premium natural": "Premium Natural",
  chlorobutyl: "Butyl",
  chrolobutyl: "Butyl",
  bromobutyl: "Butyl",
  butyl: "Butyl",
  nitrile: "Nitrile",
  neoprene: "Neoprene",
  epdm: "EPDM",
  ebonite: "Natural",
};

function bondingTypeFromCompound(
  compoundType: string | null | undefined,
  fallback: string | null | undefined,
): string | null {
  if (compoundType) {
    const mapped = BONDING_TYPE_BY_COMPOUND[compoundType.trim().toLowerCase()];
    if (mapped) {
      return mapped;
    }
    return compoundType.trim();
  }
  return fallback?.trim() || null;
}

const CURE_TYPE_BY_TOKEN: Record<string, RubberCureType> = {
  "steam cured": "steam",
  "steam cure": "steam",
  steam: "steam",
  sc: "steam",
  "pre cured": "precured",
  "pre-cured": "precured",
  precured: "precured",
  cured: "precured",
  cr: "precured",
  "chemical cure": "chemical",
  "chemical cured": "chemical",
  chemical: "chemical",
  co: "chemical",
  cc: "chemical",
};

function cureTypeFrom(
  cureType: RubberCureType | null | undefined,
  productCode: string,
): RubberCureType {
  if (cureType) {
    return cureType;
  }
  const code = productCode.trim().toUpperCase();
  const prefix = code.slice(0, 2);
  const fromPrefix = CURE_TYPE_BY_TOKEN[prefix.toLowerCase()];
  return fromPrefix ?? "steam";
}

export interface RubberRowFallbackInput {
  supplier: string;
  productCode: string;
  productName?: string | null;
  cureType?: RubberCureType | null;
  compoundType?: string | null;
  bondingType?: string | null;
  colour?: string | null;
  shoreHardness?: number | null;
  specificGravity?: number | null;
  pricePerKg?: number | null;
  costPerKg?: number | null;
  rollPrice?: number | null;
  rollThicknessMm?: number | null;
  rollWidthMm?: number | null;
  rollLengthM?: number | null;
}

export function applyRubberRowFallbacks(row: RubberRowFallbackInput): RubberPriceListRowPreview {
  const compoundType = row.compoundType?.trim() || row.bondingType?.trim() || null;
  const cureType = cureTypeFrom(row.cureType, row.productCode);
  const compoundBonding = bondingTypeFromCompound(row.compoundType, row.bondingType);
  const bondingType =
    cureType === "chemical" ? "Chemical" : cureType === "precured" ? "Cured" : compoundBonding;

  const extractedSg = row.specificGravity;
  const datasheetSg = extractedSg == null ? lookupRubberSgByCode(row.productCode) : null;
  const resolvedSg = extractedSg ?? datasheetSg ?? defaultRubberSgByType(compoundType);
  const sgSource: RubberSgSource =
    extractedSg != null ? "extracted" : datasheetSg != null ? "datasheet" : "default";

  const extractedCost = row.pricePerKg ?? row.costPerKg ?? null;
  const rollPrice = row.rollPrice ?? null;
  const derivedCost =
    extractedCost == null && rollPrice != null
      ? pricePerKgFromRoll({
          rollPrice,
          thicknessMm: row.rollThicknessMm ?? STANDARD_RUBBER_ROLL.thicknessMm,
          widthMm: row.rollWidthMm ?? STANDARD_RUBBER_ROLL.widthMm,
          lengthM: row.rollLengthM ?? STANDARD_RUBBER_ROLL.lengthM,
          sg: resolvedSg,
        })
      : null;
  const resolvedCost = extractedCost ?? derivedCost;
  const costSource: RubberCostSource =
    extractedCost != null ? "extracted" : derivedCost != null ? "derived-from-roll" : "missing";

  return {
    supplier: row.supplier,
    productCode: row.productCode,
    productName: row.productName?.trim() || null,
    cureType,
    bondingType,
    colour: row.colour?.trim() || null,
    shoreHardness: row.shoreHardness ?? null,
    specificGravity: round2(resolvedSg),
    costPerKg: resolvedCost != null ? round2(resolvedCost) : null,
    sgSource,
    costSource,
  };
}

@Injectable()
export class RubberPriceListExtractionService {
  private readonly logger = new Logger(RubberPriceListExtractionService.name);

  constructor(
    private readonly aiChatService: AiChatService,
    private readonly extractionMetricService: ExtractionMetricService,
    private readonly aiUsageService: AiUsageService,
  ) {}

  private isSpreadsheet(file: Express.Multer.File): boolean {
    const mime = (file.mimetype || "").toLowerCase();
    const name = (file.originalname || "").toLowerCase();
    return (
      mime.includes("sheet") ||
      mime.includes("excel") ||
      mime.includes("csv") ||
      name.endsWith(".xlsx") ||
      name.endsWith(".xls") ||
      name.endsWith(".csv")
    );
  }

  private mediaTypeFor(mime: string): MediaType {
    const map: Record<string, MediaType> = {
      "image/jpeg": "image/jpeg",
      "image/jpg": "image/jpeg",
      "image/png": "image/png",
      "image/gif": "image/gif",
      "image/webp": "image/webp",
      "application/pdf": "application/pdf",
    };
    return map[mime] || "application/pdf";
  }

  private workbookToText(buffer: Buffer): string {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    return workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet, { FS: "\t", blankrows: false });
      return `# Sheet: ${sheetName}\n${csv}`;
    }).join("\n\n");
  }

  private logUsage(providerUsed: string, tokensUsed?: number): void {
    this.aiUsageService.log({
      app: AiApp.STOCK_CONTROL,
      actionType: "rubber-price-list-import",
      provider: providerUsed.includes("claude") ? AiProvider.CLAUDE : AiProvider.GEMINI,
      tokensUsed,
      pageCount: 1,
    });
  }

  private parseJson<T>(content: string): T {
    const cleaned = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      this.logger.error(`Rubber price list extraction returned no JSON (length ${content.length})`);
      throw new BadRequestException("Could not read the price list — please try a clearer file.");
    }
    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch (error) {
      this.logger.error(
        `Rubber price list JSON parse failed (length ${content.length}): ${(error as Error).message}`,
      );
      throw new BadRequestException(
        "The price list was read but could not be parsed — it may be very large; try splitting it.",
      );
    }
  }

  private async runVision<T>(file: Express.Multer.File, systemPrompt: string): Promise<T> {
    const base64 = file.buffer.toString("base64");
    const mediaType = this.mediaTypeFor(file.mimetype);
    const { content, providerUsed, tokensUsed } = await this.extractionMetricService.time(
      "stock-control-rubber-pricing",
      "import",
      () =>
        this.aiChatService.chatWithImage(
          base64,
          mediaType,
          "Extract the full rubber price list from this document. Return JSON only.",
          systemPrompt,
          { responseFormat: "json", maxOutputTokens: 32768 },
        ),
    );
    this.logUsage(providerUsed, tokensUsed);
    return this.parseJson<T>(content);
  }

  private async runSpreadsheet<T>(file: Express.Multer.File, systemPrompt: string): Promise<T> {
    const text = this.workbookToText(file.buffer);
    const { content, providerUsed, tokensUsed } = await this.extractionMetricService.time(
      "stock-control-rubber-pricing",
      "import",
      () =>
        this.aiChatService.chat(
          [{ role: "user", content: `Parse this supplier price-list spreadsheet:\n\n${text}` }],
          systemPrompt,
          undefined,
          { responseFormat: "json", maxOutputTokens: 32768 },
        ),
    );
    this.logUsage(providerUsed, tokensUsed);
    return this.parseJson<T>(content);
  }

  private buildPriceListPreview(parsed: ExtractedRubberPriceList): RubberPriceListImportPreview {
    const supplier = parsed.supplier?.trim() || "Unknown Supplier";
    const products = parsed.products ?? [];
    const rows = products
      .map((product): RubberPriceListRowPreview | null => {
        const productCode = product.productCode?.trim();
        if (!productCode) {
          return null;
        }
        return applyRubberRowFallbacks({
          ...product,
          productCode,
          supplier: product.supplier?.trim() || supplier,
        });
      })
      .filter((row): row is RubberPriceListRowPreview => row !== null);
    this.logger.log(`Extracted ${rows.length} rubber product(s) from price list for ${supplier}`);
    return { supplier, rows };
  }

  private buildBondingAgentPreview(
    parsed: ExtractedBondingAgentList,
  ): RubberBondingAgentImportPreview {
    const agents = parsed.agents ?? [];
    const supplier = parsed.supplier?.trim() || null;
    const rows = agents
      .map((agent): RubberBondingAgentRowPreview | null => {
        const name = agent.name?.trim();
        if (!name) {
          return null;
        }
        const extractedGramsPerM2 = agent.gramsPerM2 ?? null;
        const extractedAreaCoverPerLitre = agent.areaCoverPerLitre ?? null;
        const reference =
          extractedGramsPerM2 == null && extractedAreaCoverPerLitre == null
            ? lookupRubberBondingCoverage(name)
            : null;
        const gramsPerM2 = reference != null ? reference.gramsPerM2 : extractedGramsPerM2;
        const areaCoverPerLitre =
          reference != null ? reference.areaCoverPerLitre : extractedAreaCoverPerLitre;
        const coverageBasis: "litre" | "gram" | "none" =
          gramsPerM2 != null ? "gram" : areaCoverPerLitre != null ? "litre" : "none";
        return {
          name,
          packSizeLitres: agent.packSizeLitres ?? null,
          pricePerTin: agent.pricePerTin ?? null,
          pricePerLitre: agent.pricePerLitre ?? null,
          areaCoverPerLitre,
          coverageBasis,
          gramsPerM2,
        };
      })
      .filter((row): row is RubberBondingAgentRowPreview => row !== null);
    this.logger.log(`Extracted ${rows.length} bonding agent(s) from price list`);
    return { supplier, rows };
  }

  async extractPriceList(file: Express.Multer.File): Promise<RubberPriceListImportPreview> {
    if (!file?.buffer) {
      throw new BadRequestException("No file provided");
    }
    const parsed = this.isSpreadsheet(file)
      ? await this.runSpreadsheet<ExtractedRubberPriceList>(
          file,
          PRICE_LIST_SPREADSHEET_SYSTEM_PROMPT,
        )
      : await this.runVision<ExtractedRubberPriceList>(file, PRICE_LIST_VISION_SYSTEM_PROMPT);
    return this.buildPriceListPreview(parsed);
  }

  async extractBondingAgents(file: Express.Multer.File): Promise<RubberBondingAgentImportPreview> {
    if (!file?.buffer) {
      throw new BadRequestException("No file provided");
    }
    const parsed = this.isSpreadsheet(file)
      ? await this.runSpreadsheet<ExtractedBondingAgentList>(
          file,
          BONDING_AGENT_SPREADSHEET_SYSTEM_PROMPT,
        )
      : await this.runVision<ExtractedBondingAgentList>(file, BONDING_AGENT_VISION_SYSTEM_PROMPT);
    return this.buildBondingAgentPreview(parsed);
  }
}
