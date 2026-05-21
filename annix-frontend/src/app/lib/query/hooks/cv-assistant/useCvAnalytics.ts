import { useQuery } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type ConversionFunnelResponse,
  type MarketTrendsResponse,
  type MatchAccuracyResponse,
  type TimeToFillResponse,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useCvConversionFunnel(dateFrom?: string | null, dateTo?: string | null) {
  return useQuery<ConversionFunnelResponse | null>({
    queryKey: annixOrbitKeys.analytics.funnel(dateFrom, dateTo),
    queryFn: () =>
      annixOrbitApiClient
        .analyticsConversionFunnel(dateFrom ?? undefined, dateTo ?? undefined)
        .catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvMatchAccuracy() {
  return useQuery<MatchAccuracyResponse | null>({
    queryKey: annixOrbitKeys.analytics.matchAccuracy(),
    queryFn: () => annixOrbitApiClient.analyticsMatchAccuracy().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvTimeToFill() {
  return useQuery<TimeToFillResponse | null>({
    queryKey: annixOrbitKeys.analytics.timeToFill(),
    queryFn: () => annixOrbitApiClient.analyticsTimeToFill().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvMarketTrends() {
  return useQuery<MarketTrendsResponse | null>({
    queryKey: annixOrbitKeys.analytics.marketTrends(),
    queryFn: () => annixOrbitApiClient.analyticsMarketTrends().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
}
