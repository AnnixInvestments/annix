import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InboundEmailAttachment } from "../../inbound-email/entities/inbound-email-attachment.entity";
import { InboundEmailRegistry } from "../../inbound-email/inbound-email-registry.service";
import { ClassificationResult } from "../../inbound-email/interfaces/document-classifier.interface";
import { RoutingResult } from "../../inbound-email/interfaces/document-router.interface";
import { EmailAppAdapter } from "../../inbound-email/interfaces/email-app-adapter.interface";
import { nowMillis } from "../../lib/datetime";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { StockControlSupplier } from "../entities/stock-control-supplier.entity";
import { DeliveryService } from "./delivery.service";
import { InvoiceService } from "./invoice.service";
import { InvoiceExtractionService } from "./invoice-extraction.service";
import { WorkflowNotificationService } from "./workflow-notification.service";

export enum ScDocumentType {
  SUPPLIER_INVOICE = "supplier_invoice",
  DELIVERY_NOTE = "delivery_note",
  PURCHASE_ORDER = "purchase_order",
  SUPPLIER_CERTIFICATE = "supplier_certificate",
  JOB_CARD_DRAWING = "job_card_drawing",
  SUPPORTING_DOCUMENT = "supporting_document",
  UNKNOWN = "unknown",
}

const SC_APP_NAME = "stock-control";

const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

const SUBJECT_KEYWORDS: [RegExp, ScDocumentType][] = [
  [/\b(?:tax\s*)?invoice\b/i, ScDocumentType.SUPPLIER_INVOICE],
  [/\b(?:delivery|dn\b|despatch|dispatch)\b/i, ScDocumentType.DELIVERY_NOTE],
  [/\b(?:purchase\s*order|po\b)\b/i, ScDocumentType.PURCHASE_ORDER],
  [/\b(?:coc|coa|certificate)\b/i, ScDocumentType.SUPPLIER_CERTIFICATE],
  [/\b(?:drawing|dwg|spec)\b/i, ScDocumentType.JOB_CARD_DRAWING],
  [/\b(?:amendment)\b/i, ScDocumentType.SUPPORTING_DOCUMENT],
];

const CLASSIFICATION_PROMPT = `You are NIX, an AI document classifier for an industrial stock control system. Classify the following document into one of these types:

DOCUMENT TYPES:
1. supplier_invoice - Tax invoices or invoices from suppliers. Contains invoice number, line items, amounts, VAT.
2. delivery_note - Delivery notes, despatch notes, goods received documentation. Contains delivery date, quantities, item descriptions.
3. purchase_order - Purchase orders placed to suppliers. Contains PO number, line items, quantities, pricing.
4. supplier_certificate - COC (Certificate of Conformance), COA (Certificate of Analysis), test certificates, material certificates. Contains batch numbers, test results, compliance statements.
5. job_card_drawing - Engineering drawings, technical specifications, fabrication details.
6. supporting_document - Amendments, correspondence, supporting documentation that doesn't fit other categories.
7. unknown - Cannot confidently classify the document.

Also try to identify the supplier name from the document.

Respond ONLY with a JSON object:
{"documentType": "supplier_invoice"|"delivery_note"|"purchase_order"|"supplier_certificate"|"job_card_drawing"|"supporting_document"|"unknown", "supplierName": "string or null", "confidence": 0.0-1.0}`;

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];

@Injectable()
export class ScEmailAdapterService implements EmailAppAdapter, OnModuleInit {
  private readonly logger = new Logger(ScEmailAdapterService.name);

  constructor(
    private readonly registry: InboundEmailRegistry,
    private readonly aiChatService: AiChatService,
    private readonly invoiceService: InvoiceService,
    private readonly deliveryService: DeliveryService,
    private readonly extractionService: InvoiceExtractionService,
    private readonly notificationService: WorkflowNotificationService,
    @InjectRepository(StockControlSupplier)
    private readonly supplierRepo: Repository<StockControlSupplier>,
  ) {}

  onModuleInit() {
    this.registry.registerAdapter(this);
  }

  appName(): string {
    return SC_APP_NAME;
  }

  supportedMimeTypes(): string[] {
    return SUPPORTED_MIME_TYPES;
  }

  async resolveCompanyId(
    _fromEmail: string,
    configCompanyId: number | null,
  ): Promise<number | null> {
    return configCompanyId;
  }

  classifyFromSubject(subject: string, filename: string): ClassificationResult | null {
    const combined = `${subject} ${filename}`.toLowerCase();
    const match = SUBJECT_KEYWORDS.find(([pattern]) => pattern.test(combined));
    return match ? { documentType: match[1], confidence: 0.7, source: "subject" as const } : null;
  }

  async classifyFromContent(
    content: string | Buffer,
    mimeType: string,
    filename: string,
    fromEmail: string,
    subject: string,
  ): Promise<ClassificationResult> {
    const isAvailable = await this.aiChatService.isAvailable();
    if (!isAvailable) {
      this.logger.warn("AI chat service not available for document classification");
      return { documentType: ScDocumentType.UNKNOWN, confidence: 0, source: "content_ai" };
    }

    try {
      if (Buffer.isBuffer(content) && IMAGE_MIMES.includes(mimeType)) {
        return this.classifyImage(content, mimeType, filename, fromEmail, subject);
      }

      const textContent = Buffer.isBuffer(content) ? content.toString("utf8") : content;
      const truncated = textContent.length > 5000 ? textContent.substring(0, 5000) : textContent;

      const userMessage = `Classify this document.

Filename: ${filename}
From email: ${fromEmail}
Subject: ${subject}

Document content:
${truncated}`;

      const response = await this.aiChatService.chat(
        [{ role: "user", content: userMessage }],
        CLASSIFICATION_PROMPT,
      );

      return this.parseAiResponse(response.content);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`AI classification failed: ${msg}`);
      return { documentType: ScDocumentType.UNKNOWN, confidence: 0, source: "content_ai" };
    }
  }

  private async classifyImage(
    buffer: Buffer,
    mimeType: string,
    filename: string,
    fromEmail: string,
    subject: string,
  ): Promise<ClassificationResult> {
    const imageBase64 = buffer.toString("base64");
    const mediaType = mimeType as "image/jpeg" | "image/png" | "image/webp";

    const prompt = `Classify this document image.

Filename: ${filename}
From email: ${fromEmail}
Subject: ${subject}

Identify the document type and supplier name.
Respond ONLY with a JSON object:
{"documentType": "supplier_invoice"|"delivery_note"|"purchase_order"|"supplier_certificate"|"job_card_drawing"|"supporting_document"|"unknown", "supplierName": "string or null", "confidence": 0.0-1.0}`;

    const response = await this.aiChatService.chatWithImage(
      imageBase64,
      mediaType,
      prompt,
      CLASSIFICATION_PROMPT,
    );

    return this.parseAiResponse(response.content);
  }

  private parseAiResponse(responseContent: string): ClassificationResult {
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { documentType: ScDocumentType.UNKNOWN, confidence: 0, source: "content_ai" };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validTypes = Object.values(ScDocumentType);

    if (parsed.documentType && validTypes.includes(parsed.documentType)) {
      return {
        documentType: parsed.documentType,
        confidence: parsed.confidence ?? 0.8,
        source: "content_ai",
        supplierName: parsed.supplierName ?? null,
      };
    }

    return { documentType: ScDocumentType.UNKNOWN, confidence: 0, source: "content_ai" };
  }

  async route(
    attachment: InboundEmailAttachment,
    fileBuffer: Buffer,
    companyId: number | null,
    fromEmail: string,
    subject: string,
  ): Promise<RoutingResult> {
    if (!companyId) {
      this.logger.warn("No company ID for routing, skipping");
      return { linkedEntityType: null, linkedEntityId: null, extractionTriggered: false };
    }

    const docType = attachment.documentType as ScDocumentType;

    if (docType === ScDocumentType.SUPPLIER_INVOICE) {
      return this.routeInvoice(attachment, fileBuffer, companyId, fromEmail, subject);
    }

    if (docType === ScDocumentType.DELIVERY_NOTE) {
      return this.routeDeliveryNote(attachment, fileBuffer, companyId, fromEmail, subject);
    }

    this.logger.log(
      `Document type "${docType}" stored for manual review: ${attachment.originalFilename}`,
    );
    return { linkedEntityType: null, linkedEntityId: null, extractionTriggered: false };
  }

  private async routeInvoice(
    attachment: InboundEmailAttachment,
    fileBuffer: Buffer,
    companyId: number,
    fromEmail: string,
    _subject: string,
  ): Promise<RoutingResult> {
    const supplierName = await this.resolveSupplierName(companyId, fromEmail);
    const invoiceNumber = `EMAIL-${nowMillis()}`;

    const invoice = await this.invoiceService.create(companyId, {
      invoiceNumber,
      supplierName,
    });

    if (attachment.s3Path) {
      await this.invoiceService.linkScanPath(invoice.id, attachment.s3Path);
    }

    this.triggerInvoiceExtraction(invoice.id, fileBuffer, attachment.mimeType);

    this.notificationService
      .notifyDocumentArrived(companyId, "invoice", supplierName, attachment.originalFilename)
      .catch((error) => {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to send document arrival notification: ${msg}`);
      });

    this.logger.log(
      `Created invoice ${invoice.id} (${invoiceNumber}) from email attachment: ${attachment.originalFilename}`,
    );

    return {
      linkedEntityType: "SupplierInvoice",
      linkedEntityId: invoice.id,
      extractionTriggered: true,
    };
  }

  private async routeDeliveryNote(
    attachment: InboundEmailAttachment,
    _fileBuffer: Buffer,
    companyId: number,
    fromEmail: string,
    _subject: string,
  ): Promise<RoutingResult> {
    const supplierName = await this.resolveSupplierName(companyId, fromEmail);
    const deliveryNumber = `DN-EMAIL-${nowMillis()}`;

    const dn = await this.deliveryService.createFromEmail(companyId, {
      deliveryNumber,
      supplierName,
      photoUrl: attachment.s3Path,
    });

    this.notificationService
      .notifyDocumentArrived(companyId, "delivery note", supplierName, attachment.originalFilename)
      .catch((error) => {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to send document arrival notification: ${msg}`);
      });

    this.logger.log(
      `Created delivery note ${dn.id} (${deliveryNumber}) from email attachment: ${attachment.originalFilename}`,
    );

    return {
      linkedEntityType: "DeliveryNote",
      linkedEntityId: dn.id,
      extractionTriggered: false,
    };
  }

  private async resolveSupplierName(companyId: number, fromEmail: string): Promise<string> {
    const domain = fromEmail.split("@")[1] ?? "";

    const suppliers = await this.supplierRepo.find({ where: { companyId } });

    const emailMatch = suppliers.find((s) => s.email?.toLowerCase() === fromEmail.toLowerCase());
    if (emailMatch) {
      return emailMatch.name;
    }

    const domainMatch = suppliers.find((s) => s.email?.toLowerCase().endsWith(`@${domain}`));
    if (domainMatch) {
      return domainMatch.name;
    }

    return fromEmail;
  }

  private triggerInvoiceExtraction(invoiceId: number, fileBuffer: Buffer, mimeType: string): void {
    const imageBase64 = fileBuffer.toString("base64");
    const mediaType = this.mimeToMediaType(mimeType);

    this.extractionService.extractFromImage(invoiceId, imageBase64, mediaType).catch((error) => {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Invoice extraction failed for invoice ${invoiceId}: ${msg}`);
    });
  }

  private mimeToMediaType(
    mime: string,
  ): "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf" {
    const mimeMap: Record<
      string,
      "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf"
    > = {
      "image/jpeg": "image/jpeg",
      "image/jpg": "image/jpeg",
      "image/png": "image/png",
      "image/gif": "image/gif",
      "image/webp": "image/webp",
      "application/pdf": "application/pdf",
    };
    return mimeMap[mime] ?? "application/pdf";
  }
}
