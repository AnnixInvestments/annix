"use client";

import { toPairs as entries, isArray, isNumber, isObject, isString } from "es-toolkit/compat";
import { useMemo } from "react";
import type { NixExtractionSummary } from "@/app/lib/query/hooks";

/**
 * Classification of a code based on which item field references it. Used by
 * SpecificationCard so a clause heading is rendered with the same colour
 * pill the drawing-row chip uses (amber for coating, blue for lining, etc.).
 */
export type CodeKind = "coating" | "lining" | "materialClass" | "flangeConfig";

/**
 * Single source of truth for code-kind colour tokens. Drawing-row chips
 * (CodeChip) and spec-clause headings (SpecificationCard) both pull from
 * here so they always match — if a row chip is amber, the spec heading
 * for the same code is amber too.
 */
export const CODE_KIND_TONE: Record<CodeKind, { bg: string; text: string; border: string }> = {
  coating: { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200" },
  lining: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  materialClass: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  flangeConfig: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
};

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
  /**
   * Concrete primer / topcoat product names mined from the spec's nested
   * details (e.g. 'Carboguard 890 Aluminium / Carbothane 137 HS'). Lets a
   * drawing chip show what's actually being quoted, not just the spec
   * category. Multiple systems are joined with ' • '. Null when the
   * spec doesn't carry product-level detail (linings, material classes).
   */
  productDescriptors: string | null;
  /** Page in the source spec PDF where the clause was extracted. */
  pageReference: number | null;
  /** Source extraction id, so the host can open the right PDF. */
  sourceExtractionId: number;
  /** Source filename (for UI tooltips). */
  sourceDocumentName: string;
  /**
   * Best text fragment to text-search the PDF for after the page jump,
   * so the viewer scrolls past the page header to the actual clause.
   * Falls back through clauseKey → first sentence of description.
   */
  searchHint: string | null;
}

export interface SpecLookup {
  resolve(code: string | null | undefined): ResolvedCode | null;
  /**
   * Returns how a code is referenced by drawing items in this session. Lets
   * the spec section colour-code clause headings to match the corresponding
   * chips in the drawing rows. Returns null when no item references the code.
   */
  kindFor(code: string | null | undefined): CodeKind | null;
}

/**
 * Builds a code → ResolvedCode map from every specification extraction in the
 * session. Case-insensitive matching with whitespace tolerance so that drawing
 * codes like `Linatex Linard 60` resolve regardless of casing/spacing
 * variations. Returns a stable lookup object so callers can pass it down the
 * tree without re-rendering when the session ref doesn't change.
 */
export function useSpecLookup(
  specExtractions: NixExtractionSummary[],
  drawingExtractions: NixExtractionSummary[] = [],
): SpecLookup {
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
          productDescriptors: extractProductDescriptors(obj),
          pageReference,
          sourceExtractionId: extraction.id,
          sourceDocumentName: extraction.documentName,
          searchHint: pickSearchHint(code, description, summary),
        };
        map.set(normaliseCode(code), resolved);
      }
    }

    const kindMap = new Map<string, CodeKind>();
    for (const extraction of drawingExtractions) {
      const items = extraction.extractedItems;
      if (!isArray(items)) continue;
      for (const raw of items as unknown[]) {
        if (!isObject(raw)) continue;
        const item = raw as Record<string, unknown>;
        rememberKind(kindMap, item.coatingSystem, "coating");
        rememberKind(kindMap, item.liningType, "lining");
        rememberKind(kindMap, item.materialClass, "materialClass");
        rememberKind(kindMap, item.flangeConfig, "flangeConfig");
      }
    }

    return {
      resolve(code) {
        if (!isString(code) || code.length === 0) return null;
        return map.get(normaliseCode(code)) ?? null;
      },
      kindFor(code) {
        if (!isString(code) || code.length === 0) return null;
        return kindMap.get(normaliseCode(code)) ?? null;
      },
    };
  }, [specExtractions, drawingExtractions]);
}

/**
 * Mines concrete product-by-product breakdowns from a spec clause's nested
 * details. For each paint-system sub-object (paintSystemGeneric,
 * paintSystemStoncor, paintSystemCorrocoat, etc.) produces:
 *
 *   "Stoncor: Carboguard 890 Aluminium @ 100-150μm, Carbothane 137 HS @ 50-100μm"
 *
 * Each product name is paired with its <name>DftMicrons sibling (e.g. primer
 * pairs with primerDftMicrons, barrierCoat with barrierCoatDftMicrons). When
 * the system carries a topcoatColour / RAL / finalColour field, that's
 * appended at the end. Multiple systems for one clause are joined with ' • '.
 *
 * Branded systems (Stoncor, Corrocoat, Hempel, Jotun…) are preferred — the
 * generic / un-branded reference system is dropped from the inline summary
 * because it just describes 'two component polyurethane' instead of a real
 * orderable product. The full generic system is still visible inside the
 * expanded card via DetailsBlock. Returns null when no system is present
 * (linings without compound names, material classes, flange configs).
 */
export function extractProductDescriptors(spec: unknown): string | null {
  if (!isObject(spec)) return null;
  const obj = spec as Record<string, unknown>;
  const details = isObject(obj.details) ? (obj.details as Record<string, unknown>) : obj;
  const phrases: string[] = [];
  for (const [key, value] of entries(details)) {
    if (!isObject(value) || isArray(value)) continue;
    if (/generic/i.test(key)) continue;
    const phrase = describeSystem(key, value as Record<string, unknown>);
    if (phrase) phrases.push(phrase);
  }
  if (phrases.length === 0) {
    const fallback = describeSystem("", details);
    if (fallback) phrases.push(fallback);
  }
  // Top-level colour (sits as a sibling of the system objects rather than
  // inside one — Gemini puts it at this level when the spec has a single
  // colour applying to all systems).
  const detailColour = pickColour(details);
  if (detailColour && !phrases.some((p) => p.toLowerCase().includes("colour"))) {
    phrases.push(`colour: ${detailColour}`);
  }
  if (phrases.length === 0) return null;
  let result = phrases.join(" • ");
  if (result.length > 240) result = `${result.slice(0, 239)}…`;
  return result;
}

function pickColour(obj: Record<string, unknown>): string | null {
  for (const k of COLOUR_KEYS) {
    const v = obj[k];
    if (isString(v) && v.trim().length > 0) return v.trim();
    if (isNumber(v) && Number.isFinite(v)) return String(v);
  }
  return null;
}

const PRODUCT_PREFIX_PATTERN =
  /^(primer|topcoat|intermediate|barrierCoat|finishingCoat|finishingCoatAboveWaterline|compound|product|brand|paint|lining|coat)/i;
const COLOUR_KEYS = ["topcoatColour", "finalColour", "colour", "color", "RAL", "ralNumber"];

function describeSystem(systemKey: string, system: Record<string, unknown>): string | null {
  const productParts: string[] = [];
  for (const [k, v] of entries(system)) {
    if (!isString(v) || v.trim().length === 0) continue;
    if (/Microns?$/i.test(k)) continue;
    if (!PRODUCT_PREFIX_PATTERN.test(k)) continue;
    const dftValue = system[`${k}DftMicrons`];
    if (isString(dftValue) || isNumber(dftValue)) {
      productParts.push(`${v.trim()} @ ${dftValue}μm`);
    } else {
      productParts.push(v.trim());
    }
  }
  const colour = pickColour(system);
  if (productParts.length === 0 && !colour) return null;
  const body = productParts.join(", ");
  const withColour = colour ? `${body}${body ? ", " : ""}colour: ${colour}` : body;
  const labelMatch = systemKey.match(/^(?:paintSystem(.+)|(.+)System)$/i);
  const matchOne = labelMatch ? labelMatch[1] : null;
  const matchTwo = labelMatch ? labelMatch[2] : null;
  const labelText = matchOne ?? matchTwo ?? "";
  return labelText ? `${capitalise(labelText)}: ${withColour}` : withColour;
}

function capitalise(s: string): string {
  if (s.length === 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function rememberKind(kindMap: Map<string, CodeKind>, value: unknown, kind: CodeKind): void {
  if (!isString(value) || value.length === 0) return;
  const key = normaliseCode(value);
  if (!kindMap.has(key)) kindMap.set(key, kind);
}

function normaliseCode(code: string): string {
  return code.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Picks the best text fragment for the PDF viewer's #search= parameter so
 * after the page jump it scrolls past the page header to the actual clause.
 *
 * Preference order:
 *  1. The clause key itself if it's reasonably specific (≥4 chars, contains
 *     a letter — skips numeric-only keys like "1000/3" that match too widely).
 *  2. The first ~6 words of the description — almost always lands inside
 *     the clause body and avoids matching the heading on every page.
 *  3. The summary, if neither of the above qualifies.
 *
 * Returns null when no usable hint can be derived.
 */
function pickSearchHint(
  clauseKey: string,
  description: string | null,
  summary: string | null,
): string | null {
  if (clauseKey.length >= 4 && /[a-zA-Z]/.test(clauseKey)) {
    return clauseKey;
  }
  if (description && description.length > 0) {
    const firstWords = description.trim().split(/\s+/).slice(0, 6).join(" ");
    if (firstWords.length >= 8) return firstWords;
  }
  if (summary && summary.length > 0) {
    const firstWords = summary.trim().split(/\s+/).slice(0, 6).join(" ");
    if (firstWords.length >= 8) return firstWords;
  }
  return null;
}
