import type { ClassificationResult } from "../../inbound-email/interfaces/document-classifier.interface";

export const CLASSIFICATION_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ClassificationImageMime = (typeof CLASSIFICATION_IMAGE_MIME_TYPES)[number];

export const MAX_CLASSIFICATION_TEXT_LENGTH = 5000;

export interface PromptDocumentType {
  key: string;
  description: string;
}

export interface ClassificationPromptConfig {
  systemDescription: string;
  documentTypes: PromptDocumentType[];
  additionalSections?: string[];
  responseSchema: string;
}

export function buildClassificationPrompt(config: ClassificationPromptConfig): string {
  const typesBlock = config.documentTypes
    .map((dt, index) => `${index + 1}. ${dt.key} - ${dt.description}`)
    .join("\n");

  const extras = (config.additionalSections ?? []).join("\n\n");
  const extrasBlock = extras.length > 0 ? `\n\n${extras}` : "";

  return `${config.systemDescription}

DOCUMENT TYPES:
${typesBlock}${extrasBlock}

Respond ONLY with JSON:
${config.responseSchema}`;
}

export function truncateClassificationText(
  text: string,
  max: number = MAX_CLASSIFICATION_TEXT_LENGTH,
): string {
  return text.length > max ? text.substring(0, max) : text;
}

export interface ClassificationUserMessageParams {
  filename: string;
  fromEmail: string;
  subject: string;
  content: string;
}

export function buildClassificationUserMessage(params: ClassificationUserMessageParams): string {
  return `Classify this document.

Filename: ${params.filename}
From email: ${params.fromEmail}
Subject: ${params.subject}

Document content:
${params.content}`;
}

export function isClassificationImageMime(mimeType: string): mimeType is ClassificationImageMime {
  return (CLASSIFICATION_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType);
}

export interface ParseClassificationOptions {
  validTypes: readonly string[];
  unknownType: string;
  defaultConfidence?: number;
}

export function parseClassificationResponse(
  responseContent: string,
  options: ParseClassificationOptions,
): ClassificationResult {
  const unknownResult: ClassificationResult = {
    documentType: options.unknownType,
    confidence: 0,
    source: "content_ai",
  };

  const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return unknownResult;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.documentType && options.validTypes.includes(parsed.documentType)) {
      return {
        documentType: parsed.documentType,
        confidence: parsed.confidence ?? options.defaultConfidence ?? 0.8,
        source: "content_ai",
        supplierName: parsed.supplierName ?? null,
      };
    }
    return unknownResult;
  } catch {
    return unknownResult;
  }
}
