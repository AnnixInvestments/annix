"use client";

import { toPairs as entries, isNumber, isObject, isString } from "es-toolkit/compat";
import { useMemo } from "react";
import type { NixExtractionSummary } from "@/app/lib/query/hooks";

/**
 * Resolved spec data for a single code (R1, SC1, "Linatex Linard 60", etc.)
 * extracted from one of the session's specification documents. Drawing items
 * reference codes in their `coatingSystem`/`liningType`/`materialClass` fields
 * but don't carry the resolved values — this lookup pulls the matching
 * specification clause so the drawing row can show "6mm bore, 3mm flange face"
 * inline next to the code.
 */
export interface ResolvedCode {
  code: string;
  /** Quoter-friendly one-liner from the spec extraction. */
  summary: string | null;
  /** Long-form description from the spec extraction. */
  description: string | null;
  /** Page in the source spec PDF where the clause was extracted. */
  pageReference: number | null;
  /** Source extraction id, so the host can open the right PDF. */
  sourceExtractionId: number;
  /** Source filename (for UI tooltips). */
  sourceDocumentName: string;
}

export interface SpecLookup {
  resolve(code: string | null | undefined): ResolvedCode | null;
}

/**
 * Builds a code → ResolvedCode map from every specification extraction in the
 * session. Case-insensitive matching with whitespace tolerance so that drawing
 * codes like `Linatex Linard 60` resolve regardless of casing/spacing
 * variations. Returns a stable lookup object so callers can pass it down the
 * tree without re-rendering when the session ref doesn't change.
 */
export function useSpecLookup(specExtractions: NixExtractionSummary[]): SpecLookup {
  return useMemo(() => {
    const map = new Map<string, ResolvedCode>();

    for (const extraction of specExtractions) {
      const data = extraction.extractedData;
      if (!isObject(data)) continue;
      const specs = (data as Record<string, unknown>).specifications;
      if (!isObject(specs)) continue;

      for (const [code, raw] of entries(specs as Record<string, unknown>)) {
        if (code === "referencedCodes") continue;
        if (!isObject(raw)) continue;
        const obj = raw as Record<string, unknown>;
        const summary = isString(obj.summary) ? (obj.summary as string) : null;
        const description = isString(obj.description) ? (obj.description as string) : null;
        const rawPage = obj.pageReference;
        let pageReference: number | null = null;
        if (isNumber(rawPage) && Number.isFinite(rawPage)) {
          pageReference = rawPage;
        } else if (isString(rawPage)) {
          const parsed = Number.parseInt(rawPage, 10);
          pageReference = Number.isFinite(parsed) ? parsed : null;
        }

        const resolved: ResolvedCode = {
          code,
          summary,
          description,
          pageReference,
          sourceExtractionId: extraction.id,
          sourceDocumentName: extraction.documentName,
        };
        map.set(normaliseCode(code), resolved);
      }
    }

    return {
      resolve(code) {
        if (!isString(code) || code.length === 0) return null;
        return map.get(normaliseCode(code)) ?? null;
      },
    };
  }, [specExtractions]);
}

function normaliseCode(code: string): string {
  return code.trim().toLowerCase().replace(/\s+/g, " ");
}
