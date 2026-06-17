// Per-model Gemini pricing so ai_usage_logs can show estimated USD cost per
// feature in-app. Rates are USD per 1,000,000 tokens and are point-in-time
// estimates (Google AI "paid tier", mid-2026) — the stored costUsd is what a
// call cost under these rates at log time, not a live billing figure. Output
// tokens include thinking tokens, which Gemini bills as output.

export interface ModelRate {
  inputPerMillion: number;
  outputPerMillion: number;
}

const GEMINI_RATES: Record<string, ModelRate> = {
  "gemini-2.5-pro": { inputPerMillion: 1.25, outputPerMillion: 10.0 },
  "gemini-2.5-flash": { inputPerMillion: 0.3, outputPerMillion: 2.5 },
  "gemini-2.5-flash-lite": { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  "gemini-2.0-flash": { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  "gemini-embedding-001": { inputPerMillion: 0.15, outputPerMillion: 0 },
};

// Unknown models fall back to Flash rates so cost is never silently zero.
const FALLBACK_RATE: ModelRate = GEMINI_RATES["gemini-2.5-flash"];

export function rateForModel(model: string | null | undefined): ModelRate {
  if (!model) {
    return FALLBACK_RATE;
  }
  const exact = GEMINI_RATES[model];
  if (exact) {
    return exact;
  }
  const prefixMatch = Object.keys(GEMINI_RATES).find((key) => model.startsWith(key));
  return prefixMatch ? GEMINI_RATES[prefixMatch] : FALLBACK_RATE;
}

// Estimated USD cost of a single call. When only a total token count is known
// (older callers that never split input/output), bill the whole total at the
// output rate so cost is over- rather than under-stated.
export function estimateAiCostUsd(
  model: string | null | undefined,
  inputTokens: number | null | undefined,
  outputTokens: number | null | undefined,
  totalTokens: number | null | undefined,
): number {
  const rate = rateForModel(model);
  const input = inputTokens ?? null;
  const output = outputTokens ?? null;
  if (input === null && output === null) {
    const total = totalTokens ?? 0;
    return (total / 1_000_000) * rate.outputPerMillion;
  }
  const inputCost = ((input ?? 0) / 1_000_000) * rate.inputPerMillion;
  const outputCost = ((output ?? 0) / 1_000_000) * rate.outputPerMillion;
  return inputCost + outputCost;
}
