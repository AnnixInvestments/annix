import type { NixExtraction } from "../entities/nix-extraction.entity";

export interface ExtractionProfileContext {
  documentName: string;
  documentPath: string;
  rawText?: string;
  // Use unknown[] so callers can pass through provider-specific item/cell shapes
  // without each profile owner needing to redeclare them.
  extractedItems?: unknown[];
  specificationCells?: unknown[];
  sourceModule?: string;
  sourceId?: number;
  userId?: number;
  productTypes?: string[];
}

export interface ExtractionProfileResult {
  metadata?: Record<string, unknown>;
  notes?: string[];
}

export interface IExtractionProfileHandler {
  readonly profileKey: string;
  readonly label: string;
  readonly sourceModule: string;
  postExtract(
    extraction: NixExtraction,
    context: ExtractionProfileContext,
  ): Promise<ExtractionProfileResult>;
  systemPrompt?(): string;
}
