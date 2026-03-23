import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import {
  type ExtractedLineItem,
  ExtractionStatus,
  ReconciliationDocCategory,
  ReconciliationDocument,
} from "../entities/reconciliation-document.entity";
import {
  ReconciliationItem,
  ReconciliationSourceType,
  ReconciliationStatus,
} from "../entities/reconciliation-item.entity";

const CATEGORY_TO_SOURCE: Record<string, ReconciliationSourceType> = {
  [ReconciliationDocCategory.CPO]: ReconciliationSourceType.CPO,
  [ReconciliationDocCategory.JT_DN]: ReconciliationSourceType.JT_DN,
  [ReconciliationDocCategory.SALES_ORDER]: ReconciliationSourceType.JT_DN,
};

const SOURCE_CATEGORIES = new Set([
  ReconciliationDocCategory.CPO,
  ReconciliationDocCategory.JT_DN,
  ReconciliationDocCategory.SALES_ORDER,
]);

@Injectable()
export class ReconciliationExtractionService {
  private readonly logger = new Logger(ReconciliationExtractionService.name);

  constructor(
    @InjectRepository(ReconciliationDocument)
    private readonly docRepo: Repository<ReconciliationDocument>,
    @InjectRepository(ReconciliationItem)
    private readonly itemRepo: Repository<ReconciliationItem>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly aiChatService: AiChatService,
  ) {}

  async extractItems(documentId: number): Promise<void> {
    const doc = await this.docRepo.findOne({ where: { id: documentId } });
    if (!doc) return;

    await this.docRepo.update(doc.id, { extractionStatus: ExtractionStatus.PROCESSING });

    try {
      const buffer = await this.storageService.download(doc.filePath);
      const base64 = buffer.toString("base64");
      const mediaType = this.resolveMediaType(doc.mimeType);

      const prompt = this.promptForCategory(doc.documentCategory);
      const systemPrompt =
        "You are a document extraction assistant. Extract structured data from documents. " +
        "Always respond with valid JSON only, no markdown fences or explanation.";

      const { content } = await this.aiChatService.chatWithImage(
        base64,
        mediaType,
        prompt,
        systemPrompt,
      );

      const items = this.parseExtractedItems(content);

      await this.docRepo.update(doc.id, {
        extractionStatus: ExtractionStatus.COMPLETED,
        extractedItems: items,
        extractedAt: now().toJSDate(),
        extractionError: null,
      });

      if (SOURCE_CATEGORIES.has(doc.documentCategory)) {
        await this.createReconciliationItems(doc, items);
      }

      this.logger.log(
        `Extracted ${items.length} items from document ${doc.id} (${doc.documentCategory})`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown extraction error";
      this.logger.error(`Extraction failed for document ${doc.id}: ${message}`);

      await this.docRepo.update(doc.id, {
        extractionStatus: ExtractionStatus.FAILED,
        extractionError: message,
      });
    }
  }

  async retryExtraction(documentId: number): Promise<void> {
    return this.extractItems(documentId);
  }

  private promptForCategory(category: ReconciliationDocCategory): string {
    const base =
      "Extract all line items from this document. For each item, extract:\n" +
      '- "itemDescription": the item description or name\n' +
      '- "itemCode": item number, code, or part number (null if not found)\n' +
      '- "quantity": the quantity as a number\n' +
      '- "referenceNumber": any reference/order/DN number on the document (null if not found)\n\n' +
      'Return a JSON array of objects. Example: [{"itemDescription":"Steel pipe 100NB","itemCode":"SP-100","quantity":5,"referenceNumber":"DN-1234"}]';

    const categoryHints: Record<string, string> = {
      [ReconciliationDocCategory.JT_DN]:
        "This is a Job Ticket or Delivery Note. Look for JT number, item descriptions, quantities, and any reference numbers.",
      [ReconciliationDocCategory.SALES_ORDER]:
        "This is a Sales Order. Look for SO number, item descriptions, quantities ordered, and customer PO references.",
      [ReconciliationDocCategory.CPO]:
        "This is a Customer Purchase Order. Look for PO number, item descriptions, quantities ordered, and any item codes.",
      [ReconciliationDocCategory.DRAWING]:
        "This is a technical drawing. Extract any item descriptions, part numbers, and quantities if listed. Many drawings may not have quantities.",
      [ReconciliationDocCategory.POLYMER_DN]:
        "This is a Polymer Lining delivery note. Extract items shipped, quantities, and the DN number.",
      [ReconciliationDocCategory.MPS_DN]:
        "This is an MPS delivery note. Extract items delivered, quantities, and the DN number.",
    };

    return `${categoryHints[category] || ""}\n\n${base}`;
  }

  private parseExtractedItems(content: string): ExtractedLineItem[] {
    try {
      const cleaned = content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((item: any) => item.itemDescription || item.description)
        .map((item: any) => ({
          itemDescription: String(item.itemDescription || item.description || ""),
          itemCode: item.itemCode || item.itemNumber || item.partNumber || null,
          quantity: Number(item.quantity) || 0,
          referenceNumber: item.referenceNumber || item.reference || item.dnNumber || null,
        }));
    } catch {
      this.logger.warn("Failed to parse AI extraction response as JSON");
      return [];
    }
  }

  private async createReconciliationItems(
    doc: ReconciliationDocument,
    items: ExtractedLineItem[],
  ): Promise<void> {
    const sourceType = CATEGORY_TO_SOURCE[doc.documentCategory] || ReconciliationSourceType.MANUAL;

    const existing = await this.itemRepo.find({
      where: { companyId: doc.companyId, jobCardId: doc.jobCardId },
    });

    const newItems = items
      .filter(
        (extracted) =>
          !existing.some(
            (e) =>
              e.itemDescription.toLowerCase().trim() ===
                extracted.itemDescription.toLowerCase().trim() && e.sourceDocumentId === doc.id,
          ),
      )
      .map((extracted, idx) =>
        this.itemRepo.create({
          companyId: doc.companyId,
          jobCardId: doc.jobCardId,
          itemDescription: extracted.itemDescription,
          itemCode: extracted.itemCode,
          sourceDocumentId: doc.id,
          sourceType,
          quantityOrdered: extracted.quantity,
          reconciliationStatus: ReconciliationStatus.PENDING,
          sortOrder: existing.length + idx,
        }),
      );

    if (newItems.length > 0) {
      await this.itemRepo.save(newItems);
      this.logger.log(`Created ${newItems.length} reconciliation items from document ${doc.id}`);
    }
  }

  private resolveMediaType(
    mimeType: string | null,
  ): "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf" {
    const type = (mimeType || "").toLowerCase();
    if (type.includes("pdf")) return "application/pdf";
    if (type.includes("png")) return "image/png";
    if (type.includes("gif")) return "image/gif";
    if (type.includes("webp")) return "image/webp";
    return "image/jpeg";
  }
}
