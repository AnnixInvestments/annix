"use client";

import { useCallback } from "react";
import {
  type ExtractionBrand,
  useExtractionProgress,
} from "@/app/components/ExtractionProgressModal";
import { metricsApi } from "@/app/lib/api/metricsApi";
import { nowMillis } from "@/app/lib/datetime";

export interface AdaptiveBulkRunOptions<TItem> {
  brand: ExtractionBrand;
  metricCategory: string;
  metricOperation?: string;
  items: TItem[];
  itemId: (item: TItem) => string | number;
  itemLabel?: (item: TItem, index: number, total: number) => string;
  fallbackPerItemMs?: number;
  perItemDelayMs?: number;
  run: (item: TItem) => Promise<void>;
}

export interface AdaptiveBulkRunResult<TItem> {
  succeeded: TItem[];
  failed: { item: TItem; error: unknown }[];
  totalElapsedMs: number;
}

const DEFAULT_FALLBACK_PER_ITEM_MS = 60_000;

export function useAdaptiveExtractionProgress() {
  const { showExtraction, hideExtraction, updateExtraction } = useExtractionProgress();

  const runBulk = useCallback(
    async <TItem,>(opts: AdaptiveBulkRunOptions<TItem>): Promise<AdaptiveBulkRunResult<TItem>> => {
      const total = opts.items.length;
      const rawFallback = opts.fallbackPerItemMs;
      const fallback = rawFallback || DEFAULT_FALLBACK_PER_ITEM_MS;
      const rawInterItemDelay = opts.perItemDelayMs;
      const interItemDelay = rawInterItemDelay || 0;
      const rawMetricOperation = opts.metricOperation;
      const metricOperation = rawMetricOperation || "";

      const stats = await metricsApi
        .extractionStats(opts.metricCategory, metricOperation)
        .catch(() => null);
      const rawStatsAverageMs = stats ? stats.averageMs : null;
      const initialPerItemMs = rawStatsAverageMs || fallback;

      const labelFor = (item: TItem, index: number) =>
        opts.itemLabel
          ? opts.itemLabel(item, index, total)
          : `Processing ${index + 1} of ${total}…`;

      const runStartedAt = nowMillis();
      showExtraction({
        brand: opts.brand,
        label: total > 0 ? labelFor(opts.items[0], 0) : "Working…",
        estimatedDurationMs: initialPerItemMs * total,
        itemCount: total,
      });

      const succeeded: TItem[] = [];
      const failed: { item: TItem; error: unknown }[] = [];

      const finalCount = await opts.items.reduce(
        (chain, item, index) =>
          chain.then(async (currentDone) => {
            updateExtraction({ label: labelFor(item, index) });
            try {
              await opts.run(item);
              succeeded.push(item);
            } catch (error) {
              failed.push({ item, error });
            }
            const itemsDone = currentDone + 1;
            if (itemsDone < total) {
              const elapsedSoFar = nowMillis() - runStartedAt;
              const avgPerItemMs = elapsedSoFar / itemsDone;
              const projectedTotalMs = avgPerItemMs * total;
              updateExtraction({ estimatedDurationMs: projectedTotalMs });
              if (interItemDelay > 0) {
                await new Promise((resolve) => globalThis.setTimeout(resolve, interItemDelay));
              }
            }
            return itemsDone;
          }),
        Promise.resolve(0) as Promise<number>,
      );

      hideExtraction();

      return {
        succeeded,
        failed,
        totalElapsedMs: nowMillis() - runStartedAt,
      };
    },
    [showExtraction, hideExtraction, updateExtraction],
  );

  return { runBulk };
}
