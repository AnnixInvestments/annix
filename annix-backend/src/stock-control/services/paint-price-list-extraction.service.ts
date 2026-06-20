import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import * as XLSX from "xlsx";
import { AiUsageService } from "../../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../../ai-usage/entities/ai-usage-log.entity";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { lookupCoatingProduct } from "../config/coating-products";
import type { PaintPriceListItemInput } from "./paint-price-list.service";

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf";

interface ExtractedThinner {
  code?: string;
  name?: string;
  pricePerLitre?: number;
}

interface ExtractedProduct {
  productName?: string;
  category?: string;
  coatType?: string | null;
  volumeSolidsPercent?: number | null;
  recommendedMicrons?: number | null;
  packSizeLitres?: number | null;
  packPrice?: number | null;
  costPerLitre?: number | null;
  thinnerCode?: string | null;
  maxThinningPercent?: number | null;
}

interface ExtractedPriceList {
  supplierName?: string;
  thinners?: ExtractedThinner[];
  products?: ExtractedProduct[];
}

export interface PaintPriceListImportPreview {
  supplierName: string;
  rows: PaintPriceListItemInput[];
}

export interface ProductSpec {
  productName: string;
  coatType?: string | null;
  paintType?: string | null;
  genericType?: string | null;
  finishType?: string | null;
  zincRich?: boolean | null;
  mioPigment?: boolean | null;
  surfaceTolerant?: boolean | null;
  heatResistanceC?: number | null;
  volumeSolidsPercent?: number | null;
  recommendedMicrons?: number | null;
  thinnerName?: string | null;
  maxThinningPercent?: number | null;
}

export const PAINT_GENERIC_TYPES = [
  "zinc-rich-epoxy",
  "zinc-silicate",
  "epoxy",
  "epoxy-mio",
  "epoxy-mastic",
  "epoxy-phenolic",
  "epoxy-glass-flake",
  "coal-tar-epoxy",
  "polyurethane",
  "polysiloxane",
  "polyurea",
  "acrylic",
  "alkyd",
  "vinyl",
  "high-temp-silicone",
  "intumescent",
  "fbe",
  "3lpe",
  "bitumen",
] as const;

export const PAINT_FINISH_TYPES = [
  "aliphatic-pu",
  "aromatic-pu",
  "acrylic-pu",
  "acrylic",
  "alkyd",
  "epoxy",
  "phenolic",
  "vinyl",
  "silicone",
] as const;

const SPEC_LOOKUP_SYSTEM_PROMPT = `You are a protective-coatings data-sheet expert. For each numbered "Supplier — Product" line, return the MANUFACTURER'S PUBLISHED technical-data-sheet values.

Return ONLY a JSON object with a "specs" array, one object per product, echoing the productName exactly as given:
{ "specs": [{ "productName": string, "coatType": "primer" | "intermediate" | "final" | null, "paintType": string | null, "genericType": string | null, "finishType": string | null, "zincRich": boolean, "mioPigment": boolean, "surfaceTolerant": boolean, "heatResistanceC": number | null, "volumeSolidsPercent": number | null, "recommendedMicrons": number | null, "thinnerName": string | null, "maxThinningPercent": number | null }] }

Rules:
- coatType: the product's typical role in a coating system — "primer", "intermediate" or "final" — or null if genuinely unclear.
- paintType: the broad chemistry as a friendly label (e.g. "Epoxy", "Polyurethane", "Alkyd", "Acrylic", "Inorganic Zinc", "Bituminous").
- genericType: the PRECISE binder/technology, EXACTLY one of: ${PAINT_GENERIC_TYPES.join(", ")}. Pick the most specific that fits — e.g. a zinc-rich epoxy primer is "zinc-rich-epoxy" (NOT "epoxy"); an MIO-pigmented epoxy is "epoxy-mio"; a surface-tolerant high-build epoxy mastic is "epoxy-mastic"; an aliphatic polyurethane topcoat is "polyurethane"; an inorganic zinc silicate is "zinc-silicate"; a bituminous or bitumen aluminium coating is "bitumen". Use null only if genuinely unclassifiable.
- finishType: for topcoats/finishes, the finish chemistry, one of: ${PAINT_FINISH_TYPES.join(", ")} (e.g. a UV/colour-stable PU topcoat is "aliphatic-pu"); null for primers/intermediates or when unclear.
- zincRich: true if the product is a zinc-rich primer (zinc-rich epoxy or zinc silicate). mioPigment: true if pigmented with micaceous iron oxide (MIO). surfaceTolerant: true if the TDS describes it as surface-tolerant / a mastic. Default each to false when not applicable.
- heatResistanceC: the maximum continuous dry-heat service temperature in °C if the product is a heat-resistant coating; null otherwise.
- volumeSolidsPercent: the published volume solids %. recommendedMicrons: the recommended dry film thickness per coat (µm).
- thinnerName: the manufacturer's recommended thinner. maxThinningPercent: the maximum recommended thinning rate (% by volume).
- Use null for ANY number you are not confident is the manufacturer's published figure. NEVER guess a number — a wrong solids/DFT produces a wrong sale price. coatType, paintType, genericType and finishType may be inferred from the product family.`;

const COMPONENT_COUNT_PROMPT = `You are a protective-coatings data-sheet expert. For each numbered product, state how many separately-packed components it ships as: 1 for a single-pack product, 2 for a two-pack (Part A + Part B), 3 for a three-pack (A + B + C). Use your knowledge of the product's published data sheet.

Echo productName EXACTLY as given. Return ONLY: { "counts": [{ "productName": string, "componentCount": number }] }`;

const COLUMN_GUIDE = `The product table columns may include: PRODUCT, STATUS (e.g. MTO/Tint), % SBV (solids by volume %), THEOR COVER (m²/L), D.F.T µm, SELLING PRICE, PKG (e.g. "5 litre", "10 litre kit"), COST PER m², THINNER TYPE, THINNER MAX %. Products are grouped under category headings (ACRYLICS, ALKYDS, EPOXIES, POLYURETHANES, PHENOLINES, HIGH TEMPERATURE, ZINCS, VINYLS, BITUMINOUS ALUMINIUM). A THINNERS section lists thinner products with their own price and pack.`;

const JSON_SHAPE = `Return ONLY a JSON object, no prose:
{
  "supplierName": string,
  "thinners": [{ "code": string, "name": string, "pricePerLitre": number }],
  "products": [{
    "productName": string,
    "category": string,
    "coatType": "primer" | "intermediate" | "final" | null,
    "volumeSolidsPercent": number | null,
    "recommendedMicrons": number | null,
    "packSizeLitres": number | null,
    "packPrice": number | null,
    "costPerLitre": number | null,
    "thinnerCode": string | null,
    "maxThinningPercent": number | null
  }]
}`;

const VISION_SYSTEM_PROMPT = `You are a paint/coating supplier price-list parser. Read EVERY page of the document and extract all coating products and the thinners table.

${COLUMN_GUIDE}

${JSON_SHAPE}

Rules:
- supplierName: the paint MANUFACTURER/brand (e.g. "StonCor Africa", "Jotun"), never the customer the list is addressed to.
- packSizeLitres: numeric litres from PKG ("10 litre kit" -> 10, "20 litre" -> 20). packPrice: the SELLING PRICE for that pack as a number ("R1 050,00" -> 1050). Leave costPerLitre null when the price is per-pack.
- volumeSolidsPercent: the % SBV. recommendedMicrons: the D.F.T µm. Use null if a column is genuinely absent — never invent values.
- thinnerCode: the THINNER TYPE cell verbatim ("2","10","76","Water","Phen","EP-10","Clean"). maxThinningPercent: the THINNER MAX % as a number; "Clean" -> 0.
- thinners[].pricePerLitre = a thinner's selling price divided by its pack litres (R300,00 for 5 litre -> 60).
- coatType: infer from the product name ("Primer"/"Etch Primer" -> "primer", "Finish" -> "final", else null).
- Skip thinners, degreasers, cleaners, gauges and miscellaneous items from the products array.
- Omit any product row with no % SBV and no selling price.`;

const SPREADSHEET_SYSTEM_PROMPT = `You are a paint/coating supplier price-list parser. The document is a SPREADSHEET (rows given as tab/comma-separated text). Column meaning varies between suppliers — infer it.

${JSON_SHAPE}

Rules:
- supplierName: the paint MANUFACTURER/brand (e.g. "Jotun", "StonCor Africa"), inferred from the product names — NEVER the customer/recipient named at the top of the sheet.
- costPerLitre: the buyer's NET price PER LITRE. When several price columns exist, pick the current-year agreed/net "price list" column (the discounted price the buyer actually pays), NOT the master/list/RRP column and NOT a prior-year column. If the sheet only gives a per-pack price, put it in packPrice and set packSizeLitres instead.
- packSizeLitres: ALWAYS populate this from the pack-size column or the size embedded in the description ("7.5L" -> 7.5, "16L" -> 16, "4.17L" -> 4.17). Never leave it null when the sheet shows a size.
- productName: the base coating product, KEEPING meaningful grade words (MIO, ZP, GF, HB) but STRIPPING colour, pack size, component, region and cure markers — remove "COMP A"/"COMP B", "COLOUR GROUP X", RAL codes, colour words (GREY, RED, WHITE, BLACK, BUFF, "DK GRN", and aluminium in any form: ALU / AL / ALUMINIUM), region/market codes (e.g. "ZA", "SA"), the trailing component "A"/"B" letter, and the "RT" cure suffix. Two rows that are the same product differing only by these markers MUST normalise to the SAME productName. Examples: "JOTAMASTIC 80 AL COMP A 16L", "JOTAMASTIC 80 AL RT A 4L" and "JOTAMASTIC 80 GREY A 16L" ALL -> "Jotamastic 80"; "JOTAMASTIC 90 ALU RT A 3.55L" -> "Jotamastic 90"; "JOTAMASTIC 90 GF COLOUR GROUP A" -> "Jotamastic 90 GF"; "PENGUARD EXPRESS MIO GRE A 4L" -> "Penguard Express MIO"; "BARRIER 80 S DK GRN ZA A 7.5L" and "BARRIER 80 S GREY A 7.5L" -> "Barrier 80 S".
- Keep each distinct PACK SIZE as its own row (so a product with separate parts/sizes gives one row per pack size). You MAY merge rows that are the same product, SAME pack size, and SAME per-litre price differing only by colour, into one entry — but NEVER merge across different pack sizes. (Components A/B/C are combined later, downstream.)
- volumeSolidsPercent, recommendedMicrons, thinnerCode, maxThinningPercent: include ONLY if the sheet actually contains them; otherwise null. NEVER guess these from product knowledge — they are enriched downstream.
- Exclude thinners, degreasers and cleaners from products; list thinner products under thinners[] with pricePerLitre (price ÷ pack litres).`;

@Injectable()
export class PaintPriceListExtractionService {
  private readonly logger = new Logger(PaintPriceListExtractionService.name);

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

  private thinnerLabel(code: string): string {
    const normalized = code.trim();
    if (/^\d+$/.test(normalized)) {
      return `Carboline Thinner # ${normalized}`;
    }
    if (/^phen/i.test(normalized)) {
      return "Phenoline Thinner";
    }
    if (/ep-?10/i.test(normalized)) {
      return "Stonfast EP-10 Thinner";
    }
    if (/water/i.test(normalized)) {
      return "Water";
    }
    return normalized;
  }

  private async extractFromVision(file: Express.Multer.File): Promise<ExtractedPriceList> {
    const base64 = file.buffer.toString("base64");
    const mediaType = this.mediaTypeFor(file.mimetype);
    const { content, providerUsed, tokensUsed } = await this.extractionMetricService.time(
      "stock-control-paint-pricing",
      "import",
      () =>
        this.aiChatService.chatWithImage(
          base64,
          mediaType,
          "Extract the full paint price list and thinners table from this document. Return JSON only.",
          VISION_SYSTEM_PROMPT,
          { responseFormat: "json", maxOutputTokens: 32768 },
        ),
    );
    this.logUsage(providerUsed, tokensUsed);
    return this.parseJson(content);
  }

  private async extractFromSpreadsheet(file: Express.Multer.File): Promise<ExtractedPriceList> {
    const text = this.workbookToText(file.buffer);
    const { content, providerUsed, tokensUsed } = await this.extractionMetricService.time(
      "stock-control-paint-pricing",
      "import",
      () =>
        this.aiChatService.chat(
          [{ role: "user", content: `Parse this supplier price-list spreadsheet:\n\n${text}` }],
          SPREADSHEET_SYSTEM_PROMPT,
          undefined,
          { responseFormat: "json", maxOutputTokens: 32768 },
        ),
    );
    this.logUsage(providerUsed, tokensUsed);
    return this.parseJson(content);
  }

  private logUsage(providerUsed: string, tokensUsed?: number): void {
    this.aiUsageService.log({
      app: AiApp.STOCK_CONTROL,
      actionType: "paint-price-list-import",
      provider: providerUsed.includes("claude") ? AiProvider.CLAUDE : AiProvider.GEMINI,
      tokensUsed,
      pageCount: 1,
    });
  }

  private parseJson(content: string): ExtractedPriceList {
    const cleaned = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      this.logger.error(`Price list extraction returned no JSON (length ${content.length})`);
      throw new BadRequestException("Could not read the price list — please try a clearer file.");
    }
    try {
      return JSON.parse(jsonMatch[0]) as ExtractedPriceList;
    } catch (error) {
      this.logger.error(
        `Price list JSON parse failed (length ${content.length}): ${(error as Error).message}`,
      );
      throw new BadRequestException(
        "The price list was read but could not be parsed — it may be very large; try splitting it.",
      );
    }
  }

  private buildRows(parsed: ExtractedPriceList): PaintPriceListImportPreview {
    const supplierName = parsed.supplierName?.trim() || "Unknown Supplier";
    const thinners = parsed.thinners ?? [];
    const products = parsed.products ?? [];

    const thinnerPriceByCode = new Map<string, number>(
      thinners
        .filter((t) => t.code != null && typeof t.pricePerLitre === "number")
        .map((t) => [String(t.code).trim().toLowerCase(), t.pricePerLitre as number]),
    );

    const rows = products
      .map((product) => this.toRow(product, supplierName, thinnerPriceByCode))
      .filter((row): row is PaintPriceListItemInput => row !== null);

    this.logger.log(`Extracted ${rows.length} paint(s) from price list for ${supplierName}`);
    return { supplierName, rows };
  }

  private toRow(
    product: ExtractedProduct,
    supplierName: string,
    thinnerPriceByCode: Map<string, number>,
  ): PaintPriceListItemInput | null {
    const name = product.productName?.trim();
    if (!name) {
      return null;
    }

    const packLitres = product.packSizeLitres ?? null;
    const packPrice = product.packPrice ?? null;
    const directPerLitre = product.costPerLitre ?? null;
    const perLitre =
      directPerLitre && directPerLitre > 0
        ? directPerLitre
        : packPrice && packLitres && packLitres > 0
          ? Math.round((packPrice / packLitres) * 100) / 100
          : null;
    if (!perLitre || perLitre <= 0) {
      return null;
    }

    const reference = lookupCoatingProduct(name);
    const docSolids = product.volumeSolidsPercent ?? null;
    const volumeSolidsPercent =
      docSolids && docSolids > 0 ? docSolids : (reference?.volumeSolidsPercent ?? 0);
    const docMicrons = product.recommendedMicrons ?? null;
    const recommendedMicrons =
      docMicrons && docMicrons > 0 ? docMicrons : (reference?.defaultDftUm ?? null);

    const code = product.thinnerCode ? String(product.thinnerCode).trim() : null;
    const thinnerPrice =
      code && thinnerPriceByCode.has(code.toLowerCase())
        ? (thinnerPriceByCode.get(code.toLowerCase()) as number)
        : null;
    const coatType =
      product.coatType === "primer" ||
      product.coatType === "intermediate" ||
      product.coatType === "final"
        ? product.coatType
        : null;

    return {
      supplierName,
      coatType,
      productName: name,
      paintType: product.category ?? null,
      packSizeLitres: packLitres,
      volumeSolidsPercent,
      costPerLitre: perLitre,
      costPerKit: directPerLitre && directPerLitre > 0 ? null : packPrice,
      upliftPercent: 0,
      recommendedMicrons,
      micronsOverride: null,
      thinnerName: code ? this.thinnerLabel(code) : null,
      thinnerPricePerLitre: thinnerPrice,
      maxThinningPercent: product.maxThinningPercent ?? null,
      active: true,
    };
  }

  private async lookupSpecsBatch(
    products: { productName: string; supplierName: string }[],
  ): Promise<ProductSpec[]> {
    const list = products
      .map((p, index) => `${index + 1}. ${p.supplierName} — ${p.productName}`)
      .join("\n");
    const { content, providerUsed, tokensUsed } = await this.aiChatService.chat(
      [{ role: "user", content: `Provide published data-sheet specs for:\n\n${list}` }],
      SPEC_LOOKUP_SYSTEM_PROMPT,
      undefined,
      { responseFormat: "json", maxOutputTokens: 16384 },
    );
    this.logUsage(providerUsed, tokensUsed);

    const cleaned = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      this.logger.warn(`Spec lookup batch returned no JSON object (length ${content.length})`);
      return [];
    }
    try {
      const parsed = JSON.parse(match[0]) as { specs?: ProductSpec[] };
      return parsed.specs ?? [];
    } catch (error) {
      this.logger.error(`Spec lookup batch parse failed: ${(error as Error).message}`);
      return [];
    }
  }

  async lookupSpecs(
    products: { productName: string; supplierName: string }[],
  ): Promise<Map<string, ProductSpec>> {
    if (products.length === 0) {
      return new Map();
    }
    const batchSize = 15;
    const batchCount = Math.ceil(products.length / batchSize);
    const batches = Array.from({ length: batchCount }, (_, index) =>
      products.slice(index * batchSize, index * batchSize + batchSize),
    );
    const results = await this.extractionMetricService.time(
      "stock-control-paint-pricing",
      "enrich",
      () => Promise.all(batches.map((batch) => this.lookupSpecsBatch(batch))),
    );
    const specs = results.flat();
    this.logger.log(
      `Spec lookup: ${specs.length} spec(s) returned for ${products.length} product(s) in ${batches.length} batch(es)`,
    );
    return new Map(
      specs
        .filter((spec) => spec.productName)
        .map((spec) => [this.productKey(spec.productName), spec]),
    );
  }

  productKey(name: string): string {
    const withoutSupplier = name.replace(/^[^—]*—\s*/, "");
    return withoutSupplier.trim().toLowerCase();
  }

  private async lookupComponentCountsBatch(
    names: string[],
  ): Promise<{ productName: string; componentCount: number }[]> {
    const list = names.map((name, index) => `${index + 1}. ${name}`).join("\n");
    const { content, providerUsed, tokensUsed } = await this.aiChatService.chat(
      [
        {
          role: "user",
          content: `How many packed components does each product ship as?\n\n${list}`,
        },
      ],
      COMPONENT_COUNT_PROMPT,
      undefined,
      { responseFormat: "json", maxOutputTokens: 8192 },
    );
    this.logUsage(providerUsed, tokensUsed);
    const cleaned = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      return [];
    }
    try {
      const parsed = JSON.parse(match[0]) as {
        counts?: { productName: string; componentCount: number }[];
      };
      return parsed.counts ?? [];
    } catch (error) {
      this.logger.error(`Component-count parse failed: ${(error as Error).message}`);
      return [];
    }
  }

  private async lookupComponentCounts(names: string[]): Promise<Map<string, number>> {
    if (names.length === 0) {
      return new Map();
    }
    const batchSize = 20;
    const batchCount = Math.ceil(names.length / batchSize);
    const batches = Array.from({ length: batchCount }, (_, index) =>
      names.slice(index * batchSize, index * batchSize + batchSize),
    );
    const results = await this.extractionMetricService.time(
      "stock-control-paint-pricing",
      "component-count",
      () => Promise.all(batches.map((batch) => this.lookupComponentCountsBatch(batch))),
    );
    return new Map(
      results
        .flat()
        .filter((entry) => entry.productName && typeof entry.componentCount === "number")
        .map((entry) => [this.productKey(entry.productName), entry.componentCount]),
    );
  }

  private normalizeProductName(name: string): string {
    return name
      .replace(/\b(aluminium|alu|al|za|sa|rt)\b/gi, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  private async combineKits(products: ExtractedProduct[]): Promise<ExtractedProduct[]> {
    const named = products
      .filter((product) => product.productName?.trim())
      .map((product) => ({
        ...product,
        productName: this.normalizeProductName(product.productName ?? ""),
      }))
      .filter((product) => product.productName.length > 0);
    if (named.length === 0) {
      return products;
    }
    const distinctNames = Array.from(
      new Set(named.map((product) => product.productName?.trim() ?? "")),
    );
    const counts = await this.lookupComponentCounts(distinctNames);

    const groups = new Map<string, ExtractedProduct[]>();
    named.forEach((product) => {
      const price = product.costPerLitre ?? product.packPrice ?? 0;
      const key = `${(product.productName ?? "").trim().toLowerCase()}||${price}`;
      const existing = groups.get(key) ?? [];
      existing.push(product);
      groups.set(key, existing);
    });

    const combined = Array.from(groups.values()).map((group) => {
      const first = group[0];
      const name = (first.productName ?? "").trim();
      const componentCount = counts.get(this.productKey(name)) ?? 1;
      const packs = Array.from(
        new Set(
          group
            .map((product) => product.packSizeLitres)
            .filter((value): value is number => typeof value === "number" && value > 0),
        ),
      ).sort((a, b) => b - a);
      const summed =
        componentCount >= 2 && packs.length >= 2
          ? packs.slice(0, componentCount).reduce((total, value) => total + value, 0)
          : (packs[0] ?? first.packSizeLitres ?? null);
      const kit = summed === null ? null : Math.round(summed * 100) / 100;
      return { ...first, packSizeLitres: kit };
    });

    this.logger.log(`Combined ${named.length} line(s) into ${combined.length} kit row(s)`);
    return combined;
  }

  async extractPriceList(file: Express.Multer.File): Promise<PaintPriceListImportPreview> {
    if (!file || !file.buffer) {
      throw new BadRequestException("No file provided");
    }
    if (this.isSpreadsheet(file)) {
      const parsed = await this.extractFromSpreadsheet(file);
      parsed.products = await this.combineKits(parsed.products ?? []);
      return this.buildRows(parsed);
    }
    const parsed = await this.extractFromVision(file);
    return this.buildRows(parsed);
  }
}
