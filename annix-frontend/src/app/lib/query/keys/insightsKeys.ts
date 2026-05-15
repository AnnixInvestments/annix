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
  paperSnapshots: (slug: string, limit?: number) =>
    ["insights", "paper-portfolios", slug, "snapshots", limit ?? "default"] as const,
  signalsLatest: () => ["insights", "signals", "latest"] as const,
  signalHistory: (symbol: string, limit?: number) =>
    ["insights", "signals", symbol, "history", limit ?? "default"] as const,
  paperDecisionsToday: (slug: string) =>
    ["insights", "paper-portfolios", slug, "decisions", "today"] as const,
  cronStatus: () => ["insights", "admin", "cron-status"] as const,
  news: (params: { limit?: number; offset?: number; symbol?: string }) => {
    const limit = params.limit;
    const offset = params.offset;
    const symbol = params.symbol;
    return ["insights", "news", limit ?? "default", offset ?? 0, symbol ?? "all"] as const;
  },
  macroToday: () => ["insights", "macro", "today"] as const,
  macroHistory: (limit?: number) => ["insights", "macro", "history", limit ?? "default"] as const,
} as const;
