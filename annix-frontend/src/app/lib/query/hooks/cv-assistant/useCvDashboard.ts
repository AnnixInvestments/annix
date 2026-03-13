import { useQuery } from "@tanstack/react-query";
import {
  type Candidate,
  cvAssistantApiClient,
  type DashboardStats,
  type MarketInsights,
} from "@/app/lib/api/cvAssistantApi";
import { cvAssistantKeys } from "../../keys";

export function useCvDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: cvAssistantKeys.dashboard.stats(),
    queryFn: () => cvAssistantApiClient.dashboardStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvTopCandidates() {
  return useQuery<Candidate[]>({
    queryKey: cvAssistantKeys.dashboard.topCandidates(),
    queryFn: () => cvAssistantApiClient.topCandidates(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCvMarketInsights() {
  return useQuery<MarketInsights | null>({
    queryKey: cvAssistantKeys.dashboard.marketInsights(),
    queryFn: () => cvAssistantApiClient.marketInsights().catch(() => null),
    staleTime: 10 * 60 * 1000,
  });
}
