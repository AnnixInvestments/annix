import { isArray, isNumber, isObject, isString } from "es-toolkit/compat";
import type { ResolvedCode, SpecLookup } from "@/app/lib/nix/components/draft";
import type { NixExtractionSummary } from "@/app/lib/query/hooks";

/**
 * One item line as it'll appear inside a quote pool. Mirrors the drawing
 * row but flattened so the QuoteView component can render uniformly
 * regardless of which extraction the item came from.
 */
export interface QuoteItem {
  mark: string;
  description: string;
  itemType: string | null;
  quantity: number;
  diameter: number | null;
  wallThickness: number | null;
  schedule: string | null;
  length: number | null;
  flangeConfig: string | null;
  coating: string | null;
  lining: string | null;
  materialClass: string | null;
  /** id of the originating NixExtraction, for traceability. */
  sourceExtractionId: number;
}

/**
 * One pool of items that share the same (coating, lining) spec signature.
 * The header row is rendered above; each item is a row in the pool's
 * table; the footer states 'All above items require: ...' resolving the
 * coating + lining via the shared spec lookup.
 */
export interface QuotePool {
  /** Stable key for React, computed from the spec signature. */
  key: string;
  coating: string | null;
  lining: string | null;
  coatingResolved: ResolvedCode | null;
  liningResolved: ResolvedCode | null;
  items: QuoteItem[];
  /** True when both coating and lining are absent — Polymer-app won't quote these. */
  isNoScope: boolean;
}

/**
 * Walks every drawing extraction in a session, flattens its extracted_items
 * into QuoteItem rows, and groups them by (coating, lining) signature.
 *
 * Material class and flange config differences within a pool stay on the
 * individual rows — only coating + lining drive the pooling because that's
 * what dictates the painting / lining shop's scope of work. The user's
 * Polymer Lining business cares about 'do these items get painted with R1
 * + lined with Linatex Linard 60' — material grade and flange end-config
 * are quoted per-item alongside the dimensions.
 *
 * Pool order = first-appearance order of the signature in the items list.
 * Items inside a pool keep their original drawing order so the spool
 * sequence reads sensibly to the customer reading the quote.
 *
 * The 'no-scope' pool (no coating, no lining) is always last in the
 * returned array so the caller can split it off cleanly into a footnote.
 */
export function poolItemsBySpec(
  drawingExtractions: NixExtractionSummary[],
  specLookup: SpecLookup,
): QuotePool[] {
  // Process newest-first so when a revision uploads the same marks as an
  // older drawing, the newer copy wins and the older copy is dropped as a
  // duplicate. Signature = mark + diameter + length + wallThickness +
  // flangeConfig — true revisions match all five; coincidental mark
  // collisions across unrelated drawings won't.
  const sortedExtractions = [...drawingExtractions].sort((a, b) => {
    const aCreated = a.createdAt ? a.createdAt : "";
    const bCreated = b.createdAt ? b.createdAt : "";
    return bCreated.localeCompare(aCreated);
  });

  const flattened: QuoteItem[] = [];
  const seenSignatures = new Set<string>();
  for (const extraction of sortedExtractions) {
    const items = extraction.extractedItems;
    if (!isArray(items)) continue;
    for (const raw of items as unknown[]) {
      if (!raw || !isObject(raw)) continue;
      const item = raw as Record<string, unknown>;
      const mark = stringField(item, ["itemNumber", "mark"]) ?? "";
      const diameter = numberField(item, ["diameter"]);
      const length = numberField(item, ["length"]);
      const wt = numberField(item, ["wallThickness"]);
      const flange = stringField(item, ["flangeConfig"]);
      const signature =
        mark.length > 0
          ? `${mark}|${diameter ?? ""}|${length ?? ""}|${wt ?? ""}|${flange ?? ""}`
          : "";
      // Only dedup when the item has a mark — items without marks can't be
      // confidently identified as the "same" item across extractions.
      if (signature.length > 0 && seenSignatures.has(signature)) continue;
      if (signature.length > 0) seenSignatures.add(signature);
      flattened.push({
        mark,
        description: stringField(item, ["description"]) ?? "",
        itemType: stringField(item, ["itemType"]),
        quantity: numberField(item, ["quantity"]) ?? 0,
        diameter,
        wallThickness: wt,
        schedule: stringField(item, ["schedule"]),
        length,
        flangeConfig: flange,
        coating: stringField(item, ["coatingSystem"]),
        lining: stringField(item, ["liningType"]),
        materialClass: stringField(item, ["materialClass"]),
        sourceExtractionId: extraction.id,
      });
    }
  }

  // Re-sort to keep the natural item order: group by source extraction
  // (newest first since that's the canonical revision), and within an
  // extraction sort marks numerically so -01, -02, ..., -16 read in order
  // for the customer-facing quote.
  flattened.sort((a, b) => {
    if (a.sourceExtractionId !== b.sourceExtractionId) {
      return b.sourceExtractionId - a.sourceExtractionId;
    }
    const numA = Number.parseInt(a.mark.replace(/[^0-9]/g, ""), 10);
    const numB = Number.parseInt(b.mark.replace(/[^0-9]/g, ""), 10);
    if (Number.isFinite(numA) && Number.isFinite(numB)) return numA - numB;
    return a.mark.localeCompare(b.mark);
  });

  const pools = new Map<string, QuotePool>();
  for (const item of flattened) {
    const itemCoating = item.coating;
    const itemLining = item.lining;
    const coatingKey = itemCoating ? itemCoating : "";
    const liningKey = itemLining ? itemLining : "";
    const key = `${coatingKey}||${liningKey}`;
    const existing = pools.get(key);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    pools.set(key, {
      key,
      coating: itemCoating,
      lining: itemLining,
      coatingResolved: specLookup.resolve(itemCoating),
      liningResolved: specLookup.resolve(itemLining),
      items: [item],
      isNoScope: !itemCoating && !itemLining,
    });
  }

  const all = Array.from(pools.values());
  const scoped = all.filter((p) => !p.isNoScope);
  const noScope = all.filter((p) => p.isNoScope);
  return [...scoped, ...noScope];
}

/**
 * Returns one row per older drawing extraction whose items are wholly or
 * partially superseded by a newer one in the same session, based on the
 * same signature poolItemsBySpec uses for dedup. UI uses this to surface
 * a "skipped X items from older revisions" banner so the deduplication
 * isn't silent.
 */
export interface SupersededExtractionSummary {
  /** id of the older extraction that lost items. */
  extractionId: number;
  documentName: string;
  /** Item count in that extraction that was suppressed by a newer copy. */
  skippedCount: number;
  /** Names of the newer documents that took precedence (deduped list). */
  supersededBy: string[];
}

export function findSupersededByDedup(
  drawingExtractions: NixExtractionSummary[],
): SupersededExtractionSummary[] {
  const sorted = [...drawingExtractions].sort((a, b) => {
    const aCreated = a.createdAt ? a.createdAt : "";
    const bCreated = b.createdAt ? b.createdAt : "";
    return bCreated.localeCompare(aCreated);
  });
  const sigToExtraction = new Map<string, NixExtractionSummary>();
  const skipsByExtraction = new Map<number, SupersededExtractionSummary>();
  for (const extraction of sorted) {
    const items = extraction.extractedItems;
    if (!isArray(items)) continue;
    for (const raw of items as unknown[]) {
      if (!raw || !isObject(raw)) continue;
      const item = raw as Record<string, unknown>;
      const mark = stringField(item, ["itemNumber", "mark"]) ?? "";
      if (mark.length === 0) continue;
      const diameter = numberField(item, ["diameter"]);
      const length = numberField(item, ["length"]);
      const wt = numberField(item, ["wallThickness"]);
      const flange = stringField(item, ["flangeConfig"]);
      const signature = `${mark}|${diameter ?? ""}|${length ?? ""}|${wt ?? ""}|${flange ?? ""}`;
      const owner = sigToExtraction.get(signature);
      if (owner) {
        let row = skipsByExtraction.get(extraction.id);
        if (!row) {
          row = {
            extractionId: extraction.id,
            documentName: extraction.documentName,
            skippedCount: 0,
            supersededBy: [],
          };
          skipsByExtraction.set(extraction.id, row);
        }
        row.skippedCount += 1;
        if (!row.supersededBy.includes(owner.documentName)) {
          row.supersededBy.push(owner.documentName);
        }
        continue;
      }
      sigToExtraction.set(signature, extraction);
    }
  }
  return Array.from(skipsByExtraction.values());
}

function stringField(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (isString(v) && v.trim().length > 0) return v.trim();
  }
  return null;
}

function numberField(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (isNumber(v) && Number.isFinite(v)) return v;
    if (isString(v)) {
      const parsed = Number.parseFloat(v);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}
