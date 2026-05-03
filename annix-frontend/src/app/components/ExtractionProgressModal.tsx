"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { nowMillis } from "@/app/lib/datetime";

export type ExtractionBrand =
  | "au-rubber"
  | "stock-control"
  | "rfq"
  | "comply-sa"
  | "fieldflow"
  | "annix-rep"
  | "cv-assistant"
  | "teacher-assistant";

interface BrandStyle {
  label: string;
  bar: string;
  bg: string;
  text: string;
  logo: string | null;
}

const BRAND_STYLES: Record<ExtractionBrand, BrandStyle> = {
  "au-rubber": {
    label: "AU Rubber",
    bar: "bg-orange-500",
    bg: "bg-orange-50",
    text: "text-orange-700",
    logo: "/au-industries/logo.jpg",
  },
  "stock-control": {
    label: "Stock Control",
    bar: "bg-red-700",
    bg: "bg-red-50",
    text: "text-red-700",
    logo: null,
  },
  rfq: {
    label: "RFQ",
    bar: "bg-blue-600",
    bg: "bg-blue-50",
    text: "text-blue-700",
    logo: null,
  },
  "comply-sa": {
    label: "Comply SA",
    bar: "bg-emerald-600",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    logo: null,
  },
  fieldflow: {
    label: "FieldFlow",
    bar: "bg-cyan-600",
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    logo: null,
  },
  "annix-rep": {
    label: "Annix Rep",
    bar: "bg-violet-600",
    bg: "bg-violet-50",
    text: "text-violet-700",
    logo: null,
  },
  "cv-assistant": {
    label: "CV Assistant",
    bar: "bg-pink-600",
    bg: "bg-pink-50",
    text: "text-pink-700",
    logo: null,
  },
  "teacher-assistant": {
    label: "Teacher Assistant",
    bar: "bg-amber-600",
    bg: "bg-amber-50",
    text: "text-amber-700",
    logo: null,
  },
};

export interface ShowExtractionOptions {
  brand: ExtractionBrand;
  label: string;
  estimatedDurationMs: number;
  itemCount?: number;
}

interface ExtractionState extends ShowExtractionOptions {
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

export function ExtractionProgressProvider(props: { children: React.ReactNode }) {
  const { children } = props;
  const [state, setState] = useState<ExtractionState | null>(null);

  const showExtraction = useCallback((opts: ShowExtractionOptions) => {
    setState({ ...opts, startedAt: nowMillis() });
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
      <ExtractionProgressModal state={state} />
    </ExtractionProgressContext.Provider>
  );
}

function ExtractionProgressModal(props: { state: ExtractionState | null }) {
  const { state } = props;
  const [tickMs, setTickMs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!state) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setTickMs(0);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTickMs(nowMillis() - state.startedAt);
    }, 200);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state]);

  if (!state) return null;
  const docRef = globalThis.document;
  if (!docRef) return null;

  const styles = BRAND_STYLES[state.brand];
  const totalMs = state.estimatedDurationMs;
  const elapsedMs = tickMs;
  const rawProgress = totalMs > 0 ? elapsedMs / totalMs : 0;
  const progress = Math.min(0.99, rawProgress);
  const percent = Math.round(progress * 100);
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const overran = elapsedMs > totalMs;
  const itemCount = state.itemCount;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
    >
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        <div className={`px-4 py-2 ${styles.bg} ${styles.text} flex items-center justify-between`}>
          <span className="flex items-center gap-2">
            {styles.logo ? (
              <img
                src={styles.logo}
                alt={`${styles.label} logo`}
                className="h-5 w-5 rounded-sm object-contain"
              />
            ) : null}
            <span className="text-xs font-semibold uppercase tracking-wide">{styles.label}</span>
          </span>
          <span className="text-[10px]">
            {elapsedSeconds}s elapsed
            {!overran && remainingSeconds > 0 ? ` · ~${remainingSeconds}s left` : ""}
          </span>
        </div>
        <div className="p-4">
          <p className="text-sm font-medium text-gray-900">{state.label}</p>
          {itemCount != null && (
            <p className="text-xs text-gray-500 mt-1">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          )}
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${styles.bar} transition-all`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-gray-500">
            {overran
              ? "Taking longer than estimated — still working…"
              : `${percent}% — please leave this window open`}
          </p>
        </div>
      </div>
    </div>,
    docRef.body,
  );
}
