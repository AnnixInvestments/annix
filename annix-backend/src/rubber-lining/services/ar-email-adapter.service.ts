import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InboundEmailAttachment } from "../../inbound-email/entities/inbound-email-attachment.entity";
import { InboundEmailRegistry } from "../../inbound-email/inbound-email-registry.service";
import { ClassificationResult } from "../../inbound-email/interfaces/document-classifier.interface";
import { RoutingResult } from "../../inbound-email/interfaces/document-router.interface";
import { EmailAppAdapter } from "../../inbound-email/interfaces/email-app-adapter.interface";
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
import { DocumentVersionStatus } from "../entities/document-version.types";
import { RubberCompany } from "../entities/rubber-company.entity";
import {
  DeliveryNoteStatus,
  DeliveryNoteType,
  RubberDeliveryNote,
} from "../entities/rubber-delivery-note.entity";
import {
  RubberTaxInvoice,
  TaxInvoiceStatus,
  TaxInvoiceType,
} from "../entities/rubber-tax-invoice.entity";

export const ArDocumentType = {
  COC: SharedDocumentType.COC,
  TAX_INVOICE: SharedDocumentType.TAX_INVOICE,
  CREDIT_NOTE: SharedDocumentType.CREDIT_NOTE,
  DELIVERY_NOTE: SharedDocumentType.DELIVERY_NOTE,
  ORDER: SharedDocumentType.ORDER,
  UNKNOWN: SharedDocumentType.UNKNOWN,
} as const;
export type ArDocumentType = (typeof ArDocumentType)[keyof typeof ArDocumentType];

const AR_VALID_TYPES: readonly string[] = Object.values(ArDocumentType);

const AR_APP_NAME = "au-rubber";

const SUPPORTED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

const SUBJECT_KEYWORDS: [RegExp, ArDocumentType][] = [
  [/\b(?:credit\s*note|debit\s*note)\b/i, ArDocumentType.CREDIT_NOTE],
  [/\b(?:tax\s*inv|invoice)\b/i, ArDocumentType.TAX_INVOICE],
  [/\bproforma\b/i, ArDocumentType.UNKNOWN],
  [/\b(?:delivery|dn\b|despatch|dispatch)\b/i, ArDocumentType.DELIVERY_NOTE],
  [/\b(?:order|po\b|purchase)\b/i, ArDocumentType.ORDER],
  [/\b(?:coc|coa|certificate|conformance)\b/i, ArDocumentType.COC],
];

const AR_RESPONSE_SCHEMA = `{"documentType": "coc"|"tax_invoice"|"credit_note"|"delivery_note"|"order"|"unknown", "supplierName": "string or null", "supplierType": "COMPOUNDER"|"CALENDARER"|"CALENDER_ROLL"|null, "confidence": 0.0-1.0}`;

const AR_SUPPLIER_TYPE_SECTION = `Also identify the supplier type if it's a CoC:
- COMPOUNDER: Produces rubber compounds (batch data, rheometer specs like S-min, S-max, Ts2, Tc90)
- CALENDARER: Calendering operations (roll numbers, thickness, width data)
- CALENDER_ROLL: Per-roll quality certificates with individual Shore A values`;

const AR_TYPE_ORDER: SharedDocumentType[] = [
  SharedDocumentType.COC,
  SharedDocumentType.TAX_INVOICE,
  SharedDocumentType.CREDIT_NOTE,
  SharedDocumentType.DELIVERY_NOTE,
  SharedDocumentType.ORDER,
  SharedDocumentType.UNKNOWN,
];

const CLASSIFICATION_PROMPT = buildClassificationPrompt({
  systemDescription:
    "You are an AI document classifier for a rubber lining manufacturing system. Classify the following document into one of these types:",
  documentTypes: AR_TYPE_ORDER.map((key) => ({
    key,
    description:
      key === SharedDocumentType.UNKNOWN
        ? "Cannot confidently classify."
        : DOCUMENT_TYPE_METADATA[key].description,
  })),
  additionalSections: [AR_SUPPLIER_TYPE_SECTION],
  responseSchema: AR_RESPONSE_SCHEMA,
});

@Injectable()
export class ArEmailAdapterService implements EmailAppAdapter, OnModuleInit {
  private readonly logger = new Logger(ArEmailAdapterService.name);

  constructor(
    private readonly registry: InboundEmailRegistry,
    private readonly aiChatService: AiChatService,
    @InjectRepository(RubberDeliveryNote)
    private readonly deliveryNoteRepo: Repository<RubberDeliveryNote>,
    @InjectRepository(RubberTaxInvoice)
    private readonly taxInvoiceRepo: Repository<RubberTaxInvoice>,
    @InjectRepository(RubberCompany)
    private readonly companyRepo: Repository<RubberCompany>,
  ) {}

  onModuleInit() {
    this.registry.registerAdapter(this);
  }

  appName(): string {
    return AR_APP_NAME;
  }

  supportedMimeTypes(): string[] {
    return SUPPORTED_MIMES;
  }

  async resolveCompanyId(
    _fromEmail: string,
    configCompanyId: number | null,
  ): Promise<number | null> {
    return configCompanyId;
  }

  classifyFromSubject(subject: string, filename: string): ClassificationResult | null {
    const combined = `${subject} ${filename}`.toLowerCase();

    if (/proforma/i.test(combined)) {
      return null;
    }

    const match = SUBJECT_KEYWORDS.find(([pattern]) => pattern.test(combined));

    if (!match) {
      return { documentType: ArDocumentType.COC, confidence: 0.5, source: "subject" };
    }

    return { documentType: match[1], confidence: 0.7, source: "subject" };
  }

  async classifyFromContent(
    content: string | Buffer,
    mimeType: string,
    filename: string,
    fromEmail: string,
    subject: string,
  ): Promise<ClassificationResult> {
    const textContent = Buffer.isBuffer(content) ? content.toString("utf8") : content;

    const refinedType = this.refineFromContent(textContent);
    if (refinedType) {
      return { documentType: refinedType, confidence: 0.85, source: "content_ai" };
    }

    const isAvailable = await this.aiChatService.isAvailable();
    if (!isAvailable) {
      this.logger.warn("AI chat service not available for classification");
      return { documentType: ArDocumentType.COC, confidence: 0.3, source: "content_ai" };
    }

    try {
      if (Buffer.isBuffer(content) && isClassificationImageMime(mimeType)) {
        return this.classifyImage(content, mimeType, filename, fromEmail, subject);
      }

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
      return { documentType: ArDocumentType.COC, confidence: 0.3, source: "content_ai" };
    }
  }

  private refineFromContent(text: string): ArDocumentType | null {
    const upper = text.toUpperCase();

    if (upper.includes("CREDIT NOTE")) {
      return ArDocumentType.CREDIT_NOTE;
    }

    if (upper.includes("TAX INVOICE")) {
      return ArDocumentType.TAX_INVOICE;
    }

    if (upper.includes("DELIVERY NOTE") || upper.includes("DESPATCH NOTE")) {
      return ArDocumentType.DELIVERY_NOTE;
    }

    return null;
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

    const prompt = `Classify this rubber industry document image.

Filename: ${filename}
From email: ${fromEmail}
Subject: ${subject}

Respond ONLY with JSON:
{"documentType": "coc"|"tax_invoice"|"credit_note"|"delivery_note"|"order"|"unknown", "supplierName": "string or null", "supplierType": "COMPOUNDER"|"CALENDARER"|"CALENDER_ROLL"|null, "confidence": 0.0-1.0}`;

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
      validTypes: AR_VALID_TYPES,
      unknownType: ArDocumentType.UNKNOWN,
    });
  }

  async route(
    attachment: InboundEmailAttachment,
    _fileBuffer: Buffer,
    _companyId: number | null,
    fromEmail: string,
    subject: string,
  ): Promise<RoutingResult> {
    const documentType = attachment.documentType;

    if (documentType === ArDocumentType.TAX_INVOICE) {
      return this.routeInvoice(attachment, fromEmail, subject);
    }

    if (documentType === ArDocumentType.DELIVERY_NOTE) {
      return this.routeDeliveryNote(attachment, fromEmail);
    }

    if (documentType === ArDocumentType.COC) {
      this.logger.log(
        `CoC document received from ${fromEmail} - requires manual upload for extraction pipeline`,
      );
      return { linkedEntityType: null, linkedEntityId: null, extractionTriggered: false };
    }

    this.logger.log(`Unroutable document type "${documentType}" from ${fromEmail}`);
    return { linkedEntityType: null, linkedEntityId: null, extractionTriggered: false };
  }

  private async routeInvoice(
    attachment: InboundEmailAttachment,
    fromEmail: string,
    subject: string,
  ): Promise<RoutingResult> {
    try {
      const supplier = await this.resolveSupplier(fromEmail);
      const invoiceNumber = this.extractInvoiceNumberFromSubject(subject);

      const invoice = new RubberTaxInvoice();
      invoice.firebaseUid = `email-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      invoice.invoiceNumber = invoiceNumber || `EMAIL-${Date.now()}`;
      invoice.invoiceType = TaxInvoiceType.SUPPLIER;
      invoice.companyId = supplier?.id || 0;
      invoice.documentPath = attachment.s3Path;
      invoice.status = TaxInvoiceStatus.PENDING;

      const saved = await this.taxInvoiceRepo.save(invoice);
      this.logger.log(`Created tax invoice ${saved.id} from email (${fromEmail})`);

      return {
        linkedEntityType: "RubberTaxInvoice",
        linkedEntityId: saved.id,
        extractionTriggered: false,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to route invoice: ${msg}`);
      return { linkedEntityType: null, linkedEntityId: null, extractionTriggered: false };
    }
  }

  private async routeDeliveryNote(
    attachment: InboundEmailAttachment,
    fromEmail: string,
  ): Promise<RoutingResult> {
    try {
      const supplier = await this.resolveSupplier(fromEmail);

      const dn = new RubberDeliveryNote();
      dn.firebaseUid = `email-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      dn.deliveryNoteNumber = `DN-EMAIL-${Date.now()}`;
      dn.deliveryNoteType = DeliveryNoteType.COMPOUND;
      dn.supplierCompanyId = supplier?.id || 0;
      dn.documentPath = attachment.s3Path;
      dn.status = DeliveryNoteStatus.PENDING;
      dn.versionStatus = DocumentVersionStatus.ACTIVE;

      const saved = await this.deliveryNoteRepo.save(dn);
      this.logger.log(`Created delivery note ${saved.id} from email (${fromEmail})`);

      return {
        linkedEntityType: "RubberDeliveryNote",
        linkedEntityId: saved.id,
        extractionTriggered: false,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to route delivery note: ${msg}`);
      return { linkedEntityType: null, linkedEntityId: null, extractionTriggered: false };
    }
  }

  private async resolveSupplier(fromEmail: string): Promise<RubberCompany | null> {
    const domain = fromEmail.split("@")[1];
    if (!domain) {
      return null;
    }

    const companies = await this.companyRepo.find({
      where: { isCompoundOwner: false },
    });

    return (
      companies.find((c) => {
        const emailConfig = c.emailConfig;
        if (!emailConfig) {
          return false;
        }
        return Object.values(emailConfig).some(
          (val) => typeof val === "string" && val.toLowerCase().includes(domain.toLowerCase()),
        );
      }) || null
    );
  }

  private extractInvoiceNumberFromSubject(subject: string): string | null {
    const patterns = [
      /inv(?:oice)?\s*(?:no\.?|#|number)?\s*[:.]?\s*([A-Z0-9][\w-]+)/i,
      /(?:no\.?|#)\s*([A-Z0-9][\w-]+)/i,
    ];

    const match = patterns.map((p) => subject.match(p)).find((m) => m?.[1]);
    return match?.[1] ?? null;
  }
}
