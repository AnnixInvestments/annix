import type { NixDocumentRole } from "../../api";

export interface RoleTaggedDocument {
  id: string;
  role: NixDocumentRole;
}

// Drawings must extract before specifications: the spec prompt's
// cross-linking block injects each drawing's referencedCodes into
// Gemini so spec clauses tie back to the codes the drawings cite
// (issue #266 — "the wrinkle that's not free"). 'other' has no
// cross-link dependency and goes last.
export const EXTRACTION_PASS_ORDER: NixDocumentRole[] = ["drawing", "specification", "other"];

export interface ExtractionPass<T extends RoleTaggedDocument> {
  role: NixDocumentRole;
  documents: T[];
}

// Groups documents into ordered extraction passes, preserving the
// user's drop order within each pass. Empty passes are omitted.
export function extractionPassesOf<T extends RoleTaggedDocument>(
  documents: T[],
): Array<ExtractionPass<T>> {
  return EXTRACTION_PASS_ORDER.map((role) => ({
    role,
    documents: documents.filter((doc) => doc.role === role),
  })).filter((pass) => pass.documents.length > 0);
}

export function orderForExtraction<T extends RoleTaggedDocument>(documents: T[]): T[] {
  return extractionPassesOf(documents).flatMap((pass) => pass.documents);
}
