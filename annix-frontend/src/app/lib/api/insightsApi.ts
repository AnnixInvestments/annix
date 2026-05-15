import { ApiError } from "./apiError";
import { createApiClient } from "./createApiClient";
import { insightsTokenStore } from "./portalTokenStores";

export type InsightsExchange =
  | "JSE"
  | "NYSE"
  | "NASDAQ"
  | "LSE"
  | "TSX"
  | "HKEX"
  | "TSE"
  | "SSE"
  | "ASX"
  | "COMMODITY"
  | "INDEX"
  | "FOREX";

export type InsightsAssetType =
  | "stock"
  | "etf"
  | "commodity"
  | "index"
  | "crypto"
  | "forex"
  | "leveraged_etf";

export type InsightsCurrency =
  | "ZAR"
  | "USD"
  | "GBP"
  | "EUR"
  | "JPY"
  | "CNY"
  | "AUD"
  | "CAD"
  | "HKD";

export interface AddWatchlistItemPayload {
  symbol: string;
  name: string;
  exchange: InsightsExchange;
  currency: InsightsCurrency;
  assetType: InsightsAssetType;
  sector?: string;
  notes?: string;
  targetReason?: string;
}

export interface WatchlistItemResponse {
  id: string;
  symbol: string;
  name: string;
  exchange: InsightsExchange;
  currency: InsightsCurrency;
  assetType: InsightsAssetType;
  sector: string | null;
  notes: string | null;
  targetReason: string | null;
  addedAt: string;
  sparkline: number[];
}

export interface InsightsLoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface InsightsAuthSuccess {
  accessToken: string;
  refreshToken: string;
}

export interface InsightsUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
}

interface DecodedJwt {
  sub: number;
  email?: string;
  username?: string;
  roles?: string[];
}

const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
const API_BASE = envApiUrl ?? "";
const INSIGHTS_ROLE = "insights";

const apiClient = createApiClient({
  baseURL: API_BASE,
  tokenStore: insightsTokenStore,
  refreshUrl: `${API_BASE}/auth/refresh`,
  onUnauthorized: () => insightsTokenStore.clear(),
});

function decodeJwt(token: string): DecodedJwt | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded =
      typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export const insightsApi = {
  async login(input: InsightsLoginInput): Promise<InsightsAuthSuccess> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: input.email, password: input.password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const serverMessage = body?.message;
      const message = serverMessage ?? "Invalid email or password";
      throw new ApiError({
        status: response.status,
        message,
        meta: body,
      });
    }

    const data = await response.json();
    const accessToken: string = data.access_token;
    const refreshToken: string = data.refresh_token;

    const decoded = decodeJwt(accessToken);
    const decodedRoles = decoded?.roles;
    const roles = decodedRoles ?? [];
    if (!roles.includes(INSIGHTS_ROLE)) {
      throw new ApiError({
        status: 403,
        message: "This account does not have access to Annix Insights.",
      });
    }

    const remember = input.rememberMe;
    const rememberMe = remember ?? false;
    insightsTokenStore.setTokens(accessToken, refreshToken, rememberMe);
    return { accessToken, refreshToken };
  },

  currentUser(): InsightsUser | null {
    const token = insightsTokenStore.accessToken();
    if (!token) return null;
    const decoded = decodeJwt(token);
    if (!decoded) return null;
    const decodedRoles = decoded.roles;
    const roles = decodedRoles ?? [];
    if (!roles.includes(INSIGHTS_ROLE)) return null;
    const decodedEmail = decoded.email;
    const email = decodedEmail ?? "";
    return {
      id: decoded.sub,
      email,
      firstName: null,
      lastName: null,
      roles,
    };
  },

  logout() {
    insightsTokenStore.clear();
  },

  macro: {
    today(): Promise<MacroSentimentSnapshot | null> {
      return apiClient.get<MacroSentimentSnapshot | null>("/insights/macro/today");
    },
    history(limit?: number): Promise<MacroSentimentSnapshot[]> {
      const params = limit ? `?limit=${limit}` : "";
      return apiClient.get<MacroSentimentSnapshot[]>(`/insights/macro/history${params}`);
    },
  },

  watchlist: {
    list(): Promise<WatchlistItemResponse[]> {
      return apiClient.get<WatchlistItemResponse[]>("/insights/watchlist");
    },
    add(payload: AddWatchlistItemPayload): Promise<WatchlistItemResponse> {
      return apiClient.post<WatchlistItemResponse>("/insights/watchlist", payload);
    },
    remove(id: string): Promise<void> {
      return apiClient.delete<void>(`/insights/watchlist/${id}`);
    },
  },

  assets: {
    history(symbol: string, fromIsoDate?: string): Promise<PriceBar[]> {
      const params = fromIsoDate ? `?from=${encodeURIComponent(fromIsoDate)}` : "";
      return apiClient.get<PriceBar[]>(
        `/insights/assets/${encodeURIComponent(symbol)}/history${params}`,
      );
    },
  },

  admin: {
    backfill(symbol: string, fromIsoDate?: string): Promise<BackfillResult> {
      const params = new URLSearchParams({ symbol });
      if (fromIsoDate) params.set("from", fromIsoDate);
      return apiClient.post<BackfillResult>(`/insights/admin/backfill?${params.toString()}`);
    },
    historyCount(symbol: string): Promise<{ symbol: string; rows: number }> {
      return apiClient.get<{ symbol: string; rows: number }>(
        `/insights/admin/history/${encodeURIComponent(symbol)}/count`,
      );
    },
    runFullCron(): Promise<{ accepted: boolean; alreadyRunning: boolean }> {
      return apiClient.post<{ accepted: boolean; alreadyRunning: boolean }>(
        "/insights/admin/cron/run",
      );
    },
    cronStatus(): Promise<CronRunStatusDto> {
      return apiClient.get<CronRunStatusDto>("/insights/admin/cron/status");
    },
  },

  signals: {
    latest(): Promise<SignalSnapshotResponse[]> {
      return apiClient.get<SignalSnapshotResponse[]>("/insights/signals/latest");
    },
    history(symbol: string, limit?: number): Promise<SignalSnapshotResponse[]> {
      const query = limit ? `?limit=${limit}` : "";
      return apiClient.get<SignalSnapshotResponse[]>(
        `/insights/signals/${encodeURIComponent(symbol)}/history${query}`,
      );
    },
  },

  news: {
    list(params?: {
      limit?: number;
      offset?: number;
      symbol?: string;
      status?: NewsExtractionStatus;
    }): Promise<{ items: NewsItemDto[]; total: number }> {
      const search = new URLSearchParams();
      if (params?.limit !== undefined) search.set("limit", String(params.limit));
      if (params?.offset !== undefined) search.set("offset", String(params.offset));
      if (params?.symbol) search.set("symbol", params.symbol);
      if (params?.status) search.set("status", params.status);
      const qs = search.toString();
      return apiClient.get<{ items: NewsItemDto[]; total: number }>(
        `/insights/news${qs ? `?${qs}` : ""}`,
      );
    },
  },

  paperPortfolios: {
    list(): Promise<PaperPortfolioSummary[]> {
      return apiClient.get<PaperPortfolioSummary[]>("/insights/paper-portfolios");
    },
    detail(slug: string): Promise<PaperPortfolioSummary> {
      return apiClient.get<PaperPortfolioSummary>(
        `/insights/paper-portfolios/${encodeURIComponent(slug)}`,
      );
    },
    holdings(slug: string): Promise<PaperHolding[]> {
      return apiClient.get<PaperHolding[]>(
        `/insights/paper-portfolios/${encodeURIComponent(slug)}/holdings`,
      );
    },
    trades(slug: string, limit?: number): Promise<PaperTrade[]> {
      const query = limit ? `?limit=${limit}` : "";
      return apiClient.get<PaperTrade[]>(
        `/insights/paper-portfolios/${encodeURIComponent(slug)}/trades${query}`,
      );
    },
    snapshots(slug: string, limit?: number): Promise<PaperPortfolioSnapshot[]> {
      const query = limit ? `?limit=${limit}` : "";
      return apiClient.get<PaperPortfolioSnapshot[]>(
        `/insights/paper-portfolios/${encodeURIComponent(slug)}/snapshots${query}`,
      );
    },
    decisionsToday(slug: string): Promise<PortfolioDecisionsPreview> {
      return apiClient.get<PortfolioDecisionsPreview>(
        `/insights/paper-portfolios/${encodeURIComponent(slug)}/decisions/today`,
      );
    },
    pause(slug: string): Promise<PaperPortfolioSummary> {
      return apiClient.post<PaperPortfolioSummary>(
        `/insights/paper-portfolios/${encodeURIComponent(slug)}/pause`,
      );
    },
    resume(slug: string): Promise<PaperPortfolioSummary> {
      return apiClient.post<PaperPortfolioSummary>(
        `/insights/paper-portfolios/${encodeURIComponent(slug)}/resume`,
      );
    },
  },
};

export interface BuyDecisionDto {
  action: "buy";
  portfolioSlug: PaperPortfolioSlug;
  assetId: string;
  symbol: string;
  assetName: string;
  qty: number;
  estimatedPrice: number;
  estimatedTradeValue: number;
  opportunityScore: number;
  riskScore: number;
  confidenceScore: number;
  adjustedScore: number;
  reasoning: string;
  ruleEvaluationTrace: string;
}

export interface SellDecisionDto {
  action: "sell";
  portfolioSlug: PaperPortfolioSlug;
  symbol: string;
  assetName: string;
  qty: number;
  estimatedPrice: number;
  estimatedTradeValue: number;
  opportunityScore: number;
  riskScore: number;
  confidenceScore: number;
  reasonCode: "confidence-dropped" | "stop-loss";
  reasoning: string;
  ruleEvaluationTrace: string;
}

export type DecisionDto = BuyDecisionDto | SellDecisionDto;

export interface PortfolioDecisionsPreview {
  portfolioSlug: PaperPortfolioSlug;
  decisions: DecisionDto[];
  skippedReasons: string[];
  evaluatedAt: string;
}

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number | null;
  volume: number | null;
}

export interface BackfillResult {
  symbol: string;
  inserted: number;
  skipped: number;
  earliestDate: string | null;
  latestDate: string | null;
}

export interface CronRunStatusDto {
  isRunning: boolean;
  currentRunStartedAt: string | null;
  lastRunStartedAt: string | null;
  lastRunFinishedAt: string | null;
  lastRunDurationMs: number | null;
  lastRunError: string | null;
}

export type NewsExtractionStatus = "pending" | "extracted" | "failed" | "skipped";
export type NewsImpactLevel = "low" | "medium" | "high";

export interface NewsItemDto {
  id: string;
  url: string;
  title: string;
  source: string | null;
  summary: string | null;
  relatedSymbols: string[];
  relatedThemes: string[];
  sentiment: number | null;
  impactLevel: NewsImpactLevel | null;
  shortTermImplication: string | null;
  mediumTermImplication: string | null;
  publishedAt: string | null;
  extractedAt: string | null;
  extractionStatus: NewsExtractionStatus;
  extractionError: string | null;
}

export type PaperPortfolioSlug =
  | "benchmark-spy"
  | "benchmark-jse40"
  | "signal-conservative"
  | "signal-balanced"
  | "signal-commodity-tilt"
  | "signal-very-high-risk"
  | "nix-pure"
  | "nix-hybrid"
  | "nix-picker";

export type PaperRiskProfile =
  | "buy-and-hold"
  | "conservative"
  | "balanced"
  | "commodity-tilt"
  | "very-high-risk";

export type PaperExecutorStrategy =
  | "buy-and-hold"
  | "rules"
  | "ai-pure"
  | "ai-override"
  | "ai-picker";

export interface PaperAllocationRules {
  maxPositions: number | null;
  maxPercentPerPosition: number | null;
  maxPercentPerSector: number | null;
  cashFloorPercent: number;
  confidenceFloor: number;
  sectorTilt?: { sectors: string[]; bonus: number };
  preferLeveragedEtfs?: boolean;
  fixedHolding?: { symbol: string };
}

export interface MacroBreakdownEntry {
  count: number;
  meanSentiment: number;
}

export interface MacroSentimentSnapshot {
  id: string;
  snapshotDate: string;
  overallScore: number;
  articleCount: number;
  highImpactCount: number;
  sectorBreakdown: Record<string, MacroBreakdownEntry>;
  commodityBreakdown: Record<string, MacroBreakdownEntry>;
  createdAt: string;
}

export interface PaperPortfolioSummary {
  id: string;
  slug: PaperPortfolioSlug;
  displayName: string;
  riskProfile: PaperRiskProfile;
  executorStrategy: PaperExecutorStrategy;
  currency: string;
  startingCapital: number;
  monthlyContribution: number;
  currentCashBalance: number;
  currentPortfolioValue: number;
  totalValue: number;
  holdingsCount: number;
  isActive: boolean;
  isPaused: boolean;
  allocationRules: PaperAllocationRules;
  createdAt: string;
  valueSparkline: number[];
  maxDrawdownPercent: number;
  volatilityScore: number;
}

export interface SignalComponentBreakdown {
  momentum: { score: number; roc20: number | null; smaCrossover: number | null };
  valuation: { score: number; trailingPe: number | null; medianPe: number | null };
  newsSentiment: { score: number; source: string };
  sectorTrend: {
    score: number;
    sector: string | null;
    etf: string | null;
    etfRoc20: number | null;
  };
  drawdownRisk: { score: number; weekHigh52: number | null; distanceFromHighPct: number };
  inputsAvailable: number;
  inputsMissing: string[];
}

export interface SignalSnapshotResponse {
  symbol: string;
  name: string;
  sector: string | null;
  snapshotDate: string;
  momentumScore: number;
  valuationScore: number;
  newsSentimentScore: number;
  sectorTrendScore: number;
  drawdownRiskScore: number;
  opportunityScore: number;
  riskScore: number;
  confidenceScore: number;
  componentBreakdown: SignalComponentBreakdown;
  marketRegime: string;
}

export interface PaperPortfolioSnapshot {
  snapshotDate: string;
  totalValue: number;
  cashBalance: number;
  investedValue: number;
  dailyReturnPercent: number;
  totalReturnPercent: number;
  maxDrawdownPercent: number;
  volatilityScore: number;
}

export interface PaperHolding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealisedGainLoss: number;
  unrealisedGainLossPercent: number;
  firstAcquiredAt: string;
}

export type PaperTradeAction = "buy" | "sell" | "rebalance" | "contribution";

export interface PaperTrade {
  id: string;
  symbol: string | null;
  action: PaperTradeAction;
  quantity: number;
  price: number;
  tradeValue: number;
  fees: number;
  appReasoning: string;
  opportunityScore: number | null;
  riskScore: number | null;
  confidenceScore: number | null;
  marketRegime: string | null;
  executedAt: string;
}
