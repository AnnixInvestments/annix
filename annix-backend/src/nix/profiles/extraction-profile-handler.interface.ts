import type { DocumentRole, NixExtraction } from "../entities/nix-extraction.entity";

export interface ExtractionProfileContext {
  documentName: string;
  documentPath: string;
  documentRole?: DocumentRole;
  rawText?: string;
  // Use unknown[] so callers can pass through provider-specific item/cell shapes
  // without each profile owner needing to redeclare them.
  extractedItems?: unknown[];
  specificationCells?: unknown[];
  sourceModule?: string;
  sourceId?: number;
  userId?: number;
  productTypes?: string[];
  /**
   * Sibling extractions within the same session that have already completed
   * (set by the orchestrator in #253 task B). Empty array on the first
   * upload of a session. The handler can use this for cross-document
   * context — e.g. a specification handler inspects sibling drawing items
   * to know which paint codes the spec needs to define.
   */
  sessionSiblings?: NixExtraction[];
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

  /**
   * Per-call system prompt that briefs the AI on what to extract.
   *
   * Receives the document role (when known) so handlers can return a
   * role-specific prompt — e.g. an "extract line items" prompt for
   * drawings vs an "extract clauses and cross-link to items" prompt for
   * specifications. Also receives the sibling-extraction set so the
   * specification prompt can name the items the spec needs to cover.
   *
   * Return undefined to fall back to DEFAULT_EXTRACTION_SYSTEM_PROMPT.
   */
  systemPrompt?(input?: { role?: DocumentRole; siblings?: NixExtraction[] }): string | undefined;
}
