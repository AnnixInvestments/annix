import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { pdfToPng } from "pdf-to-png-converter";
import { AiUsageService } from "../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../ai-usage/entities/ai-usage-log.entity";
import { nowMillis } from "../lib/datetime";
import {
  ExtractedCustomerDeliveryNoteData,
  ExtractedCustomerDeliveryNotePodPage,
  ExtractedCustomerDeliveryNotesResult,
  ExtractedDeliveryNoteData,
} from "./entities/rubber-delivery-note.entity";
import { ExtractedCocData, SupplierCocType } from "./entities/rubber-supplier-coc.entity";
import { ExtractedTaxInvoiceData } from "./entities/rubber-tax-invoice.entity";
import {
  CALENDARER_COC_SYSTEM_PROMPT,
  CALENDER_ROLL_COC_SYSTEM_PROMPT,
  COMPOUNDER_COC_SYSTEM_PROMPT,
  CREDIT_NOTE_SYSTEM_PROMPT,
  CUSTOMER_DELIVERY_NOTE_OCR_PROMPT,
  calendererCocExtractionPrompt,
  calenderRollCocExtractionPrompt,
  compounderCocExtractionPrompt,
  creditNoteExtractionPrompt,
  DELIVERY_NOTE_SYSTEM_PROMPT,
  deliveryNoteExtractionPrompt,
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

@Injectable()
export class RubberCocExtractionService {
  private readonly logger = new Logger(RubberCocExtractionService.name);
  private readonly apiKey: string;
  private readonly model = "gemini-2.5-flash";
  private readonly baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  constructor(private readonly aiUsageService: AiUsageService) {
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

  private generateCalendererCocNumber(
    orderNumber: string | null,
    ticketNumber: string | null,
    rollNumbers: string[] | null,
  ): string | null {
    if (!orderNumber) return null;

    const allRolls = [
      ...(ticketNumber ? [ticketNumber] : []),
      ...(rollNumbers ?? []).filter((r) => r !== ticketNumber),
    ];

    if (allRolls.length === 0) return orderNumber;

    const rollRange = this.formatRollRange(allRolls);
    return `${orderNumber}-${rollRange}`;
  }

  private generateCompounderCocNumber(batchNumbers: string[] | null): string | null {
    if (!batchNumbers || batchNumbers.length === 0) return null;

    const batchRange = this.formatRollRange(batchNumbers);
    return `B${batchRange}`;
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

    return {
      data: extractedData,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
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

    const rawData = response.data as Record<string, unknown>;
    const pages = (rawData.pages || []) as Array<Record<string, unknown>>;
    const specs = (rawData.specifications || {}) as Record<string, unknown>;

    const allRolls = pages.flatMap((page) =>
      ((page.rolls || []) as Array<{ rollNumber: string; shoreA?: number | null }>).map(
        (roll) => roll,
      ),
    );

    const rollNumbers = allRolls.map((r) => r.rollNumber);
    const rollRange = this.formatRollRange(rollNumbers);
    const firstPage = pages[0] || {};
    const dnNumber = firstPage.deliveryNoteNumber as string | null;
    const cocNumber = dnNumber ? `DN${dnNumber}-R${rollRange}` : `R${rollRange}`;

    const extractedData: ExtractedCocData = {
      cocNumber,
      compoundCode: (rawData.compoundCode as string) || undefined,
      compoundDescription: (rawData.calenderRollDescription as string) || undefined,
      productionDate: (firstPage.productionDate as string) || undefined,
      orderNumber: (firstPage.purchaseOrderNumber as string) || undefined,
      rollNumbers,
      deliveryNoteNumber: dnNumber || null,
      waybillNumber: (firstPage.waybillNumber as string) || null,
      preparedBy: (rawData.preparedBy as string) || null,
      approvedByName: (rawData.approvedByName as string) || null,
      documentDate: (rawData.documentDate as string) || null,
      rolls: allRolls,
      sharedDensity: (firstPage.sharedDensity as number) || null,
      sharedTensile: (firstPage.sharedTensile as number) || null,
      sharedElongation: (firstPage.sharedElongation as number) || null,
      shoreANominal: (specs.shoreANominal as number) || null,
      shoreALimits: (specs.shoreALimits as string) || null,
      densityNominal: (specs.densityNominal as number) || null,
      densityLimits: (specs.densityLimits as string) || null,
      tensileNominal: (specs.tensileNominal as number) || null,
      tensileLimits: (specs.tensileLimits as string) || null,
      elongationNominal: (specs.elongationNominal as number) || null,
      elongationLimits: (specs.elongationLimits as string) || null,
      approverNames: [rawData.preparedBy as string, rawData.approvedByName as string].filter(
        Boolean,
      ),
    };

    if (pages.length > 1) {
      const additionalRollData = pages.slice(1).map((page) => ({
        deliveryNoteNumber: (page.deliveryNoteNumber as string) || null,
        waybillNumber: (page.waybillNumber as string) || null,
        productionDate: (page.productionDate as string) || null,
        sharedDensity: (page.sharedDensity as number) || null,
        sharedTensile: (page.sharedTensile as number) || null,
        sharedElongation: (page.sharedElongation as number) || null,
        rolls: (page.rolls || []) as Array<{ rollNumber: string; shoreA?: number | null }>,
      }));

      this.logger.log(
        `Multi-page calender roll CoC: ${pages.length} pages, ${allRolls.length} total rolls`,
      );

      (extractedData as Record<string, unknown>).additionalPages = additionalRollData;
    }

    this.logger.log(`Generated Calender Roll CoC number: ${cocNumber}`);

    return {
      data: extractedData,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  async extractDeliveryNote(pdfText: string): Promise<{
    data: ExtractedDeliveryNoteData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Extracting delivery note data...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const response = await this.callGemini(
      DELIVERY_NOTE_SYSTEM_PROMPT,
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

  async extractCustomerDeliveryNoteFromImages(pdfBuffer: Buffer): Promise<{
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

    const response = await this.callGeminiWithImages(
      CUSTOMER_DELIVERY_NOTE_OCR_PROMPT,
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

    const systemPrompt = correctionHints
      ? `${TAX_INVOICE_SYSTEM_PROMPT}\n\n${correctionHints}`
      : TAX_INVOICE_SYSTEM_PROMPT;

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
  ): Promise<{
    data: ExtractedTaxInvoiceData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Extracting tax invoice data using OCR...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const systemPrompt = correctionHints
      ? `${TAX_INVOICE_SYSTEM_PROMPT}\n\n${correctionHints}`
      : TAX_INVOICE_SYSTEM_PROMPT;

    const images = await this.convertPdfToImages(pdfBuffer);
    this.logger.log(`Converted tax invoice PDF to ${images.length} image(s) for OCR extraction`);

    const response = await this.callGeminiWithImages(
      systemPrompt,
      "Please extract structured data from this tax invoice image. Return ONLY a valid JSON object with the extracted data.",
      images,
      "tax-invoice-ocr-extraction",
    );

    const processingTimeMs = nowMillis() - startTime;
    this.logger.log(`Tax invoice extracted via OCR in ${processingTimeMs}ms`);

    return {
      data: response.data as unknown as ExtractedTaxInvoiceData,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
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

  async extractByType(
    cocType: SupplierCocType,
    pdfText: string,
    correctionHints?: string | null,
  ): Promise<{
    data: ExtractedCocData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    if (cocType === SupplierCocType.COMPOUNDER) {
      return this.extractCompounderCoc(pdfText, correctionHints);
    } else if (cocType === SupplierCocType.CALENDER_ROLL) {
      return this.extractCalenderRollCoc(pdfText, correctionHints);
    } else {
      return this.extractCalendererCoc(pdfText, correctionHints);
    }
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

  async convertPdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
    this.logger.log("Converting PDF to images for OCR...");
    const pdfInput = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength,
    );
    const pages = await pdfToPng(pdfInput, {
      disableFontFace: true,
      useSystemFonts: true,
      viewportScale: 1.0,
    });
    this.logger.log(`Converted PDF to ${pages.length} image(s)`);
    return pages.filter((page) => page.content !== undefined).map((page) => page.content as Buffer);
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

  async extractDeliveryNoteFromImages(pdfBuffer: Buffer): Promise<{
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

    const response = await this.callGeminiWithImages(
      DELIVERY_NOTE_SYSTEM_PROMPT,
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
}
