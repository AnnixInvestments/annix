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
  const flattened: QuoteItem[] = [];
  for (const extraction of drawingExtractions) {
    const items = extraction.extractedItems;
    if (!isArray(items)) continue;
    for (const raw of items as unknown[]) {
      if (!raw || !isObject(raw)) continue;
      const item = raw as Record<string, unknown>;
      flattened.push({
        mark: stringField(item, ["itemNumber", "mark"]) ?? "",
        description: stringField(item, ["description"]) ?? "",
        itemType: stringField(item, ["itemType"]),
        quantity: numberField(item, ["quantity"]) ?? 0,
        diameter: numberField(item, ["diameter"]),
        wallThickness: numberField(item, ["wallThickness"]),
        schedule: stringField(item, ["schedule"]),
        length: numberField(item, ["length"]),
        flangeConfig: stringField(item, ["flangeConfig"]),
        coating: stringField(item, ["coatingSystem"]),
        lining: stringField(item, ["liningType"]),
        materialClass: stringField(item, ["materialClass"]),
        sourceExtractionId: extraction.id,
      });
    }
  }

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
