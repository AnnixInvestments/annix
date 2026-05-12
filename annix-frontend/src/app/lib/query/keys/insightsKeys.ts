export const insightsKeys = {
  all: ["insights"] as const,
  watchlist: () => ["insights", "watchlist"] as const,
  asset: (symbol: string) => ["insights", "asset", symbol] as const,
  assetHistory: (symbol: string, fromIsoDate?: string) =>
    ["insights", "asset", symbol, "history", fromIsoDate ?? "all"] as const,
  historyCount: (symbol: string) => ["insights", "asset", symbol, "history-count"] as const,
} as const;
