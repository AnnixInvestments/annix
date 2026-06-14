"use client";

import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { metricsApi } from "@/app/lib/api/metricsApi";

const CATEGORY = "orbit-recruiter-assist";
// Constant fallbacks only when there's no learned history; the real
// estimate comes from the rolling average so the popup sharpens over
// time (issue #362 phase 5 / CLAUDE.md long-running-ops rule).
const FALLBACK_MS: Record<string, number> = {
  "find-candidates": 12000,
  "compliance-gap": 9000,
};

export function useOrbitAssistantProgress() {
  const { showExtraction, hideExtraction } = useExtractionProgress();

  const run = async <T>(operation: string, label: string, fn: () => Promise<T>): Promise<T> => {
    const fallback = FALLBACK_MS[operation];
    let estimatedDurationMs = fallback ?? 10000;
    try {
      const stats = await metricsApi.extractionStats(CATEGORY, operation);
      const avg = stats.averageMs;
      if (avg && avg > 0) {
        estimatedDurationMs = avg;
      }
    } catch {
      // No stats yet — keep the constant fallback estimate.
    }
    showExtraction({ brand: "annix-orbit", label, estimatedDurationMs, backgroundSafe: true });
    try {
      return await fn();
    } finally {
      hideExtraction();
    }
  };

  return { run };
}
