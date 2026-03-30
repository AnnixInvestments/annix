import { Injectable, Logger } from "@nestjs/common";
import {
  type ClassificationResult,
  type IDocumentClassifier,
} from "../../inbound-email/interfaces/document-classifier.interface";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";

export enum ArDocumentType {
  COC = "coc",
  TAX_INVOICE = "tax_invoice",
  DELIVERY_NOTE = "delivery_note",
  ORDER = "order",
  UNKNOWN = "unknown",
}

const SUBJECT_KEYWORDS: [RegExp, ArDocumentType][] = [
  [/\b(?:tax\s*inv|invoice)\b/i, ArDocumentType.TAX_INVOICE],
  [/\bproforma\b/i, ArDocumentType.UNKNOWN],
  [/\b(?:delivery|dn\b|despatch|dispatch)\b/i, ArDocumentType.DELIVERY_NOTE],
  [/\b(?:order|po\b|purchase)\b/i, ArDocumentType.ORDER],
  [/\b(?:coc|coa|certificate|conformance)\b/i, ArDocumentType.COC],
];

const CLASSIFICATION_PROMPT = `You are an AI document classifier for a rubber lining manufacturing system. Classify the following document into one of these types:

DOCUMENT TYPES:
1. coc - Certificate of Conformance from rubber compound suppliers (compounder or calenderer). Contains batch numbers, test results (Shore A, tensile, elongation, rheometer data), compound codes, roll numbers.
2. tax_invoice - Tax invoices from suppliers or for customers. Contains invoice number, line items, amounts, VAT.
3. delivery_note - Delivery notes for rubber compounds or rolls. Contains delivery date, quantities, roll/batch details.
4. order - Purchase orders or compound orders. Contains order number, quantities, compound specifications.
5. unknown - Cannot confidently classify.

Also identify the supplier type if it's a CoC:
- COMPOUNDER: Produces rubber compounds (batch data, rheometer specs like S-min, S-max, Ts2, Tc90)
- CALENDARER: Calendering operations (roll numbers, thickness, width data)
- CALENDER_ROLL: Per-roll quality certificates with individual Shore A values

Respond ONLY with JSON:
{"documentType": "coc"|"tax_invoice"|"delivery_note"|"order"|"unknown", "supplierName": "string or null", "supplierType": "COMPOUNDER"|"CALENDARER"|"CALENDER_ROLL"|null, "confidence": 0.0-1.0}`;

@Injectable()
export class ArEmailClassifierService implements IDocumentClassifier {
  private readonly logger = new Logger(ArEmailClassifierService.name);

  constructor(private readonly aiChatService: AiChatService) {}

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
      if (Buffer.isBuffer(content) && this.isImageMime(mimeType)) {
        return this.classifyImage(content, mimeType, filename, fromEmail, subject);
      }

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
      return { documentType: ArDocumentType.COC, confidence: 0.3, source: "content_ai" };
    }
  }

  private refineFromContent(text: string): ArDocumentType | null {
    const upper = text.toUpperCase();

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
{"documentType": "coc"|"tax_invoice"|"delivery_note"|"order"|"unknown", "supplierName": "string or null", "supplierType": "COMPOUNDER"|"CALENDARER"|"CALENDER_ROLL"|null, "confidence": 0.0-1.0}`;

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
      return { documentType: ArDocumentType.UNKNOWN, confidence: 0, source: "content_ai" };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validTypes = Object.values(ArDocumentType);

    if (parsed.documentType && validTypes.includes(parsed.documentType)) {
      return {
        documentType: parsed.documentType,
        confidence: parsed.confidence ?? 0.8,
        source: "content_ai",
        supplierName: parsed.supplierName ?? null,
      };
    }

    return { documentType: ArDocumentType.UNKNOWN, confidence: 0, source: "content_ai" };
  }

  private isImageMime(mimeType: string): boolean {
    return ["image/jpeg", "image/png", "image/webp"].includes(mimeType);
  }
}
