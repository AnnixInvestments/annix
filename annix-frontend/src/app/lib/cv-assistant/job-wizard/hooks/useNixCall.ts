"use client";

import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { metricsApi } from "@/app/lib/api/metricsApi";

const FALLBACK_PER_CALL_MS = 12_000;

export interface UseNixCallOptions<TInput, TOutput> {
  /** Metric operation name — must match what the backend records (e.g. "description"). */
  operation: string;
  /** Friendly label for the modal (e.g. "Drafting your description…"). */
  label: string;
  /** The actual API call to invoke. */
  fn: (input: TInput) => Promise<TOutput>;
  /** When true, skip the modal entirely (used for very fast Nix calls like title-suggestions). */
  silent?: boolean;
}

export type NixCallResult<TInput, TOutput> = UseMutationResult<TOutput, Error, TInput>;

/**
 * Wraps a Nix mutation in the centred branded ExtractionProgressModal,
 * pulling the average duration from the backend stats endpoint up-front
 * so the initial estimate is calibrated to recent reality (per CLAUDE.md
 * long-running operations rule).
 *
 * Single-shot wrapper: this is the right tool for one-off Nix calls.
 * For per-item bulk loops use useAdaptiveExtractionProgress() instead.
 */
export function useNixCall<TInput, TOutput>(
  opts: UseNixCallOptions<TInput, TOutput>,
): NixCallResult<TInput, TOutput> {
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const { operation, label, fn, silent } = opts;

  const wrapped = useCallback(
    async (input: TInput): Promise<TOutput> => {
      if (silent) {
        return fn(input);
      }
      const stats = await metricsApi
        .extractionStats("cv-assistant-nix", operation)
        .catch(() => null);
      const avg = stats ? stats.averageMs : null;
      const estimatedDurationMs = avg && avg > 0 ? avg : FALLBACK_PER_CALL_MS;

      showExtraction({
        brand: "cv-assistant",
        label,
        estimatedDurationMs,
      });
      try {
        return await fn(input);
      } finally {
        hideExtraction();
      }
    },
    [silent, operation, label, fn, showExtraction, hideExtraction],
  );

  return useMutation<TOutput, Error, TInput>({
    mutationFn: wrapped,
  });
}
