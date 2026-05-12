export const insightsKeys = {
  all: ["insights"] as const,
  watchlist: () => ["insights", "watchlist"] as const,
  asset: (symbol: string) => ["insights", "asset", symbol] as const,
  assetHistory: (symbol: string, fromIsoDate?: string) =>
    ["insights", "asset", symbol, "history", fromIsoDate ?? "all"] as const,
  historyCount: (symbol: string) => ["insights", "asset", symbol, "history-count"] as const,
  paperPortfolios: () => ["insights", "paper-portfolios"] as const,
  paperPortfolio: (slug: string) => ["insights", "paper-portfolios", slug] as const,
  paperHoldings: (slug: string) => ["insights", "paper-portfolios", slug, "holdings"] as const,
  paperTrades: (slug: string, limit?: number) =>
    ["insights", "paper-portfolios", slug, "trades", limit ?? "default"] as const,
} as const;
