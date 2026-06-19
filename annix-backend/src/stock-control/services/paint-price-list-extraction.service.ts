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
  volumeSolidsPercent?: number | null;
  recommendedMicrons?: number | null;
  thinnerName?: string | null;
  maxThinningPercent?: number | null;
}

const SPEC_LOOKUP_SYSTEM_PROMPT = `You are a protective-coatings data-sheet expert. For each numbered "Supplier — Product" line, return the MANUFACTURER'S PUBLISHED technical-data-sheet values.

Return ONLY a JSON object with a "specs" array, one object per product, echoing the productName exactly as given:
{ "specs": [{ "productName": string, "coatType": "primer" | "intermediate" | "final" | null, "paintType": string | null, "volumeSolidsPercent": number | null, "recommendedMicrons": number | null, "thinnerName": string | null, "maxThinningPercent": number | null }] }

Rules:
- coatType: the product's typical role in a coating system — "primer", "intermediate" or "final" — or null if genuinely unclear.
- paintType: the generic chemistry (e.g. "Epoxy", "Polyurethane", "Alkyd", "Acrylic", "Bituminous", "Inorganic Zinc").
- volumeSolidsPercent: the published volume solids %. recommendedMicrons: the recommended dry film thickness per coat (µm).
- thinnerName: the manufacturer's recommended thinner for that product. maxThinningPercent: the maximum recommended thinning rate (% by volume).
- Use null for ANY value you are not confident is the manufacturer's published figure. NEVER guess a number — a wrong solids/DFT produces a wrong sale price. coatType and paintType may be inferred from the product family.`;

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
- packSizeLitres: from a pack-size column or the size embedded in the description ("7.5L" -> 7.5, "16L" -> 16).
- productName: the base coating product name only — strip pack size, colour words, "COMP A"/"COMP B", "COLOUR GROUP X", "RT", "GF", and RAL codes (e.g. "JOTAMASTIC 90 ALU RT A 3.55L" -> "Jotamastic 90"; "BARRIER 80 S GREY A 7.5L" -> "Barrier 80"; "PENGUARD EXPRESS MIO GRE A 4L" -> "Penguard Express MIO").
- Collapse rows that are the same product at the same per-litre price (different colour groups / pack sizes) into ONE product entry.
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

  async lookupSpecs(
    products: { productName: string; supplierName: string }[],
  ): Promise<Map<string, ProductSpec>> {
    if (products.length === 0) {
      return new Map();
    }
    const list = products
      .map((p, index) => `${index + 1}. ${p.supplierName} — ${p.productName}`)
      .join("\n");
    const { content, providerUsed, tokensUsed } = await this.extractionMetricService.time(
      "stock-control-paint-pricing",
      "enrich",
      () =>
        this.aiChatService.chat(
          [{ role: "user", content: `Provide published data-sheet specs for:\n\n${list}` }],
          SPEC_LOOKUP_SYSTEM_PROMPT,
          undefined,
          { responseFormat: "json", maxOutputTokens: 16384 },
        ),
    );
    this.logUsage(providerUsed, tokensUsed);

    const cleaned = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      this.logger.warn(`Spec lookup returned no JSON object (length ${content.length})`);
      return new Map();
    }
    try {
      const parsed = JSON.parse(match[0]) as { specs?: ProductSpec[] };
      const specs = parsed.specs ?? [];
      return new Map(
        specs
          .filter((spec) => spec.productName)
          .map((spec) => [spec.productName.trim().toLowerCase(), spec]),
      );
    } catch (error) {
      this.logger.error(`Spec lookup JSON parse failed: ${(error as Error).message}`);
      return new Map();
    }
  }

  async extractPriceList(file: Express.Multer.File): Promise<PaintPriceListImportPreview> {
    if (!file || !file.buffer) {
      throw new BadRequestException("No file provided");
    }
    const parsed = this.isSpreadsheet(file)
      ? await this.extractFromSpreadsheet(file)
      : await this.extractFromVision(file);
    return this.buildRows(parsed);
  }
}
