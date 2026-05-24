"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useState } from "react";

export type ExtractionBrand =
  | "au-rubber"
  | "stock-control"
  | "rfq"
  | "annix-sentinel"
  | "fieldflow"
  | "annix-rep"
  | "annix-orbit"
  | "teacher-assistant"
  | "insights";

export interface ExtractionBatchContext {
  // 1-based index of the document currently extracting within the
  // batch (e.g. 3 of 12).
  currentIndex: number;
  // Total documents in this batch.
  total: number;
  // Epoch ms when the batch started. Drives "Xs elapsed" on the
  // batch-level bar.
  startedAt: number;
  // Estimated per-document duration in ms (averaged across the
  // queued types). Drives "~Ys left" on the batch-level bar.
  avgPerDocMs: number;
}

export interface ShowExtractionOptions {
  brand: ExtractionBrand;
  label: string;
  estimatedDurationMs: number;
  itemCount?: number;
  // When set, the modal renders a second progress bar below the
  // current-document one showing overall batch progress + ETA. Only
  // surfaced when `batch.total > 1`.
  batch?: ExtractionBatchContext;
}

export interface ExtractionState extends ShowExtractionOptions {
  startedAt: number;
}

interface ExtractionProgressContextValue {
  showExtraction: (opts: ShowExtractionOptions) => void;
  hideExtraction: () => void;
  updateExtraction: (patch: Partial<ShowExtractionOptions>) => void;
}

const ExtractionProgressContext = createContext<ExtractionProgressContextValue>({
  showExtraction: () => {},
  hideExtraction: () => {},
  updateExtraction: () => {},
});

export function useExtractionProgress(): ExtractionProgressContextValue {
  return useContext(ExtractionProgressContext);
}

export async function withExtractionProgress<T>(
  ctx: ExtractionProgressContextValue,
  opts: ShowExtractionOptions,
  fn: () => Promise<T>,
): Promise<T> {
  ctx.showExtraction(opts);
  try {
    return await fn();
  } finally {
    ctx.hideExtraction();
  }
}

// The modal UI — and its luxon dependency — is a separate chunk loaded
// only when an extraction is actually running. Most routes (including the
// public marketing site) never trigger one, so they never download it.
const ExtractionProgressModalView = dynamic(() => import("./ExtractionProgressModalView"), {
  ssr: false,
});

export function ExtractionProgressProvider(props: { children: React.ReactNode }) {
  const { children } = props;
  const [state, setState] = useState<ExtractionState | null>(null);

  const showExtraction = useCallback((opts: ShowExtractionOptions) => {
    // eslint-disable-next-line no-restricted-globals, no-restricted-syntax -- raw epoch-ms stamp, not a formatted date; keeps luxon out of this always-loaded provider
    setState({ ...opts, startedAt: Date.now() });
  }, []);

  const hideExtraction = useCallback(() => {
    setState(null);
  }, []);

  const updateExtraction = useCallback((patch: Partial<ShowExtractionOptions>) => {
    setState((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  return (
    <ExtractionProgressContext.Provider
      value={{ showExtraction, hideExtraction, updateExtraction }}
    >
      {children}
      {state && <ExtractionProgressModalView state={state} />}
    </ExtractionProgressContext.Provider>
  );
}
