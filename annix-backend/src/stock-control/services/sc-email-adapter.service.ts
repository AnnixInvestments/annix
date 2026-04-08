import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InboundEmailAttachment } from "../../inbound-email/entities/inbound-email-attachment.entity";
import { InboundEmailRegistry } from "../../inbound-email/inbound-email-registry.service";
import { ClassificationResult } from "../../inbound-email/interfaces/document-classifier.interface";
import { RoutingResult } from "../../inbound-email/interfaces/document-router.interface";
import { EmailAppAdapter } from "../../inbound-email/interfaces/email-app-adapter.interface";
import { nowMillis } from "../../lib/datetime";
import {
  buildClassificationPrompt,
  buildClassificationUserMessage,
  DOCUMENT_TYPE_METADATA,
  isClassificationImageMime,
  parseClassificationResponse,
  SharedDocumentType,
  truncateClassificationText,
} from "../../lib/document-classification";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { StockControlSupplier } from "../entities/stock-control-supplier.entity";
import { CertificateService } from "./certificate.service";
import { DeliveryService } from "./delivery.service";
import { InvoiceService } from "./invoice.service";
import { InvoiceExtractionService } from "./invoice-extraction.service";
import { WorkflowNotificationService } from "./workflow-notification.service";

export const ScDocumentType = {
  SUPPLIER_INVOICE: SharedDocumentType.SUPPLIER_INVOICE,
  DELIVERY_NOTE: SharedDocumentType.DELIVERY_NOTE,
  PURCHASE_ORDER: SharedDocumentType.PURCHASE_ORDER,
  SUPPLIER_CERTIFICATE: SharedDocumentType.SUPPLIER_CERTIFICATE,
  JOB_CARD_DRAWING: SharedDocumentType.JOB_CARD_DRAWING,
  SUPPORTING_DOCUMENT: SharedDocumentType.SUPPORTING_DOCUMENT,
  UNKNOWN: SharedDocumentType.UNKNOWN,
} as const;
export type ScDocumentType = (typeof ScDocumentType)[keyof typeof ScDocumentType];

const SC_VALID_TYPES: readonly string[] = Object.values(ScDocumentType);

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

const SC_RESPONSE_SCHEMA = `{"documentType": "supplier_invoice"|"delivery_note"|"purchase_order"|"supplier_certificate"|"job_card_drawing"|"supporting_document"|"unknown", "supplierName": "string or null", "confidence": 0.0-1.0}`;

const SC_TYPE_ORDER: SharedDocumentType[] = [
  SharedDocumentType.SUPPLIER_INVOICE,
  SharedDocumentType.DELIVERY_NOTE,
  SharedDocumentType.PURCHASE_ORDER,
  SharedDocumentType.SUPPLIER_CERTIFICATE,
  SharedDocumentType.JOB_CARD_DRAWING,
  SharedDocumentType.SUPPORTING_DOCUMENT,
  SharedDocumentType.UNKNOWN,
];

const CLASSIFICATION_PROMPT = buildClassificationPrompt({
  systemDescription:
    "You are NIX, an AI document classifier for an industrial stock control system. Classify the following document into one of these types:",
  documentTypes: SC_TYPE_ORDER.map((key) => ({
    key,
    description:
      key === SharedDocumentType.UNKNOWN
        ? "Cannot confidently classify the document."
        : DOCUMENT_TYPE_METADATA[key].description,
  })),
  additionalSections: ["Also try to identify the supplier name from the document."],
  responseSchema: SC_RESPONSE_SCHEMA,
});

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
    private readonly certificateService: CertificateService,
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
      if (Buffer.isBuffer(content) && isClassificationImageMime(mimeType)) {
        return this.classifyImage(content, mimeType, filename, fromEmail, subject);
      }

      const textContent = Buffer.isBuffer(content) ? content.toString("utf8") : content;
      const truncated = truncateClassificationText(textContent);

      const userMessage = buildClassificationUserMessage({
        filename,
        fromEmail,
        subject,
        content: truncated,
      });

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
    return parseClassificationResponse(responseContent, {
      validTypes: SC_VALID_TYPES,
      unknownType: ScDocumentType.UNKNOWN,
    });
  }

  async route(
    attachment: InboundEmailAttachment,
    fileBuffer: Buffer,
    companyId: number | null,
    fromEmail: string,
    subject: string,
    supplierName?: string | null,
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

    if (docType === ScDocumentType.SUPPLIER_CERTIFICATE) {
      return this.routeCertificate(
        attachment,
        fileBuffer,
        companyId,
        fromEmail,
        supplierName ?? null,
      );
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

  private async routeCertificate(
    attachment: InboundEmailAttachment,
    fileBuffer: Buffer,
    companyId: number,
    fromEmail: string,
    supplierName: string | null,
  ): Promise<RoutingResult> {
    if (!attachment.s3Path) {
      this.logger.warn(`No S3 path on attachment ${attachment.id}, skipping certificate creation`);
      return { linkedEntityType: null, linkedEntityId: null, extractionTriggered: false };
    }

    const resolvedSupplierName =
      supplierName ?? (await this.extractSupplierNameFromContent(fileBuffer, attachment.mimeType));
    const supplier = await this.resolveSupplier(companyId, fromEmail, resolvedSupplierName);
    if (!supplier) {
      this.logger.warn(
        `No supplier found for email ${fromEmail} (supplierName=${resolvedSupplierName}) in company ${companyId}, skipping certificate creation`,
      );
      return { linkedEntityType: null, linkedEntityId: null, extractionTriggered: false };
    }

    const filenameBase = attachment.originalFilename.replace(/\.[^.]+$/, "");
    const batchNumber = filenameBase;

    const cert = await this.certificateService.createFromInboundEmail(
      companyId,
      supplier.id,
      attachment.s3Path,
      attachment.originalFilename,
      attachment.fileSizeBytes,
      attachment.mimeType,
      "COC",
      batchNumber,
    );

    this.logger.log(
      `Created supplier certificate ${cert.id} from email: ${attachment.originalFilename}`,
    );

    return {
      linkedEntityType: "SupplierCertificate",
      linkedEntityId: cert.id,
      extractionTriggered: false,
    };
  }

  private async extractSupplierNameFromContent(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<string | null> {
    try {
      const isAvailable = await this.aiChatService.isAvailable();
      if (!isAvailable) {
        return null;
      }
      const imageBase64 = fileBuffer.toString("base64");
      const mediaType = this.mimeToMediaType(mimeType);
      const response = await this.aiChatService.chatWithImage(
        imageBase64,
        mediaType,
        'What is the name of the company or supplier that issued this certificate? Reply with ONLY the company name, nothing else. If you cannot determine it, reply with "unknown".',
      );
      const name = response.content.trim();
      return name === "unknown" || name.length === 0 ? null : name;
    } catch {
      return null;
    }
  }

  private async resolveSupplier(
    companyId: number,
    fromEmail: string,
    supplierName: string | null,
  ): Promise<StockControlSupplier | null> {
    const domain = fromEmail.split("@")[1] ?? "";
    const suppliers = await this.supplierRepo.find({ where: { companyId } });

    const emailMatch = suppliers.find((s) => s.email?.toLowerCase() === fromEmail.toLowerCase());
    if (emailMatch) {
      return emailMatch;
    }

    const domainMatch = suppliers.find((s) => s.email?.toLowerCase().endsWith(`@${domain}`));
    if (domainMatch) {
      return domainMatch;
    }

    if (supplierName) {
      const normalised = supplierName.toLowerCase();
      const nameMatch = suppliers.find(
        (s) =>
          s.name.toLowerCase().includes(normalised) || normalised.includes(s.name.toLowerCase()),
      );
      if (nameMatch) {
        return nameMatch;
      }
    }

    return null;
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
