import { Injectable, Logger } from "@nestjs/common";
import { pdfToPng } from "pdf-to-png-converter";
import { AiUsageService } from "../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../ai-usage/entities/ai-usage-log.entity";
import { nowMillis } from "../lib/datetime";
import {
  ExtractedCustomerDeliveryNoteData,
  ExtractedCustomerDeliveryNotesResult,
  ExtractedDeliveryNoteData,
} from "./entities/rubber-delivery-note.entity";
import { ExtractedCocData, SupplierCocType } from "./entities/rubber-supplier-coc.entity";
import { ExtractedTaxInvoiceData } from "./entities/rubber-tax-invoice.entity";
import {
  CALENDARER_COC_SYSTEM_PROMPT,
  COMPOUNDER_COC_SYSTEM_PROMPT,
  CUSTOMER_DELIVERY_NOTE_OCR_PROMPT,
  CUSTOMER_DELIVERY_NOTE_SYSTEM_PROMPT,
  calendererCocExtractionPrompt,
  compounderCocExtractionPrompt,
  customerDeliveryNoteExtractionPrompt,
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
  private readonly model = "gemini-2.0-flash";
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

    const ranges: string[] = [];
    let rangeStart = numbers[0];
    let rangeEnd = numbers[0];

    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] === rangeEnd + 1) {
        rangeEnd = numbers[i];
      } else {
        ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
        rangeStart = numbers[i];
        rangeEnd = numbers[i];
      }
    }

    ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
    return ranges.join(", ");
  }

  private generateCalendererCocNumber(
    orderNumber: string | null,
    ticketNumber: string | null,
    rollNumbers: string[] | null,
  ): string | null {
    if (!orderNumber) return null;

    const allRolls: string[] = [];

    if (ticketNumber) {
      allRolls.push(ticketNumber);
    }

    if (rollNumbers && rollNumbers.length > 0) {
      rollNumbers.forEach((r) => {
        if (!allRolls.includes(r)) {
          allRolls.push(r);
        }
      });
    }

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

  async extractCompounderCoc(pdfText: string): Promise<{
    data: ExtractedCocData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Extracting compounder CoC data...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const response = await this.callGemini(
      COMPOUNDER_COC_SYSTEM_PROMPT,
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

  async extractCalendererCoc(pdfText: string): Promise<{
    data: ExtractedCocData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Extracting calenderer CoC data...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const response = await this.callGemini(
      CALENDARER_COC_SYSTEM_PROMPT,
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

  async extractCustomerDeliveryNote(pdfText: string): Promise<{
    data: ExtractedCustomerDeliveryNoteData;
    deliveryNotes: ExtractedCustomerDeliveryNoteData[];
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log("Extracting customer delivery note data...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const response = await this.callGemini(
      CUSTOMER_DELIVERY_NOTE_SYSTEM_PROMPT,
      customerDeliveryNoteExtractionPrompt(pdfText),
      "customer-dn-extraction",
    );

    const processingTimeMs = nowMillis() - startTime;
    this.logger.log(`Customer delivery note extracted in ${processingTimeMs}ms`);

    const rawData = response.data as unknown as ExtractedCustomerDeliveryNotesResult;
    const deliveryNotes = rawData?.deliveryNotes || [];

    this.logger.log(`Found ${deliveryNotes.length} delivery notes in document`);

    const firstNote = deliveryNotes[0] || {};

    return {
      data: firstNote as ExtractedCustomerDeliveryNoteData,
      deliveryNotes,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  async extractCustomerDeliveryNoteFromImages(pdfBuffer: Buffer): Promise<{
    data: ExtractedCustomerDeliveryNoteData;
    deliveryNotes: ExtractedCustomerDeliveryNoteData[];
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
    const deliveryNotes = rawData?.deliveryNotes || [];

    this.logger.log(`Found ${deliveryNotes.length} delivery notes in document via OCR`);
    deliveryNotes.forEach((dn, idx) => {
      this.logger.log(
        `DN ${idx + 1}: number=${dn.deliveryNoteNumber}, ref=${dn.customerReference}, date=${dn.deliveryDate}`,
      );
    });

    const firstNote = deliveryNotes[0] || {};

    return {
      data: firstNote as ExtractedCustomerDeliveryNoteData,
      deliveryNotes,
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

  async extractByType(
    cocType: SupplierCocType,
    pdfText: string,
  ): Promise<{
    data: ExtractedCocData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    return cocType === SupplierCocType.COMPOUNDER
      ? this.extractCompounderCoc(pdfText)
      : this.extractCalendererCoc(pdfText);
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

    data.batches = data.batches.map((batch) => {
      const corrected = { ...batch };

      const reboundIsNull =
        corrected.reboundPercent === null || corrected.reboundPercent === undefined;
      const tearInReboundRange =
        corrected.tearStrengthKnM !== null &&
        corrected.tearStrengthKnM !== undefined &&
        corrected.tearStrengthKnM >= 50;

      if (reboundIsNull && tearInReboundRange) {
        this.logger.warn(
          `Batch ${batch.batchNumber}: Column shift detected - tear=${corrected.tearStrengthKnM} is in rebound range (74-96). Correcting: rebound=${corrected.tearStrengthKnM}, tear=${corrected.tensileStrengthMpa}, tensile=null (lost)`,
        );
        corrected.reboundPercent = corrected.tearStrengthKnM;
        corrected.tearStrengthKnM = corrected.tensileStrengthMpa;
        corrected.tensileStrengthMpa = undefined;
      }

      if (
        corrected.elongationPercent !== null &&
        corrected.elongationPercent !== undefined &&
        corrected.elongationPercent < 100 &&
        corrected.rheometerSMin !== null &&
        corrected.rheometerSMin !== undefined &&
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

      if (
        corrected.elongationPercent !== null &&
        corrected.elongationPercent !== undefined &&
        corrected.elongationPercent < 100
      ) {
        this.logger.warn(
          `Batch ${batch.batchNumber}: Suspicious elongation value ${corrected.elongationPercent} (expected 600-980), setting to undefined`,
        );
        corrected.elongationPercent = undefined;
      }

      if (
        corrected.rheometerSMin !== null &&
        corrected.rheometerSMin !== undefined &&
        corrected.rheometerSMin > 10
      ) {
        this.logger.warn(
          `Batch ${batch.batchNumber}: Suspicious S'min value ${corrected.rheometerSMin} (expected 0.5-2.0), setting to undefined`,
        );
        corrected.rheometerSMin = undefined;
      }

      return corrected;
    });
  }

  private parseJsonResponse(content: string): Record<string, unknown> {
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

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

  async convertSinglePdfPage(pdfBuffer: Buffer, pageNumber: number): Promise<Buffer> {
    this.logger.log(`Converting PDF page ${pageNumber} to image...`);
    const pdfInput = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength,
    );
    const pages = await pdfToPng(pdfInput, {
      disableFontFace: true,
      useSystemFonts: true,
      viewportScale: 1.0,
      pagesToProcess: [pageNumber],
    });

    if (pages.length === 0 || !pages[0].content) {
      throw new Error(`Failed to convert page ${pageNumber}`);
    }

    this.logger.log(`Page ${pageNumber} converted, size: ${pages[0].width}x${pages[0].height}`);
    return pages[0].content;
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);

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
                parts: [{ text: systemPrompt }, { text: userPrompt }, ...imageParts],
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
        this.logger.error(`Gemini Vision API error: ${response.status} - ${errorText}`);
        throw new Error(`Gemini Vision API error: ${response.status}`);
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

      return {
        data: parsed,
        tokensUsed,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        this.logger.error("Gemini Vision API request timed out after 180 seconds");
        throw new Error("Gemini Vision API request timed out");
      }
      throw error;
    }
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

  async analyzeDeliveryNotePhoto(imageBuffers: Buffer[]): Promise<{
    data: ExtractedUniversalDeliveryNote;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = nowMillis();
    this.logger.log(`Analyzing ${imageBuffers.length} delivery note photo(s)...`);

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const response = await this.callGeminiWithImages(
      UNIVERSAL_DELIVERY_NOTE_SYSTEM_PROMPT,
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

  async analyzeDeliveryNotePdf(pdfBuffer: Buffer): Promise<{
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

    const response = await this.callGeminiWithImages(
      UNIVERSAL_DELIVERY_NOTE_SYSTEM_PROMPT,
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
