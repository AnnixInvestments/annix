import { useQuery } from "@tanstack/react-query";
import {
  insightsApi,
  type PaperHolding,
  type PaperPortfolioSnapshot,
  type PaperPortfolioSummary,
  type PaperTrade,
} from "@/app/lib/api/insightsApi";
import { insightsKeys } from "../../keys";

export function usePaperPortfolios() {
  return useQuery<PaperPortfolioSummary[]>({
    queryKey: insightsKeys.paperPortfolios(),
    queryFn: () => insightsApi.paperPortfolios.list(),
    staleTime: 60 * 1000,
  });
}

export function usePaperPortfolio(slug: string | null) {
  return useQuery<PaperPortfolioSummary>({
    queryKey: insightsKeys.paperPortfolio(slug ?? ""),
    queryFn: () => {
      if (!slug) throw new Error("Slug required");
      return insightsApi.paperPortfolios.detail(slug);
    },
    enabled: slug !== null,
    staleTime: 60 * 1000,
  });
}

export function usePaperHoldings(slug: string | null) {
  return useQuery<PaperHolding[]>({
    queryKey: insightsKeys.paperHoldings(slug ?? ""),
    queryFn: () => {
      if (!slug) return Promise.resolve([]);
      return insightsApi.paperPortfolios.holdings(slug);
    },
    enabled: slug !== null,
    staleTime: 60 * 1000,
  });
}

export function usePaperTrades(slug: string | null, limit?: number) {
  return useQuery<PaperTrade[]>({
    queryKey: insightsKeys.paperTrades(slug ?? "", limit),
    queryFn: () => {
      if (!slug) return Promise.resolve([]);
      return insightsApi.paperPortfolios.trades(slug, limit);
    },
    enabled: slug !== null,
    staleTime: 60 * 1000,
  });
}

export function usePaperSnapshots(slug: string | null, limit?: number) {
  return useQuery<PaperPortfolioSnapshot[]>({
    queryKey: insightsKeys.paperSnapshots(slug ?? "", limit),
    queryFn: () => {
      if (!slug) return Promise.resolve([]);
      return insightsApi.paperPortfolios.snapshots(slug, limit);
    },
    enabled: slug !== null,
    staleTime: 60 * 1000,
  });
}
