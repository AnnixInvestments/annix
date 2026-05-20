import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { pdfToPng } from "pdf-to-png-converter";
import { AiUsageService } from "../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../ai-usage/entities/ai-usage-log.entity";
import { nowMillis } from "../lib/datetime";
import { ExtractionMetricService } from "../metrics/extraction-metric.service";
import {
  ExtractedCustomerDeliveryNoteData,
  ExtractedCustomerDeliveryNotePodPage,
  ExtractedCustomerDeliveryNotesResult,
  ExtractedDeliveryNoteData,
} from "./entities/rubber-delivery-note.entity";
import {
  BatchStatRow,
  ExtractedCocData,
  SupplierCocType,
} from "./entities/rubber-supplier-coc.entity";
import { ExtractedTaxInvoiceData, TaxInvoiceType } from "./entities/rubber-tax-invoice.entity";
import {
  CALENDARER_COC_SYSTEM_PROMPT,
  CALENDER_ROLL_COC_SYSTEM_PROMPT,
  CALENDERER_SPARSE_VERIFY_PROMPT,
  COMPOUNDER_COC_SYSTEM_PROMPT,
  CREDIT_NOTE_SYSTEM_PROMPT,
  CUSTOMER_DELIVERY_NOTE_OCR_PROMPT,
  calendererCocExtractionPrompt,
  calenderRollCocExtractionPrompt,
  compounderCocExtractionPrompt,
  creditNoteExtractionPrompt,
  DELIVERY_NOTE_SYSTEM_PROMPT,
  deliveryNoteExtractionPrompt,
  TAX_INVOICE_CUSTOMER_OVERRIDE_PROMPT,
  TAX_INVOICE_SYSTEM_PROMPT,
  taxInvoiceExtractionPrompt,
  UNIVERSAL_DELIVERY_NOTE_SYSTEM_PROMPT,
} from "./prompts/rubber-coc.prompt";

export interface ExtractedUniversalDeliveryNote {
  documentType: "SUPPLIER_DELIVERY" | "CUSTOMER_DELIVERY" | "TAX_INVOICE";
  deliveryNoteNumber: string | null;
  invoiceNumber: string | null;
  deliveryDate: string | null;
  purchaseOrderNumber: string | null;
  customerReference: string | null;
  fromCompany: {
    name: string | null;
    address: string | null;
    vatNumber: string | null;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
  };
  toCompany: {
    name: string | null;
    address: string | null;
    vatNumber: string | null;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
  };
  lineItems: Array<{
    description: string;
    productCode: string | null;
    compoundCode: string | null;
    quantity: number | null;
    unitOfMeasure: string | null;
    unitPrice: number | null;
    lineTotal: number | null;
    vatAmount: number | null;
    lineTotalIncVat: number | null;
    isReturned: boolean | null;
    isPaint: boolean | null;
    isTwoPack: boolean | null;
    volumeLitersPerPack: number | null;
    totalLiters: number | null;
    costPerLiter: number | null;
    rollNumber: string | null;
    batchNumber: string | null;
    thicknessMm: number | null;
    widthMm: number | null;
    lengthM: number | null;
    weightKg: number | null;
    color: string | null;
    hardnessShoreA: number | null;
  }>;
  totals: {
    totalQuantity: number | null;
    totalWeightKg: number | null;
    numberOfRolls: number | null;
    subtotalExclVat: number | null;
    vatTotal: number | null;
    grandTotalInclVat: number | null;
  };
  notes: string | null;
  receivedBySignature: boolean;
  receivedDate: string | null;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    totalTokenCount?: number;
  };
}

// The five sparse "spot-check" columns on a Format A (Impilo) Calenderer
// batch table. The position-aware verification pass returns, per column, the
// batch numbers whose cell is non-blank — used to catch row-shift errors.
type SparseColumn =
  | "specificGravity"
  | "reboundPercent"
  | "tearStrengthKnM"
  | "tensileStrengthMpa"
  | "elongationPercent";

type SparseColumnVerification = Record<SparseColumn, string[]>;

@Injectable()
export class RubberCocExtractionService {
  private readonly logger = new Logger(RubberCocExtractionService.name);
  private readonly apiKey: string;
  private readonly model = "gemini-2.5-flash";
  private readonly baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  constructor(
    private readonly aiUsageService: AiUsageService,
    private readonly extractionMetricService: ExtractionMetricService,
  ) {
    this.apiKey = process.env.GEMINI_API_KEY || "";
    if (!this.apiKey) {
      this.logger.warn("GEMINI_API_KEY not configured - CoC extraction will be unavailable");
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  private formatRollRange(rollNumbers: string[]): string {
    if (rollNumbers.length === 0) return "";
    if (rollNumbers.length === 1) return rollNumbers[0];

    const numbers = rollNumbers
      .map((r) => {
        const match = r.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);

    if (numbers.length === 0) return rollNumbers.join(", ");

    const acc = numbers.slice(1).reduce(
      (state, num) => {
        if (num === state.rangeEnd + 1) {
          return { ...state, rangeEnd: num };
        }
        return {
          ranges: [
            ...state.ranges,
            state.rangeStart === state.rangeEnd
              ? `${state.rangeStart}`
              : `${state.rangeStart}-${state.rangeEnd}`,
          ],
          rangeStart: num,
          rangeEnd: num,
        };
      },
      { ranges: [] as string[], rangeStart: numbers[0], rangeEnd: numbers[0] },
    );

    const finalRanges = [
      ...acc.ranges,
      acc.rangeStart === acc.rangeEnd ? `${acc.rangeStart}` : `${acc.rangeStart}-${acc.rangeEnd}`,
    ];
    return finalRanges.join(", ");
  }

  // coc_number is a varchar(100) column; keep generated identifiers comfortably under it.
  private static readonly MAX_COC_NUMBER_LENGTH = 90;

  // Gemini sometimes returns several ticket/batch numbers joined into a single
  // string ("42234, 42235, 42236"), and sometimes returns a bare number. Coerce
  // to string and split so formatRollRange can collapse them into ranges instead
  // of emitting the raw comma list verbatim.
  private splitMultiValueTokens(values: Array<string | number | null | undefined>): string[] {
    const tokens = values
      .filter((v) => v !== null && v !== undefined && v !== "")
      .flatMap((v) => String(v).split(/[,;/]+|\s+/))
      .map((t) => t.trim())
      .filter(Boolean);
    return [...new Set(tokens)];
  }

  private capCocNumber(orderOrPrefix: string, tokens: string[], full: string): string {
    if (full.length <= RubberCocExtractionService.MAX_COC_NUMBER_LENGTH) return full;
    const nums = tokens
      .map((t) => {
        const m = t.match(/\d+/);
        return m ? Number.parseInt(m[0], 10) : Number.NaN;
      })
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b);
    if (nums.length >= 2) return `${orderOrPrefix}${nums[0]}..${nums[nums.length - 1]}`;
    return orderOrPrefix.replace(/-$/, "");
  }

  private generateCalendererCocNumber(
    orderNumber: string | null,
    ticketNumber: string | null,
    rollNumbers: string[] | null,
  ): string | null {
    if (!orderNumber) return null;

    const allRolls = this.splitMultiValueTokens([ticketNumber, ...(rollNumbers ?? [])]);

    if (allRolls.length === 0) return orderNumber;

    const rollRange = this.formatRollRange(allRolls);
    return this.capCocNumber(`${orderNumber}-`, allRolls, `${orderNumber}-${rollRange}`);
  }

  private generateCompounderCocNumber(batchNumbers: string[] | null): string | null {
    if (!batchNumbers || batchNumbers.length === 0) return null;

    const batches = this.splitMultiValueTokens(batchNumbers);
    if (batches.length === 0) return null;

    const batchRange = this.formatRollRange(batches);
    return this.capCocNumber("B", batches, `B${batchRange}`);
  }

  private cleanCompounderCompoundCode(compoundCode: string): string {
    const match = compoundCode.match(/^([A-Z]+\d+[A-Z]*)/i);
    return match ? match[1] : compoundCode;
  }

  async extractCompounderCoc(
    pdfText: string,
    correctionHints?: string | null,
  ): Promise<{
    data: ExtractedCocData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Extracting compounder CoC data...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const systemPrompt = correctionHints
      ? `${COMPOUNDER_COC_SYSTEM_PROMPT}\n\n${correctionHints}`
      : COMPOUNDER_COC_SYSTEM_PROMPT;

    const response = await this.callGemini(
      systemPrompt,
      compounderCocExtractionPrompt(pdfText),
      "compounder-coc-extraction",
    );

    const processingTimeMs = nowMillis() - startTime;
    this.logger.log(`Compounder CoC extracted in ${processingTimeMs}ms`);

    const extractedData = response.data as ExtractedCocData;

    const cocNumber = this.generateCompounderCocNumber(extractedData.batchNumbers ?? null);
    if (cocNumber) {
      extractedData.cocNumber = cocNumber;
      this.logger.log(`Generated Compounder CoC number from batches: ${cocNumber}`);
    }

    if (extractedData.compoundCode) {
      extractedData.compoundCode = this.cleanCompounderCompoundCode(extractedData.compoundCode);
      this.logger.log(`Cleaned compound code: ${extractedData.compoundCode}`);
    }

    this.validateBatchData(extractedData);
    this.warnOnBatchListMismatch(extractedData, "Compounder CoC (text)");

    return {
      data: extractedData,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  async extractCompounderCocFromImages(
    pdfBuffer: Buffer,
    correctionHints?: string | null,
  ): Promise<{
    data: ExtractedCocData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Extracting compounder CoC data via Vision OCR...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const systemPrompt = correctionHints
      ? `${COMPOUNDER_COC_SYSTEM_PROMPT}\n\n${correctionHints}`
      : COMPOUNDER_COC_SYSTEM_PROMPT;

    const images = await this.convertPdfToImages(pdfBuffer);
    this.logger.log(`Converted compounder CoC PDF to ${images.length} image(s) for OCR extraction`);

    const response = await this.callGeminiWithImages(
      systemPrompt,
      "Please extract structured data from this Compounder Certificate of Conformance image. The batch table is the most important element — read column headers first, then each batch row preserving column alignment (blanks must remain null). Return ONLY a valid JSON object with the extracted data.",
      images,
      "compounder-coc-ocr-extraction",
    );

    const processingTimeMs = nowMillis() - startTime;
    this.logger.log(`Compounder CoC extracted via Vision in ${processingTimeMs}ms`);

    const extractedData = response.data as ExtractedCocData;

    const cocNumber = this.generateCompounderCocNumber(extractedData.batchNumbers ?? null);
    if (cocNumber) {
      extractedData.cocNumber = cocNumber;
      this.logger.log(`Generated Compounder CoC number from batches: ${cocNumber}`);
    }

    if (extractedData.compoundCode) {
      extractedData.compoundCode = this.cleanCompounderCompoundCode(extractedData.compoundCode);
      this.logger.log(`Cleaned compound code: ${extractedData.compoundCode}`);
    }

    this.validateBatchData(extractedData);
    this.warnOnSuspiciousBatchColumnCounts(extractedData);
    this.warnOnBatchListMismatch(extractedData, "Compounder CoC (vision)");

    return {
      data: extractedData,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  private warnOnBatchListMismatch(data: ExtractedCocData, source: string): void {
    const declared = (data.batchNumbers ?? []).map((b) => String(b).trim()).filter(Boolean);
    const extracted = (data.batches ?? [])
      .map((b) => (b.batchNumber ?? "").toString().trim())
      .filter(Boolean);

    if (declared.length === 0) return;

    const declaredSet = new Set(declared);
    const extractedSet = new Set(extracted);
    const missing = declared.filter((n) => !extractedSet.has(n));
    const extra = extracted.filter((n) => !declaredSet.has(n));

    if (missing.length > 0 || extra.length > 0) {
      this.logger.error(
        `${source}: batchNumbers/batches mismatch — declared ${declared.length} batches but extracted ${extracted.length} rows. ` +
          `Missing from batches: [${missing.join(", ") || "none"}]. ` +
          `Extra (not in batchNumbers): [${extra.join(", ") || "none"}]. ` +
          "The extraction likely dropped a batch row (often the first or last). Re-extract or patch manually before approval.",
      );
    }
  }

  private warnOnSuspiciousBatchColumnCounts(data: ExtractedCocData): void {
    const batches = data.batches;
    if (!batches || batches.length < 3) return;

    type ColumnKey =
      | "shoreA"
      | "specificGravity"
      | "reboundPercent"
      | "tearStrengthKnM"
      | "tensileStrengthMpa"
      | "elongationPercent"
      | "rheometerSMin"
      | "rheometerSMax"
      | "rheometerTs2"
      | "rheometerTc90";

    const cols: ColumnKey[] = [
      "shoreA",
      "specificGravity",
      "reboundPercent",
      "tearStrengthKnM",
      "tensileStrengthMpa",
      "elongationPercent",
      "rheometerSMin",
      "rheometerSMax",
      "rheometerTs2",
      "rheometerTc90",
    ];

    const counts = cols.map((col) => ({
      col,
      filled: batches.filter((b) => b[col] !== null && b[col] !== undefined).length,
    }));

    const physicalCols = counts.filter((c) =>
      [
        "specificGravity",
        "reboundPercent",
        "tearStrengthKnM",
        "tensileStrengthMpa",
        "elongationPercent",
      ].includes(c.col),
    );

    const allFilled = physicalCols.every((c) => c.filled === batches.length);
    const someFilled = physicalCols.some((c) => c.filled > 0 && c.filled < batches.length);

    if (allFilled && batches.length >= 8) {
      this.logger.warn(
        `Compounder CoC: every batch (${batches.length}) has values for SG/Rebound/Tear/Tensile/Elongation. This is unusual — most CoCs only test a sample (e.g. 2 of 18 batches). Possible column-shift hallucination — verify against source PDF before approving. Counts: ${counts.map((c) => `${c.col}=${c.filled}`).join(", ")}`,
      );
    } else if (someFilled) {
      this.logger.log(
        `Compounder CoC sparse-row pattern OK. Counts: ${counts.map((c) => `${c.col}=${c.filled}`).join(", ")}`,
      );
    }
  }

  async extractCalendererCoc(
    pdfText: string,
    correctionHints?: string | null,
  ): Promise<{
    data: ExtractedCocData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Extracting calenderer CoC data...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const calendererPrompt = correctionHints
      ? `${CALENDARER_COC_SYSTEM_PROMPT}\n\n${correctionHints}`
      : CALENDARER_COC_SYSTEM_PROMPT;

    const response = await this.callGemini(
      calendererPrompt,
      calendererCocExtractionPrompt(pdfText),
      "calenderer-coc-extraction",
    );

    const processingTimeMs = nowMillis() - startTime;
    this.logger.log(`Calenderer CoC extracted in ${processingTimeMs}ms`);

    const extractedData = response.data as ExtractedCocData;

    const cocNumber = this.generateCalendererCocNumber(
      extractedData.orderNumber ?? null,
      extractedData.ticketNumber ?? null,
      extractedData.rollNumbers ?? null,
    );

    if (cocNumber) {
      extractedData.cocNumber = cocNumber;
      this.logger.log(`Generated Calenderer CoC number: ${cocNumber}`);
    }

    this.validateBatchData(extractedData);
    this.warnOnBatchListMismatch(extractedData, "Calenderer CoC (text)");

    return {
      data: extractedData,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  async extractCalendererCocFromImages(
    pdfBuffer: Buffer,
    correctionHints?: string | null,
  ): Promise<{
    data: ExtractedCocData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Extracting calenderer CoC data via Vision OCR...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const systemPrompt = correctionHints
      ? `${CALENDARER_COC_SYSTEM_PROMPT}\n\n${correctionHints}`
      : CALENDARER_COC_SYSTEM_PROMPT;

    const images = await this.convertPdfToImages(pdfBuffer);
    this.logger.log(`Converted calenderer CoC PDF to ${images.length} image(s) for OCR extraction`);

    const response = await this.callGeminiWithImages(
      systemPrompt,
      "Extract structured data from this Impilo Industries Calenderer Certificate of Conformance. Walk EVERY page. The page-2 batch certificates table is the most important — read column headers first, then each batch row preserving column alignment (blanks must remain null). Skip the Unit/Nominal/Limit reference rows; they go into the specifications object, NOT into batches. Return ONLY a valid JSON object with the extracted data.",
      images,
      "calenderer-coc-ocr-extraction",
    );

    const processingTimeMs = nowMillis() - startTime;
    this.logger.log(`Calenderer CoC extracted via Vision in ${processingTimeMs}ms`);

    const extractedData = response.data as ExtractedCocData;

    const cocNumber = this.generateCalendererCocNumber(
      extractedData.orderNumber ?? null,
      extractedData.ticketNumber ?? null,
      extractedData.rollNumbers ?? null,
    );

    if (cocNumber) {
      extractedData.cocNumber = cocNumber;
      this.logger.log(`Generated Calenderer CoC number: ${cocNumber}`);
    }

    this.validateBatchData(extractedData);
    this.warnOnBatchListMismatch(extractedData, "Calenderer CoC (vision)");

    return {
      data: extractedData,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  async extractCalenderRollCoc(
    pdfText: string,
    correctionHints?: string | null,
  ): Promise<{
    data: ExtractedCocData;
    pages: ExtractedCocData[];
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Extracting calender roll CoC data...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const calenderRollPrompt = correctionHints
      ? `${CALENDER_ROLL_COC_SYSTEM_PROMPT}\n\n${correctionHints}`
      : CALENDER_ROLL_COC_SYSTEM_PROMPT;

    const response = await this.callGemini(
      calenderRollPrompt,
      calenderRollCocExtractionPrompt(pdfText),
      "calender-roll-coc-extraction",
    );

    const processingTimeMs = nowMillis() - startTime;
    this.logger.log(`Calender roll CoC extracted in ${processingTimeMs}ms`);

    const built = this.buildCalenderRollExtraction(response.data as Record<string, unknown>);
    return {
      data: built.data,
      pages: built.pages,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  async extractCalenderRollCocFromImages(
    pdfBuffer: Buffer,
    correctionHints?: string | null,
  ): Promise<{
    data: ExtractedCocData;
    pages: ExtractedCocData[];
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Extracting calender roll CoC data via Vision OCR...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const systemPrompt = correctionHints
      ? `${CALENDER_ROLL_COC_SYSTEM_PROMPT}\n\n${correctionHints}`
      : CALENDER_ROLL_COC_SYSTEM_PROMPT;

    const images = await this.convertPdfToImages(pdfBuffer);
    this.logger.log(
      `Converted calender roll CoC PDF to ${images.length} image(s) for OCR extraction`,
    );

    const response = await this.callGeminiWithImages(
      systemPrompt,
      "Extract structured data from this S&N Rubber Calender Roll Certificate of Conformance. Walk EVERY page. Each page is a SEPARATE delivery note shipment with its own delivery note number, production date, PO/waybill, compound batch numbers, and rolls. Read each roll's Shore A row-by-row — never copy a value from a neighbouring row, never carry forward, never invent identical values across rolls. Return ONLY a valid JSON object with the extracted data.",
      images,
      "calender-roll-coc-ocr-extraction",
    );

    const processingTimeMs = nowMillis() - startTime;
    this.logger.log(`Calender roll CoC extracted via Vision in ${processingTimeMs}ms`);

    const built = this.buildCalenderRollExtraction(response.data as Record<string, unknown>);
    return {
      data: built.data,
      pages: built.pages,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  private buildCalenderRollExtraction(rawData: Record<string, unknown>): {
    data: ExtractedCocData;
    pages: ExtractedCocData[];
  } {
    const rawPages = (rawData.pages || []) as Array<Record<string, unknown>>;
    const specs = (rawData.specifications || {}) as Record<string, unknown>;
    const compoundCode = (rawData.compoundCode as string) || undefined;
    const compoundDescription = (rawData.calenderRollDescription as string) || undefined;
    const preparedBy = (rawData.preparedBy as string) || null;
    const approvedByName = (rawData.approvedByName as string) || null;
    const documentDate = (rawData.documentDate as string) || null;
    const approverNames = [preparedBy, approvedByName].filter(Boolean) as string[];

    const sharedSpecFields = {
      shoreANominal: (specs.shoreANominal as number) || null,
      shoreALimits: (specs.shoreALimits as string) || null,
      densityNominal: (specs.densityNominal as number) || null,
      densityLimits: (specs.densityLimits as string) || null,
      tensileNominal: (specs.tensileNominal as number) || null,
      tensileLimits: (specs.tensileLimits as string) || null,
      elongationNominal: (specs.elongationNominal as number) || null,
      elongationLimits: (specs.elongationLimits as string) || null,
    };

    type RawBatchTest = {
      batchNumber: string;
      shoreA?: number;
      specificGravity?: number;
      reboundPercent?: number;
      tearStrengthKnM?: number;
      tensileStrengthMpa?: number;
      elongationPercent?: number;
    };
    const toNumOrUndef = (v: unknown): number | undefined =>
      typeof v === "number" && Number.isFinite(v) ? v : undefined;
    const sanitizeBatches = (raw: unknown): RawBatchTest[] => {
      const arr = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : [];
      return arr
        .map((b) => ({
          batchNumber: String(b?.batchNumber ?? ""),
          shoreA: toNumOrUndef(b?.shoreA),
          specificGravity: toNumOrUndef(b?.specificGravity),
          reboundPercent: toNumOrUndef(b?.reboundPercent),
          tearStrengthKnM: toNumOrUndef(b?.tearStrengthKnM),
          tensileStrengthMpa: toNumOrUndef(b?.tensileStrengthMpa),
          elongationPercent: toNumOrUndef(b?.elongationPercent),
        }))
        .filter((b) => b.batchNumber !== "");
    };

    const pages: ExtractedCocData[] = rawPages.map((page) => {
      const pageRolls = (page.rolls || []) as Array<{
        rollNumber: string;
        shoreA?: number | null;
      }>;
      const rollNumbers = pageRolls.map((r) => r.rollNumber);
      const dnNumber = (page.deliveryNoteNumber as string) || null;
      const rollRange = this.formatRollRange(rollNumbers);
      const cocNumber = dnNumber ? `DN${dnNumber}-R${rollRange}` : `R${rollRange}`;
      const batchNumbers = ((page.batchNumbers || []) as string[]).map((b) => String(b));
      const pageBatches = sanitizeBatches(page.batches);

      return {
        cocNumber,
        compoundCode,
        compoundDescription,
        productionDate: (page.productionDate as string) || undefined,
        orderNumber: (page.purchaseOrderNumber as string) || undefined,
        deliveryNoteNumber: dnNumber,
        waybillNumber: (page.waybillNumber as string) || null,
        rollNumbers,
        rolls: pageRolls,
        batchNumbers,
        batches: pageBatches,
        sharedDensity: (page.sharedDensity as number) || null,
        sharedTensile: (page.sharedTensile as number) || null,
        sharedElongation: (page.sharedElongation as number) || null,
        preparedBy,
        approvedByName,
        documentDate,
        approverNames,
        ...sharedSpecFields,
      };
    });

    const allRolls = rawPages.flatMap((page) =>
      ((page.rolls || []) as Array<{ rollNumber: string; shoreA?: number | null }>).map(
        (roll) => roll,
      ),
    );
    const allRollNumbers = allRolls.map((r) => r.rollNumber);
    const allRollRange = this.formatRollRange(allRollNumbers);
    const firstPage = rawPages[0] || {};
    const firstDnNumber = (firstPage.deliveryNoteNumber as string) || null;
    const allBatchNumbers = rawPages.flatMap((page) =>
      ((page.batchNumbers || []) as string[]).map((b) => String(b)),
    );
    const allBatches = rawPages.flatMap((page) => sanitizeBatches(page.batches));
    const legacyCocNumber = firstDnNumber
      ? `DN${firstDnNumber}-R${allRollRange}`
      : `R${allRollRange}`;

    const data: ExtractedCocData = {
      cocNumber: legacyCocNumber,
      compoundCode,
      compoundDescription,
      productionDate: (firstPage.productionDate as string) || undefined,
      orderNumber: (firstPage.purchaseOrderNumber as string) || undefined,
      rollNumbers: allRollNumbers,
      deliveryNoteNumber: firstDnNumber,
      waybillNumber: (firstPage.waybillNumber as string) || null,
      preparedBy,
      approvedByName,
      documentDate,
      rolls: allRolls,
      batchNumbers: allBatchNumbers,
      batches: allBatches,
      sharedDensity: (firstPage.sharedDensity as number) || null,
      sharedTensile: (firstPage.sharedTensile as number) || null,
      sharedElongation: (firstPage.sharedElongation as number) || null,
      approverNames,
      ...sharedSpecFields,
    };

    if (pages.length > 1) {
      this.logger.log(
        `Multi-page calender roll CoC: ${pages.length} pages, ${allRolls.length} total rolls — caller should split into ${pages.length} CoCs`,
      );
    }

    return { data, pages };
  }

  async extractDeliveryNote(
    pdfText: string,
    correctionHints?: string | null,
  ): Promise<{
    data: ExtractedDeliveryNoteData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Extracting delivery note data...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const systemPrompt = correctionHints
      ? `${DELIVERY_NOTE_SYSTEM_PROMPT}\n\n${correctionHints}`
      : DELIVERY_NOTE_SYSTEM_PROMPT;
    const response = await this.callGemini(
      systemPrompt,
      deliveryNoteExtractionPrompt(pdfText),
      "delivery-note-extraction",
    );

    const processingTimeMs = nowMillis() - startTime;
    this.logger.log(`Delivery note extracted in ${processingTimeMs}ms`);

    return {
      data: response.data as ExtractedDeliveryNoteData,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  async extractCustomerDeliveryNoteFromImages(
    pdfBuffer: Buffer,
    correctionHints?: string | null,
  ): Promise<{
    data: ExtractedCustomerDeliveryNoteData;
    deliveryNotes: ExtractedCustomerDeliveryNoteData[];
    podPages: ExtractedCustomerDeliveryNotePodPage[];
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Extracting customer delivery note data using OCR...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const images = await this.convertPdfToImages(pdfBuffer);
    this.logger.log(`Converted PDF to ${images.length} image(s) for OCR extraction`);

    const systemPrompt = correctionHints
      ? `${CUSTOMER_DELIVERY_NOTE_OCR_PROMPT}\n\n${correctionHints}`
      : CUSTOMER_DELIVERY_NOTE_OCR_PROMPT;
    const response = await this.callGeminiWithImages(
      systemPrompt,
      "Analyze these delivery note images. In the header box at the top, find the REFERENCE: field (between NUMBER: and DATE:) and extract the PO/reference number. This is CRITICAL. Return ONLY valid JSON.",
      images,
      "customer-dn-ocr-extraction",
    );

    const processingTimeMs = nowMillis() - startTime;
    this.logger.log(`Customer delivery note extracted via OCR in ${processingTimeMs}ms`);

    const rawData = response.data as unknown as ExtractedCustomerDeliveryNotesResult;
    const deliveryNotes = (rawData?.deliveryNotes || []).map((dn) =>
      this.sanitizeSnRubberColumnConfusion(dn),
    );

    // Second pass: re-read batch headers + per-roll weights and override the
    // first pass on disagreement. Costs one extra Gemini call (~3-5s) but
    // catches the recurring "5x1100x12.5 → 5x100x12.5" digit-drop and
    // handwritten weight misreads. Silently no-ops on documents (like the
    // S&N tabular format) that have no batch-header text.
    await this.verifyDeliveryNoteBatchesAndWeights(deliveryNotes, images);

    const podPages = rawData?.podPages || [];

    this.logger.log(
      `Found ${deliveryNotes.length} delivery notes and ${podPages.length} POD pages in document via OCR`,
    );
    deliveryNotes.forEach((dn, idx) => {
      this.logger.log(
        `DN ${idx + 1}: number=${dn.deliveryNoteNumber}, ref=${dn.customerReference}, date=${dn.deliveryDate}`,
      );
    });

    const firstNote = deliveryNotes[0] || {};

    return {
      data: firstNote as ExtractedCustomerDeliveryNoteData,
      deliveryNotes,
      podPages,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  async extractTaxInvoice(
    pdfText: string,
    correctionHints?: string | null,
    invoiceType: TaxInvoiceType = TaxInvoiceType.SUPPLIER,
  ): Promise<{
    data: ExtractedTaxInvoiceData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Extracting tax invoice data...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const systemPrompt = this.buildTaxInvoiceSystemPrompt(invoiceType, correctionHints);

    const response = await this.callGemini(
      systemPrompt,
      taxInvoiceExtractionPrompt(pdfText),
      "tax-invoice-extraction",
    );

    const processingTimeMs = nowMillis() - startTime;
    this.logger.log(`Tax invoice extracted in ${processingTimeMs}ms`);

    return {
      data: response.data as unknown as ExtractedTaxInvoiceData,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  async extractTaxInvoiceFromImages(
    pdfBuffer: Buffer,
    correctionHints?: string | null,
    invoiceType: TaxInvoiceType = TaxInvoiceType.SUPPLIER,
  ): Promise<{
    data: ExtractedTaxInvoiceData;
    invoices: ExtractedTaxInvoiceData[];
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Extracting tax invoice data using OCR...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const systemPrompt = this.buildTaxInvoiceSystemPrompt(invoiceType, correctionHints);

    const images = await this.convertPdfToImages(pdfBuffer);
    this.logger.log(`Converted tax invoice PDF to ${images.length} image(s) for OCR extraction`);

    const response = await this.callGeminiWithImages(
      systemPrompt,
      `Extract structured data from this ${images.length}-page PDF. CRITICAL: walk EVERY page and group by invoice number. If the PDF contains multiple distinct invoice numbers, you MUST return one element per invoice in the 'invoices' array — collapsing them into one is a hard error. The top-level fields hold the first invoice's data; the 'invoices' array holds all of them (even if there is only one). Return ONLY a valid JSON object.`,
      images,
      "tax-invoice-ocr-extraction",
    );

    const raw = response.data as unknown as ExtractedTaxInvoiceData & {
      invoices?: ExtractedTaxInvoiceData[];
    };
    const invoices = this.resolveTaxInvoiceArray(raw);
    const data = invoices[0];

    const totalRolls = (data.lineItems ?? []).reduce((sum, li) => sum + (li.rolls?.length ?? 0), 0);
    if (totalRolls > 0 && invoiceType !== TaxInvoiceType.CUSTOMER) {
      await this.verifyAndCorrectRollPairings(data, images);
    }

    const processingTimeMs = nowMillis() - startTime;
    this.logger.log(
      `Tax invoice extracted via OCR in ${processingTimeMs}ms — ${invoices.length} invoice(s) detected`,
    );

    this.warnOnSuspiciousRollNumbers(data);

    return {
      data,
      invoices,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  private buildTaxInvoiceSystemPrompt(
    invoiceType: TaxInvoiceType,
    correctionHints?: string | null,
  ): string {
    const parts = [TAX_INVOICE_SYSTEM_PROMPT];
    if (invoiceType === TaxInvoiceType.CUSTOMER) {
      parts.push(TAX_INVOICE_CUSTOMER_OVERRIDE_PROMPT);
    }
    if (correctionHints) {
      parts.push(correctionHints);
    }
    return parts.join("\n\n");
  }

  private resolveTaxInvoiceArray(
    raw: ExtractedTaxInvoiceData & { invoices?: ExtractedTaxInvoiceData[] },
  ): ExtractedTaxInvoiceData[] {
    const candidate = Array.isArray(raw?.invoices) ? raw.invoices.filter(Boolean) : [];
    if (candidate.length === 0) {
      const { invoices: _ignored, ...single } = raw ?? {};
      return [single as ExtractedTaxInvoiceData];
    }
    const byNumber = candidate.reduce((map, inv) => {
      const key = (inv.invoiceNumber ?? "").trim();
      if (!key) {
        return new Map(map).set(`__unkeyed_${map.size}`, inv);
      }
      if (map.has(key)) {
        return map;
      }
      return new Map(map).set(key, inv);
    }, new Map<string, ExtractedTaxInvoiceData>());
    return Array.from(byNumber.values());
  }

  private async verifyAndCorrectRollPairings(
    data: ExtractedTaxInvoiceData,
    images: Buffer[],
  ): Promise<void> {
    try {
      const verificationPrompt = `You are a verification pass for an invoice extraction. The PDF you are looking at is an Impilo Industries tax invoice.

For each TOLLCALENDERROLLS section in the document, output:
  (a) the section's TOLLCALENDERKG qty (the kg total for the calendering charge — e.g. 126, 533, 98)
  (b) every "Roll # <number>   <kg> kg" detail line beneath that TOLLCALENDERROLLS, in document order

CRITICAL RULES:
1. Each "Roll #" line has EXACTLY ONE roll number followed by EXACTLY ONE weight in kg, on the SAME line. The weight on a line belongs to the roll number on that same line — never the next or previous line.
2. Read each digit individually. Roll numbers on Impilo invoices are 5-digit integers in the 40000–60000 range. Roll weights are typically 40–110kg per roll.
3. The TOLLCALENDERKG qty for a section MUST roughly equal the SUM of that section's roll weights (calendering adds <5% material). If the numbers you've transcribed don't sum correctly, RE-READ each digit before answering — this is the strongest signal of an OCR misread.
4. Distinguish carefully between adjacent digits — 5 vs 6 vs 8, 0 vs 6 vs 8 — these are the most common digit-confusion errors. Read at maximum care.
5. If you cannot read a value with full confidence, use null for that field.
6. List ALL TOLLCALENDERROLLS sections across the whole document, in document order.

Return ONLY a valid JSON object of this exact shape (no extra fields, no commentary):
{
  "sections": [
    {
      "sectionTotalKg": 126,
      "rolls": [{ "rollNumber": "41772", "weightKg": 126 }]
    },
    {
      "sectionTotalKg": 98,
      "rolls": [
        { "rollNumber": "41635", "weightKg": 50 },
        { "rollNumber": "41636", "weightKg": 48 }
      ]
    }
  ]
}`;

      const response = await this.callGeminiWithImages(
        verificationPrompt,
        "Verify the roll number / weight pairs and section totals from this Impilo tax invoice. Return ONLY the JSON.",
        images,
        "tax-invoice-rolls-verification",
      );

      const verification = response.data as {
        sections?: Array<{
          sectionTotalKg: number | null;
          rolls: Array<{ rollNumber: string; weightKg: number | null }>;
        }>;
      };
      const verifiedSections = verification.sections ?? [];
      const verifiedRolls = verifiedSections.flatMap((s) => s.rolls);

      const firstPassRolls = (data.lineItems ?? []).flatMap((li) => li.rolls ?? []);

      const sameLength = verifiedRolls.length === firstPassRolls.length;
      const allMatch =
        sameLength &&
        verifiedRolls.every((vr, i) => {
          const fp = firstPassRolls[i];
          return fp && fp.rollNumber === vr.rollNumber && fp.weightKg === vr.weightKg;
        });

      if (!allMatch) {
        this.logger.warn(
          `Roll verification DISAGREED with first pass — using verified values. First: ${JSON.stringify(firstPassRolls)} | Verified: ${JSON.stringify(verifiedRolls)}`,
        );

        const verifiedById = new Map<string, number | null>();
        verifiedRolls.forEach((vr) => {
          if (vr.rollNumber) verifiedById.set(vr.rollNumber, vr.weightKg);
        });

        (data.lineItems ?? []).forEach((li) => {
          if (!li.rolls || li.rolls.length === 0) return;
          li.rolls = li.rolls.map((roll) => {
            const verifiedWeight = verifiedById.get(roll.rollNumber);
            if (verifiedWeight !== undefined && verifiedWeight !== roll.weightKg) {
              return { rollNumber: roll.rollNumber, weightKg: verifiedWeight };
            }
            return roll;
          });
        });
      } else {
        this.logger.log(
          `Roll verification confirmed ${verifiedRolls.length} pairings on first read.`,
        );
      }

      this.crossCheckRollWeightsAgainstSectionTotal(data, verifiedSections);
    } catch (error) {
      this.logger.warn(
        `Roll verification pass failed: ${error instanceof Error ? error.message : String(error)}. Keeping first-pass values.`,
      );
    }
  }

  /**
   * Second-pass verifier for supplier DNs that group rolls under typed batch
   * headers like "13 roll Steam 40 Red 5x1100x12.5". The first OCR pass is
   * stochastic and routinely drops a digit on those header widths (e.g. 1100
   * → 100) or misreads a handwritten per-roll weight (e.g. 63 → 83). A
   * focused verification call re-reads the batch headers (typed, reliable)
   * and the per-roll "Roll # NNNN  KK kg" lines, and overrides the first
   * pass on disagreement. No-op for documents with no batch headers.
   */
  private async verifyDeliveryNoteBatchesAndWeights(
    deliveryNotes: ExtractedCustomerDeliveryNoteData[],
    images: Buffer[],
  ): Promise<void> {
    if (!deliveryNotes || deliveryNotes.length === 0) return;
    const hasAnyRolls = deliveryNotes.some(
      (dn) => (dn.lineItems ?? []).filter((li) => li?.rollNumber).length > 0,
    );
    if (!hasAnyRolls) return;

    try {
      const verificationPrompt = `You are a verification pass for a supplier delivery note extraction.

The document groups rolls under typed BATCH HEADER lines such as:
  "6 rolls Steam 40 Red 8x800x12.5"
  "3 rolls Steam 40 Red 5x800x12.5"
  "13 roll Steam 40 Red 5x1100x12.5"
  "1 roll Steam 40 Red 5x950x12.5"
The dimensions after the colour/cure spec are: <thicknessMm>x<widthMm>x<lengthM>.

Beneath each batch header, individual rolls are listed as:
  "Roll # 42271   90 kg"

For EACH batch on the document, in document order, output the dimensions from
the header AND every "Roll # ..." line beneath it.

CRITICAL RULES:
1. Read every digit of the BATCH HEADER carefully. "5x1100x12.5" means
   thicknessMm=5, widthMm=1100, lengthM=12.5. Rubber roll widths are 3- or
   4-digit numbers in the 800–1500 range — values under 300 do NOT exist.
   If you find yourself extracting widthMm=100 you missed the leading "1" —
   re-read; it is 1100. Similarly "80" → 800, "150" → 1500.
2. A single document often contains MULTIPLE batches (e.g. a 6-roll 8x800x12.5
   batch followed by a 3-roll 5x800x12.5 batch). They have different
   dimensions. Do NOT collapse them — each batch has its own header.
3. Within one batch ALL rolls share the batch's thicknessMm, widthMm, and
   lengthM exactly — propagate the header values to every roll in that batch.
4. Each "Roll #" line has ONE roll number and ONE handwritten weight on the
   SAME line. Weights are 30–150 kg per roll.
5. Distinguish carefully between commonly-confused digit pairs in handwriting:
   3 vs 5 vs 8, 0 vs 6 vs 8, 1 vs 7. Read each digit at maximum care.
6. If you cannot read a value with full confidence, use null.

Return ONLY a valid JSON object of this exact shape (no extra fields, no
commentary). If the document does not contain batch-header text in this
format, return { "batches": [] }.

{
  "batches": [
    {
      "thicknessMm": 8, "widthMm": 800, "lengthM": 12.5,
      "rolls": [
        { "rollNumber": "42271", "weightKg": 90 },
        { "rollNumber": "42266", "weightKg": 81 }
      ]
    },
    {
      "thicknessMm": 5, "widthMm": 1100, "lengthM": 12.5,
      "rolls": [{ "rollNumber": "42277", "weightKg": 74 }]
    }
  ]
}`;

      const response = await this.callGeminiWithImages(
        verificationPrompt,
        "Verify the batch dimensions and per-roll weights for this supplier delivery note. Return ONLY the JSON.",
        images,
        "supplier-dn-batches-verification",
      );

      const verification = response.data as {
        batches?: Array<{
          thicknessMm: number | null;
          widthMm: number | null;
          lengthM: number | null;
          rolls?: Array<{ rollNumber: string | null; weightKg: number | null }>;
        }>;
      };
      const verifiedBatches = verification.batches ?? [];
      if (verifiedBatches.length === 0) {
        this.logger.log(
          "Batch verification: no batch headers detected — keeping first-pass values",
        );
        return;
      }

      const verifiedByRoll = new Map<
        string,
        {
          thicknessMm: number | null;
          widthMm: number | null;
          lengthM: number | null;
          weightKg: number | null;
        }
      >();
      for (const batch of verifiedBatches) {
        const rawBatchRolls = batch.rolls;
        const batchRolls = rawBatchRolls ? rawBatchRolls : [];
        for (const roll of batchRolls) {
          if (!roll?.rollNumber) continue;
          verifiedByRoll.set(roll.rollNumber, {
            thicknessMm: batch.thicknessMm,
            widthMm: batch.widthMm,
            lengthM: batch.lengthM,
            weightKg: roll.weightKg,
          });
        }
      }

      let correctionCount = 0;
      for (const dn of deliveryNotes) {
        const rawLineItems = dn.lineItems;
        const lineItems = rawLineItems ? rawLineItems : [];
        for (const item of lineItems) {
          if (!item?.rollNumber) continue;
          const verified = verifiedByRoll.get(item.rollNumber);
          if (!verified) continue;
          const corrections: string[] = [];
          if (verified.thicknessMm != null && verified.thicknessMm !== item.thicknessMm) {
            corrections.push(`thicknessMm ${item.thicknessMm}→${verified.thicknessMm}`);
            item.thicknessMm = verified.thicknessMm;
          }
          if (verified.widthMm != null && verified.widthMm !== item.widthMm) {
            corrections.push(`widthMm ${item.widthMm}→${verified.widthMm}`);
            item.widthMm = verified.widthMm;
          }
          if (verified.lengthM != null && verified.lengthM !== item.lengthM) {
            corrections.push(`lengthM ${item.lengthM}→${verified.lengthM}`);
            item.lengthM = verified.lengthM;
          }
          if (verified.weightKg != null && verified.weightKg !== item.actualWeightKg) {
            corrections.push(`weightKg ${item.actualWeightKg}→${verified.weightKg}`);
            item.actualWeightKg = verified.weightKg;
          }
          if (corrections.length > 0) {
            correctionCount++;
            this.logger.log(`Verified roll ${item.rollNumber}: ${corrections.join(", ")}`);
          }
        }
      }

      if (correctionCount > 0) {
        this.logger.warn(`Batch verification corrected ${correctionCount} roll(s) on supplier DN`);
      } else {
        this.logger.log(
          `Batch verification confirmed ${verifiedByRoll.size} roll(s) on first read`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Batch verification pass failed: ${err instanceof Error ? err.message : String(err)} — keeping first-pass values`,
      );
    }
  }

  private crossCheckRollWeightsAgainstSectionTotal(
    data: ExtractedTaxInvoiceData,
    verifiedSections: Array<{
      sectionTotalKg: number | null;
      rolls: Array<{ rollNumber: string; weightKg: number | null }>;
    }>,
  ): void {
    const lineItemsWithRolls = (data.lineItems ?? []).filter(
      (li) => li.rolls && li.rolls.length > 0,
    );

    lineItemsWithRolls.forEach((li, idx) => {
      const section = verifiedSections[idx];
      const sectionTotalKg = section?.sectionTotalKg ?? null;
      if (!li.rolls || sectionTotalKg == null) return;

      const sumOfRollWeights = li.rolls.reduce((sum, r) => sum + (r.weightKg ?? 0), 0);
      const diff = Math.abs(sumOfRollWeights - sectionTotalKg);

      if (diff <= 1) return;

      if (li.rolls.length === 1 && diff <= 10) {
        this.logger.warn(
          `Sum-check correction on ${li.description}: roll ${li.rolls[0].rollNumber} weight ${li.rolls[0].weightKg}kg differed from sectionTotalKg ${sectionTotalKg}kg by ${diff}kg (single-roll section). Using sectionTotalKg as source of truth.`,
        );
        li.rolls[0] = { rollNumber: li.rolls[0].rollNumber, weightKg: sectionTotalKg };
      } else {
        this.logger.warn(
          `Sum-check FAILED on ${li.description}: sum of roll weights = ${sumOfRollWeights}kg but sectionTotalKg = ${sectionTotalKg}kg (diff ${diff}kg). Roll weights left as-is — manual review recommended before approval.`,
        );
      }
    });
  }

  private warnOnSuspiciousRollNumbers(data: ExtractedTaxInvoiceData): void {
    const lineItems = data.lineItems ?? [];
    lineItems.forEach((item, idx) => {
      const rolls = item.rolls;
      if (!rolls || rolls.length < 2) return;

      const numericRolls = rolls
        .map((r) => ({ raw: r.rollNumber, num: parseInt(r.rollNumber, 10) }))
        .filter((r) => Number.isFinite(r.num));

      if (numericRolls.length < 2) return;

      const sorted = numericRolls.map((r) => r.num).sort((a, b) => a - b);
      const span = sorted[sorted.length - 1] - sorted[0];
      const expectedSpan = sorted.length - 1;
      if (span > expectedSpan + 10) {
        this.logger.warn(
          `Suspicious roll numbers on line ${idx} (${item.description}): ${rolls.map((r) => r.rollNumber).join(", ")}. Span=${span} but expected ~${expectedSpan} for ${rolls.length} sequential rolls. This is a strong signal of OCR error — please verify against the source PDF before approving.`,
        );
      }

      const out = numericRolls.filter((r) => r.num < 40000 || r.num > 60000);
      if (out.length > 0) {
        this.logger.warn(
          `Roll numbers outside the typical Impilo range (40000-60000) on line ${idx} (${item.description}): ${out.map((r) => r.raw).join(", ")}. Verify against the source PDF.`,
        );
      }

      const unreadable = rolls.filter((r) => r.rollNumber === "UNREADABLE");
      if (unreadable.length > 0) {
        this.logger.warn(
          `${unreadable.length} unreadable roll number(s) on line ${idx} (${item.description}). Manual entry required before approval.`,
        );
      }
    });
  }

  async extractCreditNote(
    pdfText: string,
    correctionHints?: string | null,
  ): Promise<{
    data: ExtractedTaxInvoiceData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Extracting credit note data...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const systemPrompt = correctionHints
      ? `${CREDIT_NOTE_SYSTEM_PROMPT}\n\n${correctionHints}`
      : CREDIT_NOTE_SYSTEM_PROMPT;

    const response = await this.callGemini(
      systemPrompt,
      creditNoteExtractionPrompt(pdfText),
      "credit-note-extraction",
    );

    const processingTimeMs = nowMillis() - startTime;
    this.logger.log(`Credit note extracted in ${processingTimeMs}ms`);

    return {
      data: response.data as unknown as ExtractedTaxInvoiceData,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  async extractCreditNoteFromImages(
    pdfBuffer: Buffer,
    correctionHints?: string | null,
  ): Promise<{
    data: ExtractedTaxInvoiceData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Extracting credit note data using OCR...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const systemPrompt = correctionHints
      ? `${CREDIT_NOTE_SYSTEM_PROMPT}\n\n${correctionHints}`
      : CREDIT_NOTE_SYSTEM_PROMPT;

    const images = await this.convertPdfToImages(pdfBuffer);
    this.logger.log(`Converted credit note PDF to ${images.length} image(s) for OCR extraction`);

    const response = await this.callGeminiWithImages(
      systemPrompt,
      "Please extract structured data from this supplier credit note image. Return ONLY a valid JSON object with the extracted data.",
      images,
      "credit-note-ocr-extraction",
    );

    const processingTimeMs = nowMillis() - startTime;
    this.logger.log(`Credit note extracted via OCR in ${processingTimeMs}ms`);

    return {
      data: response.data as unknown as ExtractedTaxInvoiceData,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  private async runExtractionForType(
    cocType: SupplierCocType,
    pdfText: string,
    correctionHints?: string | null,
    pdfBuffer?: Buffer,
  ): Promise<{
    data: ExtractedCocData;
    pages?: ExtractedCocData[];
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    if (cocType === SupplierCocType.COMPOUNDER) {
      return pdfBuffer
        ? this.extractCompounderCocFromImages(pdfBuffer, correctionHints)
        : this.extractCompounderCoc(pdfText, correctionHints);
    }
    if (cocType === SupplierCocType.CALENDER_ROLL) {
      return pdfBuffer
        ? this.extractCalenderRollCocFromImages(pdfBuffer, correctionHints)
        : this.extractCalenderRollCoc(pdfText, correctionHints);
    }
    return pdfBuffer
      ? this.extractCalendererCocFromImages(pdfBuffer, correctionHints)
      : this.extractCalendererCoc(pdfText, correctionHints);
  }

  // Which declared batchNumbers never made it into the batches[] detail rows.
  private missingBatchRows(data: ExtractedCocData): string[] {
    const declared = (data.batchNumbers ?? []).map((b) => String(b).trim()).filter(Boolean);
    if (declared.length === 0) return [];
    const extracted = new Set(
      (data.batches ?? []).map((b) => (b.batchNumber ?? "").toString().trim()).filter(Boolean),
    );
    return declared.filter((n) => !extracted.has(n));
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  // Compares extracted batches against the document's own "Count" and "Median"
  // summary rows. Catches dropped, hallucinated, or misread cell values. (A
  // pure row-shift preserves both — that is caught by the position pass.)
  private validateBatchStats(data: ExtractedCocData): string[] {
    const stats = data.batchStats;
    const batches = data.batches ?? [];
    if (!stats || batches.length === 0) return [];
    const defects: string[] = [];
    const fields: (keyof BatchStatRow)[] = [
      "shoreA",
      "specificGravity",
      "reboundPercent",
      "tearStrengthKnM",
      "tensileStrengthMpa",
      "elongationPercent",
      "rheometerSMin",
      "rheometerSMax",
      "rheometerTs2",
      "rheometerTc90",
    ];
    for (const field of fields) {
      const values = batches.map((b) => b[field]).filter((v): v is number => typeof v === "number");
      const reportedCount = stats.count?.[field];
      if (typeof reportedCount === "number" && reportedCount !== values.length) {
        defects.push(
          `${field}: document Count row = ${reportedCount}, extracted ${values.length} populated batch(es)`,
        );
      }
      const reportedMedian = stats.median?.[field];
      if (typeof reportedMedian === "number" && values.length > 0) {
        const actual = this.median(values);
        const tolerance = Math.max(Math.abs(reportedMedian) * 0.02, 0.05);
        if (Math.abs(actual - reportedMedian) > tolerance) {
          defects.push(
            `${field}: document Median row = ${reportedMedian}, extracted batches median = ${actual.toFixed(4)}`,
          );
        }
      }
    }
    return defects;
  }

  // Independent vision pass: asks ONLY which batches have a non-blank cell in
  // each sparse column. Position-aware, so it catches a spot-check row that
  // the main extraction attributed to the wrong (usually adjacent) batch.
  private async verifySparseColumns(pdfBuffer: Buffer): Promise<SparseColumnVerification | null> {
    try {
      const images = await this.convertPdfToImages(pdfBuffer);
      const response = await this.callGeminiWithImages(
        CALENDERER_SPARSE_VERIFY_PROMPT,
        "List which batches were spot-checked, following the instructions exactly. Return ONLY the JSON object.",
        images,
        "calenderer-sparse-verify",
      );
      const raw = response.data;
      const columns: SparseColumn[] = [
        "specificGravity",
        "reboundPercent",
        "tearStrengthKnM",
        "tensileStrengthMpa",
        "elongationPercent",
      ];
      const toList = (value: unknown): string[] =>
        Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : [];
      const result = {} as SparseColumnVerification;
      for (const column of columns) result[column] = toList(raw[column]);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Sparse-column verification pass failed (skipping position check): ${message}`,
      );
      return null;
    }
  }

  // Cross-checks which batches the main extraction gave sparse values to
  // against the verification pass — a mismatch means a spot-check row shifted.
  private validateSparsePositions(
    data: ExtractedCocData,
    verify: SparseColumnVerification,
  ): string[] {
    const batches = data.batches ?? [];
    if (batches.length === 0) return [];
    const defects: string[] = [];
    const columns: SparseColumn[] = [
      "specificGravity",
      "reboundPercent",
      "tearStrengthKnM",
      "tensileStrengthMpa",
      "elongationPercent",
    ];
    for (const column of columns) {
      const extracted = new Set(
        batches.filter((b) => b[column] != null).map((b) => String(b.batchNumber).trim()),
      );
      const expected = new Set(verify[column]);
      const onlyExpected = [...expected].filter((n) => !extracted.has(n));
      const onlyExtracted = [...extracted].filter((n) => !expected.has(n));
      if (onlyExpected.length > 0 || onlyExtracted.length > 0) {
        defects.push(
          `${column}: spot-check rows misaligned — document has values on batch(es) [${[...expected].join(", ") || "none"}], extraction placed them on [${[...extracted].join(", ") || "none"}]`,
        );
      }
    }
    return defects;
  }

  // All batch-table defects for a result: dropped rows always; for Format A
  // Calenderer CoCs also the Count/Median and spot-check-position checks.
  private extractionDefects(
    cocType: SupplierCocType,
    data: ExtractedCocData,
    sparseVerify: SparseColumnVerification | null,
  ): string[] {
    const missing = this.missingBatchRows(data).map((m) => `dropped batch ${m}`);
    const batches = data.batches ?? [];
    const isCalendererFormatA =
      cocType === SupplierCocType.CALENDARER &&
      batches.some((b) => b.rheometerSMin != null || b.reboundPercent != null);
    if (!isCalendererFormatA) return missing;
    const stats = this.validateBatchStats(data);
    const positions = sparseVerify ? this.validateSparsePositions(data, sparseVerify) : [];
    return [...missing, ...stats, ...positions];
  }

  // Last-resort: insert a visible all-null batch row for every declared batch the
  // model dropped, ordered to match batchNumbers, so a missing batch is never
  // silently lost from the table even when retries fail to recover it.
  private backfillMissingBatchStubs(data: ExtractedCocData, missing: string[]): void {
    if (missing.length === 0) return;
    const batches = data.batches ?? [];
    for (const batchNumber of missing) {
      batches.push({ batchNumber });
    }
    const order = new Map((data.batchNumbers ?? []).map((b, i) => [String(b).trim(), i] as const));
    batches.sort((a, b) => {
      const ai = order.get(String(a.batchNumber).trim()) ?? Number.MAX_SAFE_INTEGER;
      const bi = order.get(String(b.batchNumber).trim()) ?? Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
    data.batches = batches;
  }

  async extractByType(
    cocType: SupplierCocType,
    pdfText: string,
    correctionHints?: string | null,
    pdfBuffer?: Buffer,
  ): Promise<{
    data: ExtractedCocData;
    pages?: ExtractedCocData[];
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    return this.extractionMetricService.time(
      "rubber-coc-extract",
      cocType,
      async () => {
        const MAX_ATTEMPTS = 3;
        let best: Awaited<ReturnType<typeof this.runExtractionForType>> | null = null;
        let bestDefectCount = Number.POSITIVE_INFINITY;
        // Position-aware verification pass — run once, lazily, the first time
        // a Format A Calenderer result appears; reused across retry attempts.
        let sparseVerify: SparseColumnVerification | null | undefined;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
          const result = await this.runExtractionForType(
            cocType,
            pdfText,
            correctionHints,
            pdfBuffer,
          );

          const batches = result.data.batches ?? [];
          const isCalendererFormatA =
            cocType === SupplierCocType.CALENDARER &&
            batches.some((b) => b.rheometerSMin != null || b.reboundPercent != null);
          if (isCalendererFormatA && pdfBuffer && sparseVerify === undefined) {
            sparseVerify = await this.verifySparseColumns(pdfBuffer);
          }

          const defects = this.extractionDefects(cocType, result.data, sparseVerify ?? null);
          if (defects.length === 0) return result;

          if (defects.length < bestDefectCount) {
            best = result;
            bestDefectCount = defects.length;
          }
          if (attempt < MAX_ATTEMPTS) {
            this.logger.warn(
              `${cocType} extraction attempt ${attempt} has ${defects.length} batch defect(s): ${defects.join("; ")} — retrying`,
            );
          }
        }

        const result = best as Awaited<ReturnType<typeof this.runExtractionForType>>;
        const missing = this.missingBatchRows(result.data);
        if (missing.length > 0) {
          this.logger.error(
            `${cocType} extraction still missing ${missing.length} batch row(s) [${missing.join(", ")}] after ${MAX_ATTEMPTS} attempts — inserting null placeholder rows so they stay visible for manual entry`,
          );
          this.backfillMissingBatchStubs(result.data, missing);
        }
        const residual = this.extractionDefects(cocType, result.data, sparseVerify ?? null).filter(
          (d) => !d.startsWith("dropped batch "),
        );
        if (residual.length > 0) {
          this.logger.error(
            `${cocType} extraction batch data failed validation after ${MAX_ATTEMPTS} attempts — verify against the source PDF before approving: ${residual.join("; ")}`,
          );
        }
        return result;
      },
      pdfBuffer?.length,
    );
  }

  private sanitizeSnRubberColumnConfusion(
    dn: ExtractedCustomerDeliveryNoteData,
  ): ExtractedCustomerDeliveryNoteData {
    const items = dn.lineItems || [];
    if (items.length === 0) return dn;

    const allRollNumbersLookLikeWeights = items.every((item) => {
      const rollNum = Number(item.rollNumber);
      return !Number.isNaN(rollNum) && rollNum > 20;
    });
    const allWeightsMissing = items.every(
      (item) => !item.actualWeightKg || item.actualWeightKg === 0,
    );

    if (allRollNumbersLookLikeWeights && allWeightsMissing) {
      this.logger.warn(
        `S&N Rubber column confusion detected for DN ${dn.deliveryNoteNumber}: roll numbers (${items.map((i) => i.rollNumber).join(", ")}) look like weights. Auto-correcting.`,
      );
      return {
        ...dn,
        lineItems: items.map((item, idx) => ({
          ...item,
          actualWeightKg: Number(item.rollNumber),
          rollNumber: String(idx + 1),
        })),
      };
    }

    return dn;
  }

  private async callGemini(
    systemPrompt: string,
    userPrompt: string,
    actionType?: string,
  ): Promise<{ data: Record<string, unknown>; tokensUsed?: number }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: systemPrompt }, { text: userPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 32768,
              responseMimeType: "application/json",
            },
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Gemini API error: ${response.status} - ${errorText}`);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data: GeminiResponse = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        this.logger.warn("No content in Gemini response");
        return { data: {}, tokensUsed: data.usageMetadata?.totalTokenCount };
      }

      const parsed = this.parseJsonResponse(content);
      const tokensUsed = data.usageMetadata?.totalTokenCount;

      if (actionType) {
        this.aiUsageService.log({
          app: AiApp.AU_RUBBER,
          actionType,
          provider: AiProvider.GEMINI,
          model: this.model,
          tokensUsed,
        });
      }

      return {
        data: parsed,
        tokensUsed,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        this.logger.error("Gemini API request timed out after 90 seconds");
        throw new Error("Gemini API request timed out");
      }
      throw error;
    }
  }

  private validateBatchData(data: ExtractedCocData): void {
    if (!data.batches) return;

    const hasVal = (v: number | null | undefined): v is number => v !== null && v !== undefined;

    const documentHasRheometer = data.batches.some(
      (b) =>
        hasVal(b.rheometerSMin) ||
        hasVal(b.rheometerSMax) ||
        hasVal(b.rheometerTs2) ||
        hasVal(b.rheometerTc90),
    );

    data.batches = data.batches.map((batch) => {
      const corrected = { ...batch };

      const noElong = !hasVal(corrected.elongationPercent);
      const sgInSMinRange =
        hasVal(corrected.specificGravity) &&
        corrected.specificGravity >= 0.5 &&
        corrected.specificGravity <= 2.5;

      if (documentHasRheometer && noElong && sgInSMinRange) {
        const candidates: number[] = [];
        if (hasVal(corrected.specificGravity)) candidates.push(corrected.specificGravity);
        if (hasVal(corrected.tensileStrengthMpa)) candidates.push(corrected.tensileStrengthMpa);
        if (hasVal(corrected.tearStrengthKnM)) candidates.push(corrected.tearStrengthKnM);
        if (hasVal(corrected.reboundPercent)) candidates.push(corrected.reboundPercent);
        if (hasVal(corrected.rheometerSMin)) candidates.push(corrected.rheometerSMin);
        if (hasVal(corrected.rheometerSMax)) candidates.push(corrected.rheometerSMax);
        if (hasVal(corrected.rheometerTs2)) candidates.push(corrected.rheometerTs2);
        if (hasVal(corrected.rheometerTc90)) candidates.push(corrected.rheometerTc90);

        const unique = [...new Set(candidates)];

        const sMinMatch = unique.find((v) => v >= 0.5 && v <= 2.5);
        const sMaxMatch = unique.find((v) => v >= 3.0 && v <= 15.0 && v !== sMinMatch);
        const ts2Tc90 = unique
          .filter((v) => v !== sMinMatch && v !== sMaxMatch && v >= 2.0 && v <= 10.0)
          .sort((a, b) => a - b);

        this.logger.warn(
          `Batch ${batch.batchNumber}: Sparse row detected (no elongation, SG=${corrected.specificGravity} in S'min range). ` +
            `Candidate values: [${unique.join(", ")}]. ` +
            `Reassigning → S'min=${sMinMatch || null}, S'max=${sMaxMatch || null}, ` +
            `TS2=${ts2Tc90[0] || null}, TC90=${ts2Tc90[1] || null}`,
        );

        corrected.specificGravity = undefined;
        corrected.tensileStrengthMpa = undefined;
        corrected.tearStrengthKnM = undefined;
        corrected.reboundPercent = undefined;
        corrected.rheometerSMin = sMinMatch ?? undefined;
        corrected.rheometerSMax = sMaxMatch ?? undefined;
        corrected.rheometerTs2 = ts2Tc90[0] ?? undefined;
        corrected.rheometerTc90 = ts2Tc90[1] ?? undefined;
      }

      const tearInReboundRange =
        hasVal(corrected.tearStrengthKnM) && corrected.tearStrengthKnM > 50;
      const tensileInTearRange =
        hasVal(corrected.tensileStrengthMpa) && corrected.tensileStrengthMpa > 30;

      if (tearInReboundRange && tensileInTearRange) {
        this.logger.warn(
          `Batch ${batch.batchNumber}: Column swap detected - tear=${corrected.tearStrengthKnM} is in rebound range, ` +
            `tensile=${corrected.tensileStrengthMpa} is in tear range. Correcting.`,
        );
        const realRebound = corrected.tearStrengthKnM;
        const realTear = corrected.tensileStrengthMpa;
        const possibleTensile =
          hasVal(corrected.elongationPercent) &&
          corrected.elongationPercent >= 5 &&
          corrected.elongationPercent <= 35
            ? corrected.elongationPercent
            : undefined;

        corrected.reboundPercent = realRebound;
        corrected.tearStrengthKnM = realTear;
        corrected.tensileStrengthMpa = possibleTensile;
        corrected.elongationPercent =
          possibleTensile !== undefined ? undefined : corrected.elongationPercent;
      }

      if (
        hasVal(corrected.elongationPercent) &&
        corrected.elongationPercent < 100 &&
        hasVal(corrected.rheometerSMin) &&
        corrected.rheometerSMin > 10
      ) {
        const combinedStr = `${corrected.elongationPercent}${corrected.rheometerSMin}`;
        const decimalMatch = combinedStr.match(/^(\d{3,4})(\d\.\d+)$/);
        if (decimalMatch) {
          corrected.elongationPercent = Number.parseFloat(decimalMatch[1]);
          corrected.rheometerSMin = Number.parseFloat(decimalMatch[2]);
          this.logger.warn(
            `Batch ${batch.batchNumber}: Fixed merged elongation/S'min columns: elongation=${corrected.elongationPercent}, S'min=${corrected.rheometerSMin}`,
          );
        }
      }

      if (hasVal(corrected.elongationPercent) && corrected.elongationPercent < 100) {
        this.logger.warn(
          `Batch ${batch.batchNumber}: Suspicious elongation value ${corrected.elongationPercent} (expected 600-980), setting to null`,
        );
        corrected.elongationPercent = undefined;
      }

      if (hasVal(corrected.rheometerSMin) && corrected.rheometerSMin > 10) {
        this.logger.warn(
          `Batch ${batch.batchNumber}: Suspicious S'min value ${corrected.rheometerSMin} (expected 0.5-2.0), setting to null`,
        );
        corrected.rheometerSMin = undefined;
      }

      // Shore A on rubber CoCs is always a whole number; a non-integer (e.g.
      // 39.5) is a mis-read — usually two adjacent readings averaged. Round it
      // so the value is at least format-valid, and warn so it can be checked.
      if (hasVal(corrected.shoreA) && !Number.isInteger(corrected.shoreA)) {
        const rounded = Math.round(corrected.shoreA);
        this.logger.warn(
          `Batch ${batch.batchNumber}: Shore A ${corrected.shoreA} is not a whole number — rubber CoC Shore A is always an integer. Rounding to ${rounded}; verify against the source PDF.`,
        );
        corrected.shoreA = rounded;
      }

      return corrected;
    });
  }

  private parseJsonResponse(content: string): Record<string, unknown> {
    const jsonStr = content
      .trim()
      .replace(/^```json/, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();

    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      this.logger.error(`Failed to parse JSON response: ${error.message}`);
      this.logger.debug(`Raw content: ${content.substring(0, 500)}`);
      return {};
    }
  }

  async convertPdfToImages(documentBuffer: Buffer): Promise<Buffer[]> {
    const kind = this.sniffDocumentKind(documentBuffer);
    if (kind === "png" || kind === "jpeg") {
      this.logger.log(`Document is already an image (${kind}); skipping PDF rasterisation`);
      return [documentBuffer];
    }
    if (kind !== "pdf") {
      throw new Error(
        "Unsupported document format: expected PDF, PNG or JPEG. The uploaded file's magic bytes match none of these — re-upload the original document.",
      );
    }
    this.logger.log("Converting PDF to images for OCR...");
    const pdfInput = documentBuffer.buffer.slice(
      documentBuffer.byteOffset,
      documentBuffer.byteOffset + documentBuffer.byteLength,
    );
    const pages = await pdfToPng(pdfInput, {
      disableFontFace: true,
      useSystemFonts: true,
      viewportScale: 1.0,
    });
    this.logger.log(`Converted PDF to ${pages.length} image(s)`);
    return pages.filter((page) => page.content !== undefined).map((page) => page.content as Buffer);
  }

  private sniffDocumentKind(buffer: Buffer): "pdf" | "png" | "jpeg" | "unknown" {
    if (buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-") return "pdf";
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return "png";
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return "jpeg";
    }
    return "unknown";
  }

  private async callGeminiWithImages(
    systemPrompt: string,
    userPrompt: string,
    images: Buffer[],
    actionType?: string,
  ): Promise<{ data: Record<string, unknown>; tokensUsed?: number }> {
    const imageParts = images.map((img) => ({
      inline_data: {
        mime_type: "image/png",
        data: img.toString("base64"),
      },
    }));

    const body = JSON.stringify({
      contents: [
        {
          parts: [{ text: systemPrompt }, { text: userPrompt }, ...imageParts],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 32768,
        responseMimeType: "application/json",
      },
    });

    const maxRetries = 3;
    const retryDelays = [2000, 5000, 10000];
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      try {
        const response = await fetch(
          `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        if (response.status === 429) {
          const errorText = await response.text();
          this.logger.warn(`Gemini 429 on attempt ${attempt + 1}/${maxRetries} - ${errorText}`);
          if (attempt < maxRetries - 1) {
            const delay = retryDelays[attempt];
            this.logger.log(`Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          throw new HttpException(
            "Please try again. If the problem persists, wait a few minutes before retrying.",
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.error(`Gemini Vision API error: ${response.status} - ${errorText}`);
          throw new HttpException(
            "Document analysis failed. Please try again, or wait a few minutes if the problem persists.",
            HttpStatus.BAD_GATEWAY,
          );
        }

        const data: GeminiResponse = await response.json();
        const finishReason = data.candidates?.[0]?.finishReason;
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (finishReason === "MAX_TOKENS") {
          this.logger.warn(
            `Gemini Vision response was truncated (MAX_TOKENS). Output may be incomplete. Tokens used: ${data.usageMetadata?.totalTokenCount}`,
          );
        }

        if (!content) {
          this.logger.warn("No content in Gemini Vision response");
          return { data: {}, tokensUsed: data.usageMetadata?.totalTokenCount };
        }

        this.logger.log(
          `Gemini Vision response: finishReason=${finishReason}, contentLength=${content.length}, tokens=${data.usageMetadata?.totalTokenCount}`,
        );

        const parsed = this.parseJsonResponse(content);
        const tokensUsed = data.usageMetadata?.totalTokenCount;

        if (actionType) {
          this.aiUsageService.log({
            app: AiApp.AU_RUBBER,
            actionType,
            provider: AiProvider.GEMINI,
            model: this.model,
            tokensUsed,
            pageCount: images.length,
          });
        }

        return { data: parsed, tokensUsed };
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          this.logger.error("Gemini Vision API request timed out after 180 seconds");
          throw new HttpException(
            "Document analysis timed out. Please try again with a smaller image.",
            HttpStatus.GATEWAY_TIMEOUT,
          );
        }
        if (error instanceof HttpException) {
          throw error;
        }
        lastError = error;
        this.logger.error(`Unexpected Gemini Vision error: ${error.message}`);
      }
    }

    throw new HttpException(
      lastError?.message || "Document analysis failed. Please try again.",
      HttpStatus.BAD_GATEWAY,
    );
  }

  async extractDeliveryNoteFromImages(
    pdfBuffer: Buffer,
    correctionHints?: string | null,
  ): Promise<{
    data: ExtractedDeliveryNoteData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Extracting delivery note from scanned PDF using OCR...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const images = await this.convertPdfToImages(pdfBuffer);

    const systemPrompt = correctionHints
      ? `${DELIVERY_NOTE_SYSTEM_PROMPT}\n\n${correctionHints}`
      : DELIVERY_NOTE_SYSTEM_PROMPT;
    const response = await this.callGeminiWithImages(
      systemPrompt,
      "Please extract structured data from this scanned delivery note image. Return ONLY a valid JSON object with the extracted data.",
      images,
      "delivery-note-ocr-extraction",
    );

    const processingTimeMs = nowMillis() - startTime;
    this.logger.log(`Delivery note extracted via OCR in ${processingTimeMs}ms`);

    return {
      data: response.data as ExtractedDeliveryNoteData,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  async analyzeDeliveryNotePhoto(
    imageBuffers: Buffer[],
    correctionHints?: string | null,
  ): Promise<{
    data: ExtractedUniversalDeliveryNote;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log(`Analyzing ${imageBuffers.length} delivery note photo(s)...`);

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const systemPrompt = correctionHints
      ? `${UNIVERSAL_DELIVERY_NOTE_SYSTEM_PROMPT}\n\n${correctionHints}`
      : UNIVERSAL_DELIVERY_NOTE_SYSTEM_PROMPT;

    const response = await this.callGeminiWithImages(
      systemPrompt,
      "Please analyze this delivery note photo and extract all company information, stock details, and line items. Return ONLY a valid JSON object with the extracted data.",
      imageBuffers,
      "delivery-note-photo-analysis",
    );

    const processingTimeMs = nowMillis() - startTime;
    this.logger.log(`Delivery note photo analyzed in ${processingTimeMs}ms`);

    return {
      data: response.data as unknown as ExtractedUniversalDeliveryNote,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  async analyzeDeliveryNotePdf(
    pdfBuffer: Buffer,
    correctionHints?: string | null,
  ): Promise<{
    data: ExtractedUniversalDeliveryNote;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Analyzing delivery note PDF...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const images = await this.convertPdfToImages(pdfBuffer);

    const systemPrompt = correctionHints
      ? `${UNIVERSAL_DELIVERY_NOTE_SYSTEM_PROMPT}\n\n${correctionHints}`
      : UNIVERSAL_DELIVERY_NOTE_SYSTEM_PROMPT;

    const response = await this.callGeminiWithImages(
      systemPrompt,
      "Please analyze this delivery note and extract all company information, stock details, and line items. Return ONLY a valid JSON object with the extracted data.",
      images,
      "delivery-note-pdf-analysis",
    );

    const processingTimeMs = nowMillis() - startTime;
    this.logger.log(`Delivery note PDF analyzed in ${processingTimeMs}ms`);

    return {
      data: response.data as unknown as ExtractedUniversalDeliveryNote,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  /**
   * Identify the supplier company that ISSUED a document by reading its
   * letterhead visually. Used for scanned/photographed PDFs that carry no
   * text layer, where keyword matching on extracted text finds nothing.
   * Returns the issuer's name as printed, or null if it cannot be determined.
   */
  async identifySupplierFromImages(pdfBuffer: Buffer): Promise<string | null> {
    if (!this.apiKey) {
      this.logger.warn("GEMINI_API_KEY not configured — cannot vision-detect supplier");
      return null;
    }

    const images = await this.convertPdfToImages(pdfBuffer);
    if (images.length === 0) return null;

    const systemPrompt = `You identify which company ISSUED a rubber-industry document (a delivery note, certificate of conformance, or invoice).
The issuer is the company whose letterhead, logo, and address appear at the TOP of the document — NOT the customer it is addressed to.

Known issuers in this system:
- "Impilo Industries" — a toll calenderer. Documents are headed "Impilo Industries" / "Impilo Industries Pty Ltd". Document numbers look like "IN177565" or "D08422". Header table columns: Document No | Order No. | Date | Delivery Details.
- "S&N Rubber" — a compounder/calenderer. Documents are headed "S&N RUBBER", often with a "CALENDERED PRODUCTS" subtitle, frequently on a yellow pre-printed form.
- "AU Industries" — the customer receiving goods. Only treat AU Industries as the issuer if this is clearly an OUTGOING AU Industries delivery note.

Respond ONLY with a JSON object: {"supplierName": string|null, "confidence": number} where supplierName is the issuing company's name exactly as printed (or null if you genuinely cannot tell) and confidence is 0.0-1.0.`;

    const response = await this.callGeminiWithImages(
      systemPrompt,
      "Identify the company that ISSUED this document from its letterhead. Return ONLY the JSON object.",
      images.slice(0, 2),
      "supplier-identification",
    );

    const name = response.data?.supplierName;
    if (typeof name === "string" && name.trim().length > 0) {
      this.logger.log(`Vision supplier identification: "${name.trim()}"`);
      return name.trim();
    }
    return null;
  }
}
