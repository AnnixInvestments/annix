import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { AiUsageService } from "../../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../../ai-usage/entities/ai-usage-log.entity";
import { fromJSDate, now } from "../../lib/datetime";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { DeliveryNote } from "../entities/delivery-note.entity";
import {
  ClarificationStatus,
  ClarificationType,
  InvoiceClarification,
  SuggestedMatch,
} from "../entities/invoice-clarification.entity";
import { InvoiceExtractionCorrection } from "../entities/invoice-extraction-correction.entity";
import { StockItem } from "../entities/stock-item.entity";
import { PriceChangeReason, StockPriceHistory } from "../entities/stock-price-history.entity";
import {
  ExtractedInvoiceData,
  ExtractedLineItem,
  InvoiceExtractionStatus,
  SupplierInvoice,
} from "../entities/supplier-invoice.entity";
import {
  InvoiceItemMatchStatus,
  SupplierInvoiceItem,
} from "../entities/supplier-invoice-item.entity";
import { validateInvoiceExtraction, validPositiveNumber } from "./extraction-validation";

const INVOICE_EXTRACTION_PROMPT = `You are an industrial supplier invoice parser. Extract line items from scanned invoices.

Return JSON only:
{
  "invoiceNumber": "INV-12345",
  "supplierName": "ABC Supplies",
  "invoiceDate": "2024-01-15",
  "totalAmount": 15000.00,
  "vatAmount": 2250.00,
  "deliveryNoteNumbers": ["DN-12345", "DN-12346"],
  "lineItems": [
    {
      "lineNumber": 1,
      "description": "PENGUARD EXPRESS MIO BUFF 20L",
      "sku": "PEM-001",
      "quantity": 5,
      "unitPrice": 2500.00,
      "unitType": "each",
      "discountPercent": 0,
      "isPaintPartA": false,
      "isPaintPartB": false
    }
  ]
}

DISCOUNT HANDLING (critical):
- Look for discount columns: "Disc %", "Disc. %", "Discount", "Less", or similar.
- If a line item has a discount, set discountPercent to the percentage value (e.g. 20 for 20%).
- unitPrice MUST be the EFFECTIVE price AFTER discount, not the list price before discount.
- To calculate: if list price is 2775.00 with 20% discount, unitPrice = 2775.00 * (1 - 20/100) = 2220.00.
- Alternatively, if the invoice shows a "Total (Excl)" or line total column, divide that by the quantity supplied to derive the effective unitPrice.
- If no discount is present, set discountPercent to 0 and use the listed unit price as-is.

DELIVERY NOTE NUMBERS (critical):
- An invoice may reference MULTIPLE delivery notes. Look for ALL delivery note references.
- Search for "Delivery Note", "DN", "D/N", "Delivery No", "GRN", "Goods Received Note", "Order Number", "Your Order", "Call Off Order", or similar reference fields.
- Check header fields, reference sections, AND the line item area — each line may reference a different DN.
- Return ALL found numbers as an array in deliveryNoteNumbers, even if there is only one.
- If no delivery note numbers are found, return an empty array.

UNIT TYPE: Identify the unit of measure for each line item. Common values: "each", "ltr", "kg", "roll", "m", "m2", "pack", "set", "pair", "box", "drum", "pail", "can", "tin", "bag", "sheet", "length", "bundle". Look for UOM columns like "Unit", "UoM", "U/M", "Measure" on the invoice or infer from the product description (e.g. "25Lt" = "ltr", "20L" = "ltr", "5kg" = "kg"). If unclear, default to "each".

For paint products, detect "Part A" or "Part B" in description. Common patterns:
- "Part A", "Comp A", "Component A" -> isPaintPartA: true
- "Part B", "Comp B", "Component B", "Hardener", "Activator" -> isPaintPartB: true

Parse all monetary values as numbers without currency symbols.
Return valid JSON only, no additional text.`;

const DELIVERY_NOTE_EXTRACTION_PROMPT = `You are an industrial delivery note parser. Extract delivery information from scanned delivery notes.

Return JSON only:
{
  "deliveryNumber": "DN-12345",
  "supplierName": "ABC Supplies",
  "receivedDate": "2024-01-15",
  "lineItems": [
    {
      "description": "PENGUARD EXPRESS MIO BUFF 20L",
      "quantity": 5,
      "sku": "PEM-001"
    }
  ]
}

Return valid JSON only, no additional text.`;

const MIN_MATCH_CONFIDENCE = 50;
const HIGH_CONFIDENCE_THRESHOLD = 80;
const PRICE_CHANGE_APPROVAL_THRESHOLD = 20;

@Injectable()
export class InvoiceExtractionService {
  private readonly logger = new Logger(InvoiceExtractionService.name);

  constructor(
    @InjectRepository(SupplierInvoice)
    private readonly invoiceRepo: Repository<SupplierInvoice>,
    @InjectRepository(SupplierInvoiceItem)
    private readonly invoiceItemRepo: Repository<SupplierInvoiceItem>,
    @InjectRepository(InvoiceClarification)
    private readonly clarificationRepo: Repository<InvoiceClarification>,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(StockPriceHistory)
    private readonly priceHistoryRepo: Repository<StockPriceHistory>,
    @InjectRepository(DeliveryNote)
    private readonly deliveryNoteRepo: Repository<DeliveryNote>,
    @InjectRepository(InvoiceExtractionCorrection)
    private readonly correctionRepo: Repository<InvoiceExtractionCorrection>,
    private readonly aiUsageService: AiUsageService,
    private readonly aiChatService: AiChatService,
  ) {}

  async extractFromImage(
    invoiceId: number,
    imageBase64: string,
    mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf",
  ): Promise<SupplierInvoice> {
    const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId } });
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    const previousExtractedData = invoice.extractedData;

    await this.clarificationRepo.delete({ invoiceId });
    await this.invoiceItemRepo.delete({ invoiceId });

    invoice.extractionStatus = InvoiceExtractionStatus.PROCESSING;
    await this.invoiceRepo.save(invoice);

    try {
      const correctionHints = await this.correctionHintsForSupplier(
        invoice.companyId,
        invoice.supplierName,
      );
      const systemPrompt = correctionHints
        ? `${INVOICE_EXTRACTION_PROMPT}\n\n${correctionHints}`
        : INVOICE_EXTRACTION_PROMPT;

      const {
        content: response,
        providerUsed,
        tokensUsed,
      } = await this.aiChatService.chatWithImage(
        imageBase64,
        mediaType,
        "Extract the invoice details from this scanned invoice image. Return JSON only.",
        systemPrompt,
      );

      this.aiUsageService.log({
        app: AiApp.STOCK_CONTROL,
        actionType: "invoice-extraction",
        provider: providerUsed.includes("claude") ? AiProvider.CLAUDE : AiProvider.GEMINI,
        tokensUsed,
        pageCount: 1,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("AI response did not contain valid JSON");
      }

      const extractedData: ExtractedInvoiceData = validateInvoiceExtraction(
        JSON.parse(jsonMatch[0]),
      );
      invoice.extractedData = extractedData;

      if (extractedData.invoiceNumber) {
        invoice.invoiceNumber = extractedData.invoiceNumber;
      }
      if (extractedData.supplierName) {
        invoice.supplierName = extractedData.supplierName;
      }
      if (extractedData.invoiceDate) {
        invoice.invoiceDate = new Date(extractedData.invoiceDate);
      }
      if (extractedData.totalAmount !== undefined) {
        invoice.totalAmount = extractedData.totalAmount;
      }
      if (extractedData.vatAmount !== undefined) {
        invoice.vatAmount = extractedData.vatAmount;
      }

      await this.invoiceRepo.save(invoice);

      if (!invoice.deliveryNoteId) {
        await this.autoLinkToDeliveryNote(invoice, extractedData);
      }

      if (extractedData.lineItems && extractedData.lineItems.length > 0) {
        await this.createInvoiceItems(invoice, extractedData.lineItems);
        await this.matchItemsToStock(invoiceId);
        await this.linkPartABItems(invoiceId);
        await this.createClarifications(invoiceId);
      }

      const pendingClarifications = await this.clarificationRepo.count({
        where: { invoiceId, status: ClarificationStatus.PENDING },
      });

      invoice.extractionStatus =
        pendingClarifications > 0
          ? InvoiceExtractionStatus.NEEDS_CLARIFICATION
          : InvoiceExtractionStatus.AWAITING_APPROVAL;

      return this.invoiceRepo.save(invoice);
    } catch (error) {
      this.logger.error(`Invoice extraction failed for ${invoiceId}: ${error.message}`);
      invoice.extractionStatus = InvoiceExtractionStatus.FAILED;
      invoice.extractedData = {
        ...previousExtractedData,
        rawText: error.message,
      };
      return this.invoiceRepo.save(invoice);
    }
  }

  async extractDeliveryNoteFromImage(
    imageBase64: string,
    mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf",
  ): Promise<{
    deliveryNumber?: string;
    supplierName?: string;
    receivedDate?: string;
    lineItems?: { description: string; quantity: number; sku?: string }[];
  }> {
    const {
      content: response,
      providerUsed,
      tokensUsed,
    } = await this.aiChatService.chatWithImage(
      imageBase64,
      mediaType,
      "Extract the delivery note details from this scanned delivery note image. Return JSON only.",
      DELIVERY_NOTE_EXTRACTION_PROMPT,
    );

    this.aiUsageService.log({
      app: AiApp.STOCK_CONTROL,
      actionType: "delivery-note-extraction",
      provider: providerUsed.includes("claude") ? AiProvider.CLAUDE : AiProvider.GEMINI,
      tokensUsed,
      pageCount: 1,
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI response did not contain valid JSON");
    }

    return JSON.parse(jsonMatch[0]);
  }

  private async autoLinkToDeliveryNote(
    invoice: SupplierInvoice,
    extractedData: ExtractedInvoiceData,
  ): Promise<void> {
    const candidates = await this.deliveryNoteRepo.find({
      where: { companyId: invoice.companyId },
    });

    if (candidates.length === 0) return;

    const dnNumbers = this.normalizeDeliveryNoteNumbers(extractedData);
    const matches = this.findDeliveryNoteMatches(invoice, dnNumbers, candidates);

    if (matches.length > 0) {
      invoice.deliveryNoteId = matches[0].id;
      invoice.linkedDeliveryNoteIds = matches.map((m) => m.id);
      await this.invoiceRepo.save(invoice);
      const dnLabels = matches.map((m) => `${m.id} (${m.deliveryNumber})`).join(", ");
      this.logger.log(
        `Auto-linked invoice ${invoice.id} (${invoice.invoiceNumber}) to DNs: ${dnLabels}`,
      );
    }
  }

  private normalizeDeliveryNoteNumbers(extractedData: ExtractedInvoiceData): string[] {
    if (extractedData.deliveryNoteNumbers && extractedData.deliveryNoteNumbers.length > 0) {
      return extractedData.deliveryNoteNumbers;
    }
    if (extractedData.deliveryNoteNumber) {
      return [extractedData.deliveryNoteNumber];
    }
    return [];
  }

  private findDeliveryNoteMatches(
    invoice: SupplierInvoice,
    dnNumbers: string[],
    candidates: DeliveryNote[],
  ): DeliveryNote[] {
    const matched: DeliveryNote[] = [];
    const matchedIds = new Set<number>();

    dnNumbers.forEach((rawDnNumber) => {
      const dnNumber = rawDnNumber.trim().toLowerCase();
      const exactMatch = candidates.find(
        (dn) => !matchedIds.has(dn.id) && dn.deliveryNumber.trim().toLowerCase() === dnNumber,
      );
      if (exactMatch) {
        matched.push(exactMatch);
        matchedIds.add(exactMatch.id);
      } else {
        const partialMatch = candidates.find(
          (dn) =>
            !matchedIds.has(dn.id) &&
            (dn.deliveryNumber.trim().toLowerCase().includes(dnNumber) ||
              dnNumber.includes(dn.deliveryNumber.trim().toLowerCase())),
        );
        if (partialMatch) {
          matched.push(partialMatch);
          matchedIds.add(partialMatch.id);
        }
      }
    });

    if (matched.length > 0) return matched;

    const supplierMatches = candidates.filter(
      (dn) => dn.supplierName.toLowerCase() === invoice.supplierName.toLowerCase(),
    );

    if (supplierMatches.length === 1) {
      return [supplierMatches[0]];
    }

    if (supplierMatches.length > 1 && invoice.invoiceDate) {
      const invoiceDate = fromJSDate(invoice.invoiceDate);
      const closestMatch = supplierMatches
        .filter((dn) => dn.receivedDate !== null)
        .map((dn) => ({
          dn,
          daysDiff: Math.abs(invoiceDate.diff(fromJSDate(dn.receivedDate as Date), "days").days),
        }))
        .filter((entry) => entry.daysDiff <= 14)
        .sort((a, b) => a.daysDiff - b.daysDiff)[0];

      if (closestMatch) return [closestMatch.dn];
    }

    return [];
  }

  async autoLinkAllUnlinked(companyId: number): Promise<{ linked: number; details: string[] }> {
    const unlinked = await this.invoiceRepo.find({
      where: { companyId, deliveryNoteId: IsNull() },
    });

    if (unlinked.length === 0) {
      return { linked: 0, details: [] };
    }

    const candidates = await this.deliveryNoteRepo.find({ where: { companyId } });

    const { linked, details } = await unlinked.reduce(
      async (accPromise, invoice) => {
        const acc = await accPromise;
        const dnNumbers = this.normalizeDeliveryNoteNumbers(invoice.extractedData || {});
        const matches = this.findDeliveryNoteMatches(invoice, dnNumbers, candidates);
        if (matches.length > 0) {
          invoice.deliveryNoteId = matches[0].id;
          invoice.linkedDeliveryNoteIds = matches.map((m) => m.id);
          await this.invoiceRepo.save(invoice);
          const dnLabels = matches.map((m) => m.deliveryNumber).join(", ");
          return {
            linked: acc.linked + 1,
            details: [...acc.details, `Invoice ${invoice.invoiceNumber} → DN ${dnLabels}`],
          };
        }
        return acc;
      },
      Promise.resolve({ linked: 0, details: [] as string[] }),
    );

    this.logger.log(
      `Bulk auto-link complete for company ${companyId}: ${linked}/${unlinked.length} invoices linked`,
    );
    return { linked, details };
  }

  private async createInvoiceItems(
    invoice: SupplierInvoice,
    lineItems: ExtractedLineItem[],
  ): Promise<void> {
    const itemEntities = lineItems.map((item) =>
      this.invoiceItemRepo.create({
        invoiceId: invoice.id,
        companyId: invoice.companyId,
        lineNumber: item.lineNumber,
        extractedDescription: item.description,
        extractedSku: item.sku || null,
        quantity: validPositiveNumber(item.quantity, 1),
        unitPrice: validPositiveNumber(item.unitPrice, 0),
        unitType: item.unitType || null,
        discountPercent: validPositiveNumber(item.discountPercent, 0),
        isPartA: item.isPaintPartA || false,
        isPartB: item.isPaintPartB || false,
        matchStatus: InvoiceItemMatchStatus.UNMATCHED,
      }),
    );

    await this.invoiceItemRepo.save(itemEntities);
  }

  async matchItemsToStock(invoiceId: number): Promise<void> {
    const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId } });
    if (!invoice) return;

    const items = await this.invoiceItemRepo.find({ where: { invoiceId } });
    const stockItems = await this.stockItemRepo.find({ where: { companyId: invoice.companyId } });

    await items.reduce(async (prev, item) => {
      await prev;
      const match = this.fuzzyMatchStockItem(
        item.extractedDescription || "",
        item.extractedSku || "",
        stockItems,
      );

      if (match) {
        item.stockItemId = match.stockItem.id;
        item.matchConfidence = match.confidence;
        item.matchStatus =
          match.confidence >= HIGH_CONFIDENCE_THRESHOLD
            ? InvoiceItemMatchStatus.MATCHED
            : InvoiceItemMatchStatus.CLARIFICATION_NEEDED;
        item.previousPrice = Number(match.stockItem.costPerUnit) || null;
      } else {
        item.matchStatus = InvoiceItemMatchStatus.UNMATCHED;
      }

      await this.invoiceItemRepo.save(item);
    }, Promise.resolve());
  }

  private fuzzyMatchStockItem(
    description: string,
    sku: string,
    stockItems: StockItem[],
  ): { stockItem: StockItem; confidence: number } | null {
    const normalizedDesc = description.toLowerCase().replace(/\s+/g, " ").trim();
    const normalizedSku = sku.toLowerCase().trim();

    const scored = stockItems.map((stockItem) => {
      const score = (() => {
        if (normalizedSku && stockItem.sku.toLowerCase() === normalizedSku) {
          return 100;
        }

        const stockName = stockItem.name.toLowerCase().replace(/\s+/g, " ").trim();
        const stockSku = stockItem.sku.toLowerCase();
        const skuBonus = normalizedSku && stockSku.includes(normalizedSku) ? 40 : 0;
        const descWords = normalizedDesc.split(" ").filter((w) => w.length > 2);
        const matchingWords = descWords.filter((word) => stockName.includes(word));
        const wordScore = descWords.length > 0 ? (matchingWords.length / descWords.length) * 60 : 0;
        const accumulated = skuBonus + wordScore;

        if (stockName.includes(normalizedDesc) || normalizedDesc.includes(stockName)) {
          return Math.max(accumulated, 85);
        }
        return accumulated;
      })();

      return { stockItem, confidence: Math.min(score, 100) };
    });

    const best = scored
      .filter((s) => s.confidence >= MIN_MATCH_CONFIDENCE)
      .sort((a, b) => b.confidence - a.confidence)[0];

    return best || null;
  }

  async linkPartABItems(invoiceId: number): Promise<void> {
    const items = await this.invoiceItemRepo.find({ where: { invoiceId } });

    const partAItems = items.filter((item) => item.isPartA);
    const partBItems = items.filter((item) => item.isPartB);

    await partAItems.reduce(async (prev, partA) => {
      await prev;
      const baseProduct = this.extractBaseProductName(partA.extractedDescription || "");

      const matchingPartB = partBItems.find((partB) => {
        const partBBase = this.extractBaseProductName(partB.extractedDescription || "");
        return this.similarProductNames(baseProduct, partBBase);
      });

      if (matchingPartB && !matchingPartB.linkedItemId) {
        matchingPartB.linkedItemId = partA.id;
        await this.invoiceItemRepo.save(matchingPartB);
      }
    }, Promise.resolve());
  }

  private extractBaseProductName(description: string): string {
    return description
      .toLowerCase()
      .replace(/part\s*[ab]/gi, "")
      .replace(/comp(onent)?\s*[ab]/gi, "")
      .replace(/hardener/gi, "")
      .replace(/activator/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private similarProductNames(name1: string, name2: string): boolean {
    const words1 = name1.split(" ").filter((w) => w.length > 2);
    const words2 = name2.split(" ").filter((w) => w.length > 2);

    const commonWords = words1.filter((w) => words2.includes(w));
    const similarity = commonWords.length / Math.max(words1.length, words2.length);

    return similarity >= 0.6;
  }

  async createClarifications(invoiceId: number): Promise<void> {
    const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId } });
    if (!invoice) return;

    const items = await this.invoiceItemRepo.find({
      where: { invoiceId },
      relations: ["stockItem"],
    });

    const stockItems = await this.stockItemRepo.find({ where: { companyId: invoice.companyId } });

    await items.reduce(async (prev, item) => {
      await prev;
      if (item.matchStatus === InvoiceItemMatchStatus.UNMATCHED) {
        await this.createUnmatchedClarification(invoice, item, stockItems);
      } else if (item.matchStatus === InvoiceItemMatchStatus.CLARIFICATION_NEEDED) {
        await this.createLowConfidenceClarification(invoice, item, stockItems);
      } else if (item.stockItem && item.unitPrice !== null) {
        await this.checkPriceChangeApproval(invoice, item);
      }
    }, Promise.resolve());
  }

  private async createUnmatchedClarification(
    invoice: SupplierInvoice,
    item: SupplierInvoiceItem,
    stockItems: StockItem[],
  ): Promise<void> {
    const suggestedMatches = this.topMatches(
      item.extractedDescription || "",
      item.extractedSku || "",
      stockItems,
      3,
    );

    const clarification = new InvoiceClarification();
    clarification.invoiceId = invoice.id;
    clarification.invoiceItemId = item.id;
    clarification.companyId = invoice.companyId;
    clarification.clarificationType = ClarificationType.ITEM_MATCH;
    clarification.status = ClarificationStatus.PENDING;
    clarification.question = `Could not find a matching stock item for "${item.extractedDescription}". Please select the correct item or create a new one.`;
    clarification.context = {
      suggestedMatches,
      extractedDescription: item.extractedDescription || undefined,
      extractedSku: item.extractedSku || undefined,
      isPartA: item.isPartA,
      isPartB: item.isPartB,
    };

    await this.clarificationRepo.save(clarification);
  }

  private async createLowConfidenceClarification(
    invoice: SupplierInvoice,
    item: SupplierInvoiceItem,
    stockItems: StockItem[],
  ): Promise<void> {
    const suggestedMatches = this.topMatches(
      item.extractedDescription || "",
      item.extractedSku || "",
      stockItems,
      3,
    );

    const clarification = new InvoiceClarification();
    clarification.invoiceId = invoice.id;
    clarification.invoiceItemId = item.id;
    clarification.companyId = invoice.companyId;
    clarification.clarificationType = ClarificationType.ITEM_MATCH;
    clarification.status = ClarificationStatus.PENDING;
    clarification.question = `Please confirm the match for "${item.extractedDescription}" (${Math.round(item.matchConfidence || 0)}% confidence).`;
    clarification.context = {
      suggestedMatches,
      extractedDescription: item.extractedDescription || undefined,
      extractedSku: item.extractedSku || undefined,
      isPartA: item.isPartA,
      isPartB: item.isPartB,
    };

    await this.clarificationRepo.save(clarification);
  }

  private async checkPriceChangeApproval(
    invoice: SupplierInvoice,
    item: SupplierInvoiceItem,
  ): Promise<void> {
    if (!item.stockItem || item.unitPrice === null) return;

    const oldPrice = Number(item.stockItem.costPerUnit) || 0;
    const newPrice = Number(item.unitPrice);

    if (oldPrice === 0) return;

    const changePercent = Math.abs(((newPrice - oldPrice) / oldPrice) * 100);

    if (changePercent > PRICE_CHANGE_APPROVAL_THRESHOLD) {
      const clarification = new InvoiceClarification();
      clarification.invoiceId = invoice.id;
      clarification.invoiceItemId = item.id;
      clarification.companyId = invoice.companyId;
      clarification.clarificationType = ClarificationType.PRICE_CONFIRMATION;
      clarification.status = ClarificationStatus.PENDING;
      clarification.question = `Price change for "${item.stockItem.name}" is ${changePercent.toFixed(1)}% (R${oldPrice.toFixed(2)} → R${newPrice.toFixed(2)}). Please confirm this update.`;
      clarification.context = {
        oldPrice,
        newPrice,
        priceChangePercent: changePercent,
      };

      await this.clarificationRepo.save(clarification);
    }
  }

  private topMatches(
    description: string,
    sku: string,
    stockItems: StockItem[],
    limit: number,
  ): SuggestedMatch[] {
    const normalizedDesc = description.toLowerCase().replace(/\s+/g, " ").trim();
    const normalizedSku = sku.toLowerCase().trim();

    const scored = stockItems.map((stockItem) => {
      const score = (() => {
        if (normalizedSku && stockItem.sku.toLowerCase() === normalizedSku) {
          return 100;
        }

        const stockName = stockItem.name.toLowerCase().replace(/\s+/g, " ").trim();
        const stockSkuLower = stockItem.sku.toLowerCase();
        const skuBonus = normalizedSku && stockSkuLower.includes(normalizedSku) ? 30 : 0;
        const descWords = normalizedDesc.split(" ").filter((w) => w.length > 2);
        const matchingWords = descWords.filter((word) => stockName.includes(word));
        const wordScore = descWords.length > 0 ? (matchingWords.length / descWords.length) * 70 : 0;
        return skuBonus + wordScore;
      })();

      return {
        stockItemId: stockItem.id,
        stockItemName: stockItem.name,
        stockItemSku: stockItem.sku,
        confidence: Math.min(score, 100),
        currentPrice: Number(stockItem.costPerUnit) || 0,
      };
    });

    return scored
      .filter((s) => s.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  async processClarificationResponse(
    clarificationId: number,
    response: {
      selectedStockItemId?: number;
      createNewItem?: {
        sku: string;
        name: string;
        description?: string;
        category?: string;
        unitOfMeasure?: string;
      };
      skipPriceUpdate?: boolean;
      confirmed?: boolean;
    },
    userId: number,
  ): Promise<InvoiceClarification> {
    const clarification = await this.clarificationRepo.findOne({
      where: { id: clarificationId },
      relations: ["invoiceItem", "invoice"],
    });

    if (!clarification) {
      throw new Error(`Clarification ${clarificationId} not found`);
    }

    if (response.selectedStockItemId) {
      clarification.selectedStockItemId = response.selectedStockItemId;
      clarification.status = ClarificationStatus.ANSWERED;

      if (clarification.invoiceItem) {
        clarification.invoiceItem.stockItemId = response.selectedStockItemId;
        clarification.invoiceItem.matchStatus = InvoiceItemMatchStatus.MANUALLY_MATCHED;

        const stockItem = await this.stockItemRepo.findOne({
          where: { id: response.selectedStockItemId },
        });
        if (stockItem) {
          clarification.invoiceItem.previousPrice = Number(stockItem.costPerUnit) || null;
        }

        await this.invoiceItemRepo.save(clarification.invoiceItem);
      }
    } else if (response.createNewItem) {
      const newStockItem = this.stockItemRepo.create({
        ...response.createNewItem,
        companyId: clarification.companyId,
        quantity: 0,
        costPerUnit: clarification.invoiceItem?.unitPrice || 0,
      });

      const savedItem = await this.stockItemRepo.save(newStockItem);

      clarification.selectedStockItemId = savedItem.id;
      clarification.status = ClarificationStatus.ANSWERED;
      clarification.responseData = { createdStockItemId: savedItem.id };

      if (clarification.invoiceItem) {
        clarification.invoiceItem.stockItemId = savedItem.id;
        clarification.invoiceItem.matchStatus = InvoiceItemMatchStatus.NEW_ITEM_CREATED;
        await this.invoiceItemRepo.save(clarification.invoiceItem);
      }
    } else if (response.skipPriceUpdate) {
      clarification.status = ClarificationStatus.SKIPPED;
      clarification.responseData = { skippedPriceUpdate: true };
    } else if (response.confirmed) {
      clarification.status = ClarificationStatus.ANSWERED;
      clarification.responseData = { confirmed: true };
    }

    clarification.answeredBy = userId;
    clarification.answeredAt = now().toJSDate();

    await this.clarificationRepo.save(clarification);

    await this.updateInvoiceStatus(clarification.invoiceId);

    return clarification;
  }

  async skipClarification(clarificationId: number, userId: number): Promise<InvoiceClarification> {
    const clarification = await this.clarificationRepo.findOne({ where: { id: clarificationId } });

    if (!clarification) {
      throw new Error(`Clarification ${clarificationId} not found`);
    }

    clarification.status = ClarificationStatus.SKIPPED;
    clarification.answeredBy = userId;
    clarification.answeredAt = now().toJSDate();

    await this.clarificationRepo.save(clarification);
    await this.updateInvoiceStatus(clarification.invoiceId);

    return clarification;
  }

  private async updateInvoiceStatus(invoiceId: number): Promise<void> {
    const pendingCount = await this.clarificationRepo.count({
      where: { invoiceId, status: ClarificationStatus.PENDING },
    });

    const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId } });
    if (!invoice) return;

    invoice.extractionStatus =
      pendingCount > 0
        ? InvoiceExtractionStatus.NEEDS_CLARIFICATION
        : InvoiceExtractionStatus.AWAITING_APPROVAL;

    await this.invoiceRepo.save(invoice);
  }

  async applyPriceUpdates(invoiceId: number, approvedBy: number): Promise<SupplierInvoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
      relations: ["items", "items.stockItem"],
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    const skippedPriceClarifications = await this.clarificationRepo.find({
      where: {
        invoiceId,
        clarificationType: ClarificationType.PRICE_CONFIRMATION,
        status: ClarificationStatus.SKIPPED,
      },
    });
    const skippedItemIds = new Set(skippedPriceClarifications.map((c) => c.invoiceItemId));

    await invoice.items
      .filter(
        (item) =>
          item.stockItemId &&
          item.unitPrice !== null &&
          item.quantity > 0 &&
          !item.priceUpdated &&
          !skippedItemIds.has(item.id),
      )
      .reduce(async (prev, item) => {
        await prev;
        const stockItem =
          item.stockItem ||
          (await this.stockItemRepo.findOne({ where: { id: item.stockItemId! } }));

        if (stockItem) {
          const oldPrice = Number(stockItem.costPerUnit) || null;
          const newPrice = Number(item.unitPrice);

          const priceHistory = this.priceHistoryRepo.create({
            stockItemId: stockItem.id,
            companyId: invoice.companyId,
            oldPrice,
            newPrice,
            changeReason: PriceChangeReason.INVOICE,
            referenceType: "supplier_invoice",
            referenceId: invoice.id,
            supplierName: invoice.supplierName,
            changedBy: approvedBy,
          });

          await this.priceHistoryRepo.save(priceHistory);

          stockItem.costPerUnit = newPrice;
          await this.stockItemRepo.save(stockItem);

          item.priceUpdated = true;
          await this.invoiceItemRepo.save(item);
        }
      }, Promise.resolve());

    invoice.extractionStatus = InvoiceExtractionStatus.COMPLETED;
    invoice.approvedBy = approvedBy;
    invoice.approvedAt = now().toJSDate();

    return this.invoiceRepo.save(invoice);
  }

  async pendingClarifications(invoiceId: number): Promise<InvoiceClarification[]> {
    return this.clarificationRepo.find({
      where: { invoiceId, status: ClarificationStatus.PENDING },
      relations: ["invoiceItem"],
      order: { createdAt: "ASC" },
    });
  }

  detectPartAB(description: string): { isPartA: boolean; isPartB: boolean } {
    const lower = description.toLowerCase();

    const isPartA =
      /part\s*a\b/i.test(lower) || /comp(onent)?\s*a\b/i.test(lower) || /\bbase\b/i.test(lower);

    const isPartB =
      /part\s*b\b/i.test(lower) ||
      /comp(onent)?\s*b\b/i.test(lower) ||
      /hardener/i.test(lower) ||
      /activator/i.test(lower) ||
      /curing\s*agent/i.test(lower);

    return { isPartA, isPartB };
  }

  async updateInvoiceItem(
    invoiceId: number,
    itemId: number,
    updates: {
      quantity?: number;
      unitPrice?: number;
      unitType?: string;
      extractedDescription?: string;
    },
    userId: number | null,
  ): Promise<SupplierInvoiceItem> {
    const item = await this.invoiceItemRepo.findOne({
      where: { id: itemId, invoiceId },
      relations: ["invoice"],
    });

    if (!item) {
      throw new Error(`Invoice item ${itemId} not found on invoice ${invoiceId}`);
    }

    const corrections: { field: string; original: string; corrected: string }[] = [];

    if (updates.quantity !== undefined && updates.quantity !== item.quantity) {
      corrections.push({
        field: "quantity",
        original: String(item.quantity),
        corrected: String(updates.quantity),
      });
      item.quantity = updates.quantity;
    }

    if (updates.unitPrice !== undefined && Number(updates.unitPrice) !== Number(item.unitPrice)) {
      corrections.push({
        field: "unitPrice",
        original: String(item.unitPrice ?? ""),
        corrected: String(updates.unitPrice),
      });
      item.unitPrice = updates.unitPrice;
    }

    if (updates.unitType !== undefined && updates.unitType !== item.unitType) {
      corrections.push({
        field: "unitType",
        original: item.unitType ?? "",
        corrected: updates.unitType,
      });
      item.unitType = updates.unitType;
    }

    if (
      updates.extractedDescription !== undefined &&
      updates.extractedDescription !== item.extractedDescription
    ) {
      corrections.push({
        field: "extractedDescription",
        original: item.extractedDescription ?? "",
        corrected: updates.extractedDescription,
      });
      item.extractedDescription = updates.extractedDescription;
    }

    const savedItem = await this.invoiceItemRepo.save(item);

    if (corrections.length > 0 && item.invoice?.supplierName) {
      const correctionEntities = corrections.map((c) =>
        this.correctionRepo.create({
          companyId: item.companyId,
          supplierName: item.invoice.supplierName,
          invoiceItemId: item.id,
          fieldName: c.field,
          originalValue: c.original,
          correctedValue: c.corrected,
          extractedDescription: item.extractedDescription,
          correctedBy: userId,
        }),
      );
      await this.correctionRepo.save(correctionEntities);
    }

    return savedItem;
  }

  private async correctionHintsForSupplier(
    companyId: number,
    supplierName: string | null,
  ): Promise<string | null> {
    if (!supplierName) return null;

    const recentCorrections = await this.correctionRepo.find({
      where: { companyId, supplierName },
      order: { createdAt: "DESC" },
      take: 30,
    });

    if (recentCorrections.length === 0) return null;

    const hints = recentCorrections.map(
      (c) =>
        `- For item "${c.extractedDescription}": ${c.fieldName} was corrected from "${c.originalValue}" to "${c.correctedValue}"`,
    );

    return `PREVIOUS CORRECTIONS FOR THIS SUPPLIER (learn from these):\n${hints.join("\n")}\n\nApply these patterns to similar items. For example, if quantity was consistently corrected, pay extra attention to the quantity column. If unitType was corrected, use the corrected unit type for similar products.`;
  }
}
