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
  /**
   * Which faces of the item this coating spec applies to, when the signed
   * drawing carries explicit CORROSION INT. / CORROSION EXT. callouts.
   *
   * - "both"     drawing has BOTH INT and EXT text → paint applies internally
   *              AND externally → coating m² is external + internal
   * - "external" drawing has only EXT text → external face only (default)
   * - "internal" drawing has only INT text → internal face only
   * - null       no drawing override (or this is a lining/material spec)
   *
   * Drives the per-item coating area calc: when "both", the quote
   * doubles the painted area to cover both surfaces. Without this flag,
   * the calc would silently undercharge customers whose R2a items (or
   * any other code resolving to a both-sides paint spec) are painted
   * inside AND out.
   */
  coatingSides: "external" | "both" | "internal" | null;
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
          coatingSides: null,
        };
        map.set(normaliseCode(code), resolved);
      }
    }

    const kindMap = new Map<string, CodeKind>();
    /** Drawing-derived bore + flange-face lining thicknesses per liningType.
     *  The signed drawings always override the spec-PDF summary values for
     *  these fields (see project memory: "Signed drawings always override
     *  spec documents"). First non-null value across all items wins —
     *  drawings should be internally consistent for a given code. */
    const liningThicknessOverrides = new Map<
      string,
      { boreMm: number | null; flangeMm: number | null }
    >();
    /** Drawing-derived explicit INT/EXT coating callouts per coatingSystem
     *  code. Same precedence rule as lining thicknesses — the drawing's
     *  CORROSION INT. / CORROSION EXT. text wins over whatever the spec PDF
     *  resolves a code like "R2a" to. First non-null wins. */
    const coatingDescriptionOverrides = new Map<
      string,
      { internal: string | null; external: string | null }
    >();
    // Skip superseded drawings — older revisions can carry shorter / stale
    // CORROSION EXT text (e.g. just "BRILLIANT GREEN" before the prompt
    // captured the full PAINT line beneath it), and rememberCoatingDescription
    // keeps the FIRST non-null value across all drawings. Without this filter
    // the superseded extraction wins and the customer-facing footer shows
    // the truncated colour callout instead of the full paint system.
    const liveDrawingExtractions = drawingExtractions.filter((e) => e.isLatestRevision !== false);
    for (const extraction of liveDrawingExtractions) {
      const items = extraction.extractedItems;
      if (!isArray(items)) continue;
      for (const raw of items as unknown[]) {
        if (!isObject(raw)) continue;
        const item = raw as Record<string, unknown>;
        rememberKind(kindMap, item.coatingSystem, "coating");
        rememberKind(kindMap, item.liningType, "lining");
        rememberKind(kindMap, item.materialClass, "materialClass");
        rememberKind(kindMap, item.flangeConfig, "flangeConfig");
        rememberLiningThickness(liningThicknessOverrides, item);
        rememberCoatingDescription(coatingDescriptionOverrides, item);
      }
    }

    // Apply drawing overrides on top of the spec-PDF summary. The base
    // summary string usually starts with "X mm bore, Y mm flange, …rest"
    // — we replace that thickness prefix with the drawing-derived values
    // and keep the rest (hot-bonded, autoclave vulcanised, red, …) intact.
    for (const [codeKey, override] of liningThicknessOverrides) {
      const resolved = map.get(codeKey);
      if (!resolved) continue;
      const merged = mergeLiningThicknessIntoSummary(resolved.summary, override);
      if (merged !== resolved.summary) {
        map.set(codeKey, { ...resolved, summary: merged });
      }
    }

    // Apply drawing-derived INT/EXT coating callouts. When a drawing prints
    // explicit CORROSION INT. / CORROSION EXT. text, it overrides whatever
    // the spec PDF resolves the code to — the drawing is contractual.
    // We override BOTH `summary` and `productDescriptors` because the editor
    // rebuilds the customer-facing supplier list from `productDescriptors`
    // (see defaultSuppliersForSpec in quoteSpecOverrides.ts), so changing
    // only summary would leave the footer still rendering the spec PDF's
    // default suppliers (Stoncor, Corrocoat, colour) instead of the
    // drawing-mandated Internal + External entries.
    for (const [codeKey, override] of coatingDescriptionOverrides) {
      const resolved = map.get(codeKey);
      const mergedSummary = mergeCoatingDescriptionIntoSummary(
        resolved ? resolved.summary : null,
        override,
      );
      const drawingProductDescriptors = buildCoatingProductDescriptors(override);
      if (!resolved) {
        if (mergedSummary !== null) {
          map.set(codeKey, {
            code: codeKey,
            summary: mergedSummary,
            description: null,
            productDescriptors: drawingProductDescriptors,
            pageReference: null,
            sourceExtractionId: 0,
            sourceDocumentName: "drawing",
            searchHint: null,
            coatingSides: coatingSidesFromOverride(override),
          });
        }
        continue;
      }
      map.set(codeKey, {
        ...resolved,
        summary: mergedSummary !== null ? mergedSummary : resolved.summary,
        productDescriptors: drawingProductDescriptors ?? resolved.productDescriptors,
        coatingSides: coatingSidesFromOverride(override),
      });
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
    // Gemini sometimes returns paintSystems as an array of system objects
    // each carrying a 'type' label ('Stoncor', 'Corrocoat', 'Generic System'),
    // and sometimes returns them as sibling keys (paintSystemStoncor etc.).
    // Walk both shapes.
    if (isArray(value)) {
      for (const item of value as unknown[]) {
        if (!isObject(item)) continue;
        const itemObj = item as Record<string, unknown>;
        const itemType = isString(itemObj.type) ? (itemObj.type as string) : "";
        if (/generic/i.test(itemType)) continue;
        const phrase = describeSystem("", itemObj);
        if (phrase) phrases.push(phrase);
      }
      continue;
    }
    if (!isObject(value)) continue;
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
    if (isString(v) && v.trim().length > 0) {
      const trimmed = v.trim();
      if (isPlaceholderText(trimmed)) continue;
      return trimmed;
    }
    if (isNumber(v) && Number.isFinite(v)) return String(v);
  }
  return null;
}

const PRODUCT_PREFIX_PATTERN =
  /^(primer|topcoat|intermediate|barrierCoat|finishingCoat|finishingCoatAboveWaterline|compound|product|brand|paint|lining|coat)/i;
const COLOUR_KEYS = ["topcoatColour", "finalColour", "colour", "color", "RAL", "ralNumber"];

/**
 * Detects placeholder / 'see elsewhere' text Gemini sometimes returns in
 * a primer / topcoat / colour field instead of a real product name —
 * 'Varies per item/service', 'Refer to Tables 12-1 and 12-2', 'TBC',
 * 'See Section 4', 'N/A'. These aren't useful in the chip / pill display
 * and pollute productDescriptors so the summary fallback never fires.
 */
function isPlaceholderText(value: string): boolean {
  const trimmed = value.trim();
  return /^(varies|refer to|see (table|section|figure|spec|appendix|note)|tbc|tba|tbd|n\/?a|to be (advised|confirmed|determined))/i.test(
    trimmed,
  );
}

function describeSystem(systemKey: string, system: Record<string, unknown>): string | null {
  const productParts: string[] = [];
  for (const [k, v] of entries(system)) {
    if (!isString(v) || v.trim().length === 0) continue;
    if (/Microns?$/i.test(k)) continue;
    if (!PRODUCT_PREFIX_PATTERN.test(k)) continue;
    if (isPlaceholderText(v)) continue;
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
  // When the system was an array element with a 'type' field ('Stoncor',
  // 'Corrocoat', 'Generic System'), use that as the label since systemKey
  // is empty. Strip a trailing ' System' so we get 'Stoncor' not
  // 'Stoncor System'.
  const typeRaw = isString(system.type) ? (system.type as string).trim() : null;
  const typeFromSystem = typeRaw ? typeRaw.replace(/\s+system\s*$/i, "").trim() : null;
  const labelText = matchOne ?? matchTwo ?? typeFromSystem ?? "";
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

/**
 * Record the lining bore + flange-face thicknesses called out for one
 * drawing item, keyed by its liningType. First non-null value across all
 * items using the same liningType wins — signed drawings should be
 * internally consistent. If the drawing only states a single bore-only
 * value (`liningThicknessMm`) the flange-face stays null and the consumer
 * treats null as "same as bore", which matches how blanket "Lining: 6mm"
 * callouts are intended to read.
 */
function rememberLiningThickness(
  overrides: Map<string, { boreMm: number | null; flangeMm: number | null }>,
  item: Record<string, unknown>,
): void {
  const liningType = item.liningType;
  if (!isString(liningType) || liningType.length === 0) return;
  const key = normaliseCode(liningType);
  const current = overrides.get(key) ?? { boreMm: null, flangeMm: null };
  const bore = item.liningThicknessMm;
  if (current.boreMm === null && isNumber(bore) && Number.isFinite(bore)) {
    current.boreMm = bore;
  }
  const flange = item.liningFlangeFaceThicknessMm;
  if (current.flangeMm === null && isNumber(flange) && Number.isFinite(flange)) {
    current.flangeMm = flange;
  }
  overrides.set(key, current);
}

/**
 * Record the explicit CORROSION INT. / CORROSION EXT. callouts a drawing
 * prints for one item, keyed by its coatingSystem code (R1, R2a, …). First
 * non-null value across all items using the same code wins — drawings
 * should be internally consistent. Both descriptions are stored as the
 * verbatim text Gemini captured; downstream we collapse them into a
 * single "Internal: … | External: …" summary that replaces the spec-PDF
 * interpretation.
 */
function rememberCoatingDescription(
  overrides: Map<string, { internal: string | null; external: string | null }>,
  item: Record<string, unknown>,
): void {
  const code = item.coatingSystem;
  if (!isString(code) || code.length === 0) return;
  const internalRaw = item.internalCoatingDescription;
  const externalRaw = item.externalCoatingDescription;
  const internal =
    isString(internalRaw) && internalRaw.trim().length > 0 ? internalRaw.trim() : null;
  const external =
    isString(externalRaw) && externalRaw.trim().length > 0 ? externalRaw.trim() : null;
  if (internal === null && external === null) return;
  const key = normaliseCode(code);
  const current = overrides.get(key) ?? { internal: null, external: null };
  if (current.internal === null && internal !== null) current.internal = internal;
  if (current.external === null && external !== null) current.external = external;
  overrides.set(key, current);
}

/**
 * Build a drawing-derived summary that replaces the spec-PDF resolution of
 * a coating code when the drawing prints explicit CORROSION INT. /
 * CORROSION EXT. text. The drawing is the contractual document and
 * supersedes anything the spec PDF would have inferred for the code (see
 * [[signed-drawings-override]] memory).
 *
 * Format: "Internal: <int-text> | External: <ext-text>". When only one
 * side is captured, only that side is emitted. Returns null when the
 * drawing supplied no INT/EXT text at all (caller should keep the
 * spec-PDF summary in that case).
 */
function mergeCoatingDescriptionIntoSummary(
  _existingSummary: string | null,
  override: { internal: string | null; external: string | null },
): string | null {
  const parts: string[] = [];
  if (override.internal !== null) parts.push(`Internal: ${override.internal}`);
  if (override.external !== null) parts.push(`External: ${override.external}`);
  if (parts.length === 0) return null;
  return parts.join(" | ");
}

/**
 * Build the productDescriptors string the coating override-rebuild reads
 * (see defaultSuppliersForSpec / parseSuppliersFromCoating in
 * quoteSpecOverrides.ts). The parser splits on ' • ' and reads "Brand:
 * Description" — so emitting "Internal: <int> • External: <ext>" makes
 * the auto-rebuilt supplier list carry two rows labelled "Internal" and
 * "External" with the drawing's verbatim text as the description.
 *
 * Returns null when no override text is present so the caller can keep
 * the spec-PDF descriptors.
 */
function buildCoatingProductDescriptors(override: {
  internal: string | null;
  external: string | null;
}): string | null {
  const parts: string[] = [];
  if (override.internal !== null) parts.push(`Internal: ${override.internal}`);
  if (override.external !== null) parts.push(`External: ${override.external}`);
  if (parts.length === 0) return null;
  return parts.join(" • ");
}

/**
 * Classifies which face(s) a coating override targets, so downstream
 * area math knows whether to bill external only or external + internal.
 * "both" is the case Andrew flagged on 2026-05-15 — R2a items where the
 * drawing prints PLASITE on both CORROSION INT. and CORROSION EXT.
 */
function coatingSidesFromOverride(override: {
  internal: string | null;
  external: string | null;
}): "external" | "both" | "internal" | null {
  const hasInternal = override.internal !== null && !isNoneSentinel(override.internal);
  const hasExternal = override.external !== null && !isNoneSentinel(override.external);
  if (hasInternal && hasExternal) return "both";
  if (hasExternal) return "external";
  if (hasInternal) return "internal";
  return null;
}

/**
 * Drawings sometimes print "NONE", "UNLINED", "UNCOATED", "—" on a
 * CORROSION INT/EXT line to explicitly mean "no treatment this face".
 * The text is captured verbatim for traceability, but for area-math
 * purposes the face must be treated as uncoated (NOT charged).
 */
function isNoneSentinel(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  return /^(none|no\s+coating|uncoated|unlined|n\/?a|—|-)$/.test(trimmed);
}

/**
 * Replace the bore / flange-face thickness prefix of a spec-PDF summary
 * with the drawing-derived values, keeping the rest of the summary text
 * intact. The original summary typically looks like
 *
 *   "6 mm bore, 3 mm flange face, hot-bonded, autoclave vulcanised, red"
 *
 * and the drawings might override that with bore=6, flange=6 — yielding
 *
 *   "6 mm bore, 6 mm flange, hot-bonded, autoclave vulcanised, red"
 *
 * When the drawings only supply a bore value, the flange-face value
 * inherits from the bore (matches the "Lining: 6mm" blanket convention).
 * If the original summary doesn't contain a bore/flange prefix at all,
 * the override is prepended.
 */
function mergeLiningThicknessIntoSummary(
  summary: string | null,
  override: { boreMm: number | null; flangeMm: number | null },
): string | null {
  if (override.boreMm === null && override.flangeMm === null) return summary;
  const boreMm = override.boreMm;
  const flangeMm = override.flangeMm !== null ? override.flangeMm : override.boreMm;
  const newPrefixParts: string[] = [];
  if (boreMm !== null) newPrefixParts.push(`${boreMm} mm bore`);
  if (flangeMm !== null) newPrefixParts.push(`${flangeMm} mm flange`);
  const newPrefix = newPrefixParts.join(", ");
  if (!summary || summary.trim().length === 0) return newPrefix;
  const stripped = stripLiningThicknessPrefix(summary);
  return stripped.length > 0 ? `${newPrefix}, ${stripped}` : newPrefix;
}

/**
 * Remove leading "X mm bore" / "Y mm flange" / "Y mm flange face" tokens
 * from a spec-PDF summary string so we can substitute drawing-derived
 * values in front of the remaining descriptive text. Tolerates either
 * order, optional whitespace, and the "flange" vs "flange face" wording
 * variants spec PDFs use interchangeably.
 */
function stripLiningThicknessPrefix(summary: string): string {
  const tokens = summary
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  const remaining = tokens.filter(
    (token) => !/^\d+(?:\.\d+)?\s*mm\s*(?:bore|flange(?:\s+face)?)\b/i.test(token),
  );
  return remaining.join(", ");
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
