"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixRepApi,
  ColdCallSuggestion,
  OptimizedRoute,
  ScheduleGap,
} from "@/app/lib/api/annixRepApi";
import { annixRepKeys } from "../../keys";

export function useScheduleGaps(date: string, minGapMinutes?: number) {
  return useQuery<ScheduleGap[]>({
    queryKey: annixRepKeys.routes.gaps(date, minGapMinutes),
    queryFn: () => annixRepApi.routes.scheduleGaps(date, minGapMinutes),
    enabled: Boolean(date),
  });
}

export function useColdCallSuggestions(
  date: string,
  currentLat?: number,
  currentLng?: number,
  maxSuggestions?: number,
) {
  return useQuery<ColdCallSuggestion[]>({
    queryKey: annixRepKeys.routes.coldCallSuggestions(date, currentLat, currentLng),
    queryFn: () =>
      annixRepApi.routes.coldCallSuggestions(date, currentLat, currentLng, maxSuggestions),
    enabled: Boolean(date),
  });
}

export function usePlanDayRoute(
  date: string,
  includeColdCalls?: boolean,
  currentLat?: number,
  currentLng?: number,
) {
  return useQuery<OptimizedRoute>({
    queryKey: annixRepKeys.routes.planDay(date, includeColdCalls, currentLat, currentLng),
    queryFn: () => annixRepApi.routes.planDayRoute(date, includeColdCalls, currentLat, currentLng),
    enabled: Boolean(date),
  });
}

export function useOptimizeRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      startLat,
      startLng,
      stops,
      returnToStart,
    }: {
      startLat: number;
      startLng: number;
      stops: Array<{ id: number; type: "prospect" | "meeting" }>;
      returnToStart?: boolean;
    }) => annixRepApi.routes.optimizeRoute(startLat, startLng, stops, returnToStart),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.routes.all });
    },
  });
}
