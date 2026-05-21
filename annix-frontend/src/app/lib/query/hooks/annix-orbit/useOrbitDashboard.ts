import { useQuery } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type Candidate,
  type DashboardStats,
  type MarketInsights,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: annixOrbitKeys.dashboard.stats(),
    queryFn: () => annixOrbitApiClient.dashboardStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrbitTopCandidates() {
  return useQuery<Candidate[]>({
    queryKey: annixOrbitKeys.dashboard.topCandidates(),
    queryFn: () => annixOrbitApiClient.topCandidates(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrbitMarketInsights() {
  return useQuery<MarketInsights | null>({
    queryKey: annixOrbitKeys.dashboard.marketInsights(),
    queryFn: () => annixOrbitApiClient.marketInsights().catch(() => null),
    staleTime: 10 * 60 * 1000,
  });
}
