import { useQuery } from "@tanstack/react-query";
import {
  type ConversionFunnelResponse,
  cvAssistantApiClient,
  type MarketTrendsResponse,
  type MatchAccuracyResponse,
  type TimeToFillResponse,
} from "@/app/lib/api/cvAssistantApi";
import { cvAssistantKeys } from "../../keys";

export function useCvConversionFunnel(dateFrom?: string | null, dateTo?: string | null) {
  return useQuery<ConversionFunnelResponse | null>({
    queryKey: cvAssistantKeys.analytics.funnel(dateFrom, dateTo),
    queryFn: () =>
      cvAssistantApiClient
        .analyticsConversionFunnel(dateFrom ?? undefined, dateTo ?? undefined)
        .catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvMatchAccuracy() {
  return useQuery<MatchAccuracyResponse | null>({
    queryKey: cvAssistantKeys.analytics.matchAccuracy(),
    queryFn: () => cvAssistantApiClient.analyticsMatchAccuracy().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvTimeToFill() {
  return useQuery<TimeToFillResponse | null>({
    queryKey: cvAssistantKeys.analytics.timeToFill(),
    queryFn: () => cvAssistantApiClient.analyticsTimeToFill().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvMarketTrends() {
  return useQuery<MarketTrendsResponse | null>({
    queryKey: cvAssistantKeys.analytics.marketTrends(),
    queryFn: () => cvAssistantApiClient.analyticsMarketTrends().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
}
