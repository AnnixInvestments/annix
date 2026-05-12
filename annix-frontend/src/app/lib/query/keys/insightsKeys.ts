export const insightsKeys = {
  all: ["insights"] as const,
  watchlist: () => ["insights", "watchlist"] as const,
  asset: (symbol: string) => ["insights", "asset", symbol] as const,
} as const;
