import { Injectable, Logger } from "@nestjs/common";
import {
  type ClassificationResult,
  type IDocumentClassifier,
} from "../../inbound-email/interfaces/document-classifier.interface";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";

export enum ScDocumentType {
  SUPPLIER_INVOICE = "supplier_invoice",
  DELIVERY_NOTE = "delivery_note",
  PURCHASE_ORDER = "purchase_order",
  SUPPLIER_CERTIFICATE = "supplier_certificate",
  JOB_CARD_DRAWING = "job_card_drawing",
  SUPPORTING_DOCUMENT = "supporting_document",
  UNKNOWN = "unknown",
}

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

@Injectable()
export class ScEmailClassifierService implements IDocumentClassifier {
  private readonly logger = new Logger(ScEmailClassifierService.name);

  constructor(private readonly aiChatService: AiChatService) {}

  classifyFromSubject(subject: string, filename: string): ClassificationResult | null {
    const combined = `${subject} ${filename}`.toLowerCase();

    for (const [pattern, docType] of SUBJECT_KEYWORDS) {
      if (pattern.test(combined)) {
        return {
          documentType: docType,
          confidence: 0.7,
          source: "subject",
        };
      }
    }

    return null;
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
      if (Buffer.isBuffer(content) && this.isImageMime(mimeType)) {
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

  private isImageMime(mimeType: string): boolean {
    return ["image/jpeg", "image/png", "image/webp"].includes(mimeType);
  }
}
